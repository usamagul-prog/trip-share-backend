import { Types } from 'mongoose';
import { IBooking, Booking } from './Booking.model';
import { Trip, ITrip } from '../trips/Trip.model';
import { TripNotFoundError } from '../trips/trips.service';
import { User } from '../auth/User.model';
import { notificationsService } from '../notifications/notifications.service';
import {
  bookingRequestEmail,
  bookingAcceptedEmail,
  bookingRejectedEmail,
  bookingCancelledByRiderEmail,
} from '../../lib/email';

export class BookingNotFoundError extends Error {
  constructor() {
    super('Booking not found');
    this.name = 'BookingNotFoundError';
  }
}

export class BookingOwnershipError extends Error {
  constructor() {
    super('Forbidden');
    this.name = 'BookingOwnershipError';
  }
}

export class BookingStatusError extends Error {
  readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'BookingStatusError';
    this.code = code;
  }
}

export const bookingsService = {
  async acceptBooking(bookingId: string, driverId: string): Promise<IBooking> {
    const booking = await Booking.findById(bookingId).populate('trip');
    if (!booking) throw new BookingNotFoundError();
    const trip = booking.trip as unknown as ITrip & { driver: { toString(): string }; seats_available: number };
    if (trip.driver.toString() !== driverId) throw new BookingOwnershipError();
    if (booking.status !== 'pending') {
      throw new BookingStatusError('Booking is not pending', 'BOOKING_NOT_PENDING');
    }
    if (trip.seats_available <= 0) {
      throw new BookingStatusError('No seats available', 'NO_SEATS');
    }
    booking.status = 'confirmed';
    const saved = await booking.save();
    await Trip.findByIdAndUpdate(trip._id, { $inc: { seats_available: -1 } });

    // Notify rider that booking was accepted
    const acceptedTrip = booking.trip as unknown as { destination: string; departure_time: Date; driver: { name?: string; phone?: string } };
    void notificationsService.notifyUser((booking.rider as { toString(): string }).toString(), {
      title: 'Booking Accepted',
      body: `Your trip to ${acceptedTrip.destination} is confirmed!`,
      type: 'booking_accepted',
      link: '/bookings',
      emailSubject: 'Your Booking is Confirmed',
      emailHtml: bookingAcceptedEmail(
        acceptedTrip.destination,
        new Date(acceptedTrip.departure_time).toLocaleDateString('en-PK', { dateStyle: 'medium' }),
        (acceptedTrip.driver as { name?: string })?.name ?? 'Your driver',
        (acceptedTrip.driver as { phone?: string })?.phone ?? ''
      ),
    }).catch(console.error);

    return saved;
  },

  async rejectBooking(bookingId: string, driverId: string): Promise<IBooking> {
    const booking = await Booking.findById(bookingId).populate('trip');
    if (!booking) throw new BookingNotFoundError();
    const trip = booking.trip as unknown as ITrip & { driver: { toString(): string } };
    if (trip.driver.toString() !== driverId) throw new BookingOwnershipError();
    if (booking.status !== 'pending') {
      throw new BookingStatusError('Booking is not pending', 'BOOKING_NOT_PENDING');
    }
    booking.status = 'rejected';
    const rejectedSaved = await booking.save();

    // Notify rider that booking was rejected
    const rejectedTrip = booking.trip as unknown as { destination: string };
    void notificationsService.notifyUser((booking.rider as { toString(): string }).toString(), {
      title: 'Booking Not Accepted',
      body: `Your booking request for ${rejectedTrip.destination} was not accepted`,
      type: 'booking_rejected',
      link: '/bookings',
      emailSubject: 'Booking Update',
      emailHtml: bookingRejectedEmail(rejectedTrip.destination),
    }).catch(console.error);

    return rejectedSaved;
  },

  async createBooking(riderId: string, tripId: string, pickupPoint: string): Promise<IBooking> {
    const trip = await Trip.findById(tripId);
    if (!trip) throw new TripNotFoundError();
    if (trip.status !== 'scheduled') {
      throw new BookingStatusError('Trip is no longer available', 'TRIP_NOT_SCHEDULED');
    }
    if (trip.seats_available <= 0) {
      throw new BookingStatusError('No seats available', 'NO_SEATS');
    }
    if (trip.driver.toString() === riderId) {
      throw new BookingStatusError('You cannot book your own trip', 'SELF_BOOKING');
    }
    const booking = await Booking.create({
      trip: new Types.ObjectId(tripId),
      rider: new Types.ObjectId(riderId),
      pickup_point: pickupPoint,
      status: 'pending',
    });

    // Notify driver of new booking request
    const rider = await User.findById(riderId).select('name').lean();
    const riderName = (rider as { name?: string } | null)?.name ?? 'A rider';
    void notificationsService.notifyUser((trip.driver as { toString(): string }).toString(), {
      title: 'New Booking Request',
      body: `${riderName} wants to join your trip to ${trip.destination}`,
      type: 'booking_request',
      link: `/trips/${tripId}`,
      emailSubject: 'New Booking Request',
      emailHtml: bookingRequestEmail(
        riderName,
        trip.destination,
        new Date(trip.departure_time).toLocaleDateString('en-PK', { dateStyle: 'medium' })
      ),
    }).catch(console.error);

    return booking;
  },

  async getMyBookings(riderId: string, tab: 'upcoming' | 'history' = 'upcoming'): Promise<IBooking[]> {
    const statuses = tab === 'upcoming'
      ? ['pending', 'confirmed']
      : ['completed', 'cancelled', 'rejected'];

    const bookings = await Booking.find({
      rider: new Types.ObjectId(riderId),
      status: { $in: statuses as IBooking['status'][] },
    }).populate({
      path: 'trip',
      select: 'origin destination departure_time fare',
      populate: { path: 'driver', select: 'name' },
    });

    type WithTrip = IBooking & { trip: { departure_time: Date }; updatedAt: Date };

    if (tab === 'upcoming') {
      return (bookings as unknown as WithTrip[]).sort(
        (a, b) => new Date(a.trip.departure_time).getTime() - new Date(b.trip.departure_time).getTime()
      );
    }
    return (bookings as unknown as WithTrip[]).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  },

  async cancelBooking(bookingId: string, riderId: string): Promise<IBooking> {
    const booking = await Booking.findById(bookingId).populate('trip');
    if (!booking) throw new BookingNotFoundError();
    if (booking.rider.toString() !== riderId) throw new BookingOwnershipError();
    if (!['pending', 'confirmed'].includes(booking.status)) {
      throw new BookingStatusError('Booking cannot be cancelled', 'INVALID_STATUS');
    }
    const trip = booking.trip as unknown as ITrip & { _id: Types.ObjectId };
    if (trip.departure_time <= new Date()) {
      throw new BookingStatusError('Cannot cancel — trip has already departed', 'TRIP_DEPARTED');
    }
    const wasConfirmed = booking.status === 'confirmed';
    booking.status = 'cancelled';
    const saved = await booking.save();
    if (wasConfirmed) {
      await Trip.findByIdAndUpdate(trip._id, { $inc: { seats_available: 1 } });
    }

    // Notify driver that booking was cancelled by rider
    const cancelledTrip = booking.trip as unknown as { destination: string; driver: { toString(): string } };
    const cancellingRider = await User.findById(riderId).select('name').lean();
    void notificationsService.notifyUser(cancelledTrip.driver.toString(), {
      title: 'Booking Cancelled',
      body: `${(cancellingRider as { name?: string } | null)?.name ?? 'A rider'} cancelled their booking for ${cancelledTrip.destination}`,
      type: 'booking_cancelled',
      link: `/trips/${(booking.trip as { toString(): string }).toString()}`,
      emailSubject: 'Booking Cancellation',
      emailHtml: bookingCancelledByRiderEmail(
        (cancellingRider as { name?: string } | null)?.name ?? 'A rider',
        cancelledTrip.destination
      ),
    }).catch(console.error);

    return saved;
  },
};
