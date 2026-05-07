jest.mock('../features/bookings/Booking.model', () => ({
  Booking: {
    findById: jest.fn(),
  },
}));

jest.mock('../features/trips/Trip.model', () => ({
  Trip: {
    findByIdAndUpdate: jest.fn(),
  },
}));

import { Types } from 'mongoose';
import { Booking } from '../features/bookings/Booking.model';
import { Trip } from '../features/trips/Trip.model';
import {
  bookingsService,
  BookingNotFoundError,
  BookingOwnershipError,
  BookingStatusError,
} from '../features/bookings/bookings.service';

const driverId = new Types.ObjectId().toString();
const bookingId = new Types.ObjectId().toString();
const tripId = new Types.ObjectId().toString();
const saveMock = jest.fn();

const mockBooking = {
  _id: new Types.ObjectId(bookingId),
  status: 'pending' as const,
  trip: {
    _id: new Types.ObjectId(tripId),
    driver: { toString: () => driverId },
    seats_available: 2,
  },
  rider: { _id: new Types.ObjectId(), name: 'Rider', phone: '+923' },
  pickup_point: 'Sector F-10',
  save: saveMock,
};

beforeEach(() => jest.clearAllMocks());

describe('bookingsService.acceptBooking', () => {
  it('throws BookingNotFoundError when booking does not exist', async () => {
    (Booking.findById as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue(null),
    });
    const err = await bookingsService.acceptBooking(bookingId, driverId).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(BookingNotFoundError);
  });

  it('throws BookingOwnershipError when caller is not the trip driver', async () => {
    const booking = { ...mockBooking, trip: { ...mockBooking.trip, driver: { toString: () => 'other' } } };
    (Booking.findById as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue(booking),
    });
    const err = await bookingsService.acceptBooking(bookingId, driverId).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(BookingOwnershipError);
  });

  it('throws BOOKING_NOT_PENDING when booking is not pending', async () => {
    const booking = { ...mockBooking, status: 'confirmed' as const };
    (Booking.findById as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue(booking),
    });
    const err = await bookingsService.acceptBooking(bookingId, driverId).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(BookingStatusError);
    expect((err as BookingStatusError).code).toBe('BOOKING_NOT_PENDING');
  });

  it('throws NO_SEATS when trip has no seats available', async () => {
    const booking = {
      ...mockBooking,
      trip: { ...mockBooking.trip, seats_available: 0 },
    };
    (Booking.findById as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue(booking),
    });
    const err = await bookingsService.acceptBooking(bookingId, driverId).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(BookingStatusError);
    expect((err as BookingStatusError).code).toBe('NO_SEATS');
  });

  it('sets status to confirmed and decrements seats_available', async () => {
    const booking = { ...mockBooking, save: saveMock };
    (Booking.findById as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue(booking),
    });
    (Trip.findByIdAndUpdate as jest.Mock).mockResolvedValue({});
    saveMock.mockResolvedValue({ ...booking, status: 'confirmed' });

    await bookingsService.acceptBooking(bookingId, driverId);

    expect(booking.status).toBe('confirmed');
    expect(Trip.findByIdAndUpdate).toHaveBeenCalledWith(
      booking.trip._id,
      { $inc: { seats_available: -1 } }
    );
    expect(saveMock).toHaveBeenCalled();
  });
});

describe('bookingsService.rejectBooking', () => {
  it('throws BookingNotFoundError when booking does not exist', async () => {
    (Booking.findById as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue(null),
    });
    const err = await bookingsService.rejectBooking(bookingId, driverId).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(BookingNotFoundError);
  });

  it('throws BOOKING_NOT_PENDING when booking is not pending', async () => {
    const booking = { ...mockBooking, status: 'confirmed' as const };
    (Booking.findById as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue(booking),
    });
    const err = await bookingsService.rejectBooking(bookingId, driverId).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(BookingStatusError);
    expect((err as BookingStatusError).code).toBe('BOOKING_NOT_PENDING');
  });

  it('sets status to rejected', async () => {
    const booking = { ...mockBooking, save: saveMock };
    (Booking.findById as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue(booking),
    });
    saveMock.mockResolvedValue({ ...booking, status: 'rejected' });

    await bookingsService.rejectBooking(bookingId, driverId);

    expect(booking.status).toBe('rejected');
    expect(saveMock).toHaveBeenCalled();
  });
});
