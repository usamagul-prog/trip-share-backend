import { Types } from 'mongoose';
import { IBooking, Booking } from './Booking.model';
import { Trip, ITrip } from '../trips/Trip.model';

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
    return booking.save();
  },

  async createBooking(riderId: string, tripId: string, pickupPoint: string): Promise<IBooking> {
    const trip = await Trip.findById(tripId);
    if (!trip) throw new BookingStatusError('Trip not found', 'TRIP_NOT_FOUND');
    if (trip.status !== 'scheduled') {
      throw new BookingStatusError('Trip is no longer available', 'TRIP_NOT_SCHEDULED');
    }
    if (trip.seats_available <= 0) {
      throw new BookingStatusError('No seats available', 'NO_SEATS');
    }
    if (trip.driver.toString() === riderId) {
      throw new BookingStatusError('You cannot book your own trip', 'SELF_BOOKING');
    }
    return Booking.create({
      trip: new Types.ObjectId(tripId),
      rider: new Types.ObjectId(riderId),
      pickup_point: pickupPoint,
      status: 'pending',
    });
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
    return saved;
  },
};
