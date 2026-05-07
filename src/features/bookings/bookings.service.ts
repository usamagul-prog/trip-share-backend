import { IBooking } from './Booking.model';
import { Booking } from './Booking.model';
import { Trip, ITrip } from '../trips/Trip.model';

export class BookingNotFoundError extends Error {
  constructor() {
    super('Booking not found');
    this.name = 'BookingNotFoundError';
  }
}

export class BookingOwnershipError extends Error {
  constructor() {
    super('Not the trip driver');
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
    await Trip.findByIdAndUpdate(trip._id, { $inc: { seats_available: -1 } });
    return booking.save();
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
};
