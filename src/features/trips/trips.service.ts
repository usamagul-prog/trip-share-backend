import { Types } from 'mongoose';
import { Trip, ITrip } from './Trip.model';
import { Booking } from '../bookings/Booking.model';
import { notificationsService } from '../notifications/notifications.service';
import { tripCancelledEmail, reviewPromptEmail } from '../../lib/email';

export class TripNotFoundError extends Error {
  constructor() {
    super('Trip not found');
    this.name = 'TripNotFoundError';
  }
}

export class TripOwnershipError extends Error {
  constructor() {
    super('Not the trip driver');
    this.name = 'TripOwnershipError';
  }
}

export class TripStatusError extends Error {
  readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'TripStatusError';
    this.code = code;
  }
}

export const tripsService = {
  async createTrip(
    driverId: string,
    data: {
      origin: string;
      destination: string;
      departure_time: string;
      seats_total: number;
      fare: number;
      vehicle_desc?: string;
      waypoints?: string[];
    }
  ): Promise<ITrip> {
    const departureDate = new Date(data.departure_time);
    if (departureDate < new Date(Date.now() + 30 * 60 * 1000)) {
      throw new TripStatusError(
        'Departure must be at least 30 minutes in the future',
        'DEPARTURE_TOO_SOON'
      );
    }
    return Trip.create({
      driver: new Types.ObjectId(driverId),
      origin: data.origin,
      destination: data.destination,
      departure_time: departureDate,
      seats_total: data.seats_total,
      seats_available: data.seats_total,
      fare: data.fare,
      vehicle_desc: data.vehicle_desc,
      waypoints: data.waypoints,
      status: 'scheduled',
    });
  },

  async getMyTrips(
    driverId: string,
    status: 'scheduled' | 'completed' | 'cancelled' = 'scheduled',
    page = 1,
    limit = 20
  ): Promise<{ trips: ITrip[]; total: number; page: number; pages: number }> {
    const filter = { driver: new Types.ObjectId(driverId), status };
    const sortOrder = status === 'scheduled' ? 1 : -1;
    const skip = (page - 1) * limit;
    const [trips, total] = await Promise.all([
      Trip.find(filter).sort({ departure_time: sortOrder }).skip(skip).limit(limit),
      Trip.countDocuments(filter),
    ]);
    return { trips, total, page, pages: Math.ceil(total / limit) || 1 };
  },

  async getTripById(
    id: string,
    requesterId: string
  ): Promise<ITrip & { bookings?: unknown[] }> {
    const trip = await Trip.findById(id).populate('driver', 'name phone avatar_url');
    if (!trip) throw new TripNotFoundError();

    const populatedDriver = trip.driver as unknown as { _id: Types.ObjectId };
    const result = trip.toObject() as ITrip & { bookings?: unknown[] };

    if (populatedDriver._id.toString() === requesterId) {
      const bookings = await Booking.find({ trip: trip._id }).populate(
        'rider',
        'name phone'
      );
      result.bookings = bookings;
    }

    return result;
  },

  async updateTrip(
    tripId: string,
    driverId: string,
    data: {
      fare?: number;
      departure_time?: string;
      seats_total?: number;
      vehicle_desc?: string;
    }
  ): Promise<ITrip> {
    const trip = await Trip.findById(tripId);
    if (!trip) throw new TripNotFoundError();
    if (trip.driver.toString() !== driverId) throw new TripOwnershipError();

    const confirmedCount = await Booking.countDocuments({
      trip: trip._id,
      status: 'confirmed',
    });
    if (confirmedCount > 0) {
      throw new TripStatusError(
        'Cannot edit — riders already confirmed',
        'HAS_CONFIRMED_BOOKINGS'
      );
    }

    if (data.fare !== undefined) trip.fare = data.fare;
    if (data.vehicle_desc !== undefined) trip.vehicle_desc = data.vehicle_desc;
    if (data.departure_time !== undefined) {
      const departureDate = new Date(data.departure_time);
      if (departureDate < new Date(Date.now() + 30 * 60 * 1000)) {
        throw new TripStatusError(
          'Departure must be at least 30 minutes in the future',
          'DEPARTURE_TOO_SOON'
        );
      }
      trip.departure_time = departureDate;
    }
    if (data.seats_total !== undefined) {
      trip.seats_total = data.seats_total;
      trip.seats_available = data.seats_total - confirmedCount;
    }

    return trip.save();
  },

  async cancelTrip(tripId: string, driverId: string): Promise<ITrip> {
    const trip = await Trip.findById(tripId);
    if (!trip) throw new TripNotFoundError();
    if (trip.driver.toString() !== driverId) throw new TripOwnershipError();
    if (trip.status === 'completed' || trip.status === 'cancelled') {
      throw new TripStatusError(
        `Trip is already ${trip.status}`,
        'INVALID_STATUS_TRANSITION'
      );
    }

    trip.status = 'cancelled';
    await Booking.updateMany(
      { trip: trip._id, status: { $in: ['pending', 'confirmed'] } },
      { $set: { status: 'cancelled' } }
    );

    // Notify all affected riders that the trip was cancelled
    const affectedBookings = await Booking.find({
      trip: trip._id,
    }).select('rider').lean();
    const tripDate = new Date(trip.departure_time).toLocaleDateString('en-PK', { dateStyle: 'medium' });
    for (const b of affectedBookings) {
      void notificationsService.notifyUser((b.rider as { toString(): string }).toString(), {
        title: 'Trip Cancelled',
        body: `Your trip to ${trip.destination} has been cancelled by the driver`,
        type: 'trip_cancelled',
        link: '/bookings',
        emailSubject: 'Your Trip Has Been Cancelled',
        emailHtml: tripCancelledEmail(trip.destination, tripDate),
      }).catch(console.error);
    }

    return trip.save();
  },

  async completeTrip(tripId: string, driverId: string): Promise<ITrip> {
    const trip = await Trip.findById(tripId);
    if (!trip) throw new TripNotFoundError();
    if (trip.driver.toString() !== driverId) throw new TripOwnershipError();
    if (trip.status === 'completed' || trip.status === 'cancelled') {
      throw new TripStatusError(
        `Trip is already ${trip.status}`,
        'INVALID_STATUS_TRANSITION'
      );
    }
    if (trip.departure_time > new Date()) {
      throw new TripStatusError(
        'Cannot complete a future trip',
        'DEPARTURE_IN_FUTURE'
      );
    }

    trip.status = 'completed';

    // Notify confirmed riders and the driver to leave a review
    const completedBookings = await Booking.find({
      trip: trip._id,
      status: 'confirmed',
    }).select('rider _id').lean();
    for (const b of completedBookings) {
      const reviewLink = `/trips/${trip._id}/review?bookingId=${b._id}`;
      void notificationsService.notifyUser((b.rider as { toString(): string }).toString(), {
        title: 'How was your trip?',
        body: `Leave a review for your ${trip.destination} trip`,
        type: 'review_prompt',
        link: reviewLink,
        emailSubject: 'Leave a Review',
        emailHtml: reviewPromptEmail(trip.destination, reviewLink),
      }).catch(console.error);
      void notificationsService.notifyUser(driverId, {
        title: 'How was your trip?',
        body: `Leave a review for your ${trip.destination} trip`,
        type: 'review_prompt',
        link: reviewLink,
      }).catch(console.error);
    }

    return trip.save();
  },

  async searchTrips(from: string, to: string, date: string): Promise<ITrip[]> {
    const dayStart = new Date(`${date}T00:00:00+05:00`);
    const dayEnd = new Date(`${date}T23:59:59+05:00`);
    return Trip.find({
      origin: from,
      destination: to,
      status: 'scheduled',
      seats_available: { $gt: 0 },
      departure_time: { $gte: dayStart, $lte: dayEnd },
    })
      .populate('driver', 'name avatar_url')
      .sort({ departure_time: 1 });
  },
};
