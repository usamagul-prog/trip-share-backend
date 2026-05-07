jest.mock('../features/bookings/Booking.model', () => ({
  Booking: {
    findById: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('../features/trips/Trip.model', () => ({
  Trip: {
    findById: jest.fn(),
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

const riderId = new Types.ObjectId().toString();
const driverId = new Types.ObjectId().toString();
const tripId = new Types.ObjectId().toString();
const bookingId = new Types.ObjectId().toString();
const saveMock = jest.fn();

const mockTrip = {
  _id: new Types.ObjectId(tripId),
  driver: { toString: () => driverId },
  status: 'scheduled' as const,
  seats_available: 2,
  departure_time: new Date(Date.now() + 2 * 60 * 60 * 1000),
};

const mockBooking = {
  _id: new Types.ObjectId(bookingId),
  trip: mockTrip,
  rider: { toString: () => riderId },
  pickup_point: 'Sector F-10',
  status: 'pending' as const,
  updatedAt: new Date(),
  save: saveMock,
};

beforeEach(() => jest.clearAllMocks());

describe('bookingsService.createBooking', () => {
  it('throws BookingStatusError TRIP_NOT_FOUND when trip does not exist', async () => {
    (Trip.findById as jest.Mock).mockResolvedValue(null);
    const err = await bookingsService.createBooking(riderId, tripId, 'F-10').catch((e) => e);
    expect(err).toBeInstanceOf(BookingStatusError);
    expect((err as BookingStatusError).code).toBe('TRIP_NOT_FOUND');
  });

  it('throws BookingStatusError TRIP_NOT_SCHEDULED when trip is not scheduled', async () => {
    (Trip.findById as jest.Mock).mockResolvedValue({ ...mockTrip, status: 'completed' });
    const err = await bookingsService.createBooking(riderId, tripId, 'F-10').catch((e) => e);
    expect(err).toBeInstanceOf(BookingStatusError);
    expect((err as BookingStatusError).code).toBe('TRIP_NOT_SCHEDULED');
  });

  it('throws BookingStatusError NO_SEATS when no seats available', async () => {
    (Trip.findById as jest.Mock).mockResolvedValue({ ...mockTrip, seats_available: 0 });
    const err = await bookingsService.createBooking(riderId, tripId, 'F-10').catch((e) => e);
    expect(err).toBeInstanceOf(BookingStatusError);
    expect((err as BookingStatusError).code).toBe('NO_SEATS');
  });

  it('throws BookingStatusError SELF_BOOKING when rider is the driver', async () => {
    (Trip.findById as jest.Mock).mockResolvedValue({ ...mockTrip, driver: { toString: () => riderId } });
    const err = await bookingsService.createBooking(riderId, tripId, 'F-10').catch((e) => e);
    expect(err).toBeInstanceOf(BookingStatusError);
    expect((err as BookingStatusError).code).toBe('SELF_BOOKING');
  });

  it('creates booking with pending status on valid input', async () => {
    (Trip.findById as jest.Mock).mockResolvedValue(mockTrip);
    const created = { ...mockBooking, status: 'pending' };
    (Booking.create as jest.Mock).mockResolvedValue(created);
    const result = await bookingsService.createBooking(riderId, tripId, 'Sector F-10');
    expect(result.status).toBe('pending');
    expect(Booking.create).toHaveBeenCalledWith(
      expect.objectContaining({ pickup_point: 'Sector F-10', status: 'pending' })
    );
  });
});

describe('bookingsService.cancelBooking', () => {
  it('throws BookingNotFoundError when booking does not exist', async () => {
    (Booking.findById as jest.Mock).mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
    const err = await bookingsService.cancelBooking(bookingId, riderId).catch((e) => e);
    expect(err).toBeInstanceOf(BookingNotFoundError);
  });

  it('throws BookingOwnershipError when caller is not the booking rider', async () => {
    const b = { ...mockBooking, rider: { toString: () => 'other' } };
    (Booking.findById as jest.Mock).mockReturnValue({ populate: jest.fn().mockResolvedValue(b) });
    const err = await bookingsService.cancelBooking(bookingId, riderId).catch((e) => e);
    expect(err).toBeInstanceOf(BookingOwnershipError);
  });

  it('throws BookingStatusError INVALID_STATUS when booking is already cancelled', async () => {
    const b = { ...mockBooking, status: 'cancelled' as const, save: saveMock };
    (Booking.findById as jest.Mock).mockReturnValue({ populate: jest.fn().mockResolvedValue(b) });
    const err = await bookingsService.cancelBooking(bookingId, riderId).catch((e) => e);
    expect(err).toBeInstanceOf(BookingStatusError);
    expect((err as BookingStatusError).code).toBe('INVALID_STATUS');
  });

  it('throws BookingStatusError TRIP_DEPARTED when trip has already departed', async () => {
    const pastTrip = { ...mockTrip, departure_time: new Date(Date.now() - 60 * 60 * 1000) };
    const b = { ...mockBooking, trip: pastTrip, save: saveMock };
    (Booking.findById as jest.Mock).mockReturnValue({ populate: jest.fn().mockResolvedValue(b) });
    const err = await bookingsService.cancelBooking(bookingId, riderId).catch((e) => e);
    expect(err).toBeInstanceOf(BookingStatusError);
    expect((err as BookingStatusError).code).toBe('TRIP_DEPARTED');
  });

  it('cancels a pending booking without restoring seats', async () => {
    saveMock.mockResolvedValue({ ...mockBooking, status: 'cancelled' });
    (Booking.findById as jest.Mock).mockReturnValue({ populate: jest.fn().mockResolvedValue(mockBooking) });
    await bookingsService.cancelBooking(bookingId, riderId);
    expect(saveMock).toHaveBeenCalled();
    expect(Trip.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('cancels a confirmed booking and restores one seat', async () => {
    const confirmed = { ...mockBooking, status: 'confirmed' as const, save: saveMock };
    saveMock.mockResolvedValue({ ...confirmed, status: 'cancelled' });
    (Booking.findById as jest.Mock).mockReturnValue({ populate: jest.fn().mockResolvedValue(confirmed) });
    (Trip.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);
    await bookingsService.cancelBooking(bookingId, riderId);
    expect(Trip.findByIdAndUpdate).toHaveBeenCalledWith(
      mockTrip._id,
      { $inc: { seats_available: 1 } }
    );
  });
});

describe('bookingsService.getMyBookings', () => {
  it('queries pending+confirmed for upcoming tab and sorts by departure_time asc', async () => {
    const later = new Date(Date.now() + 4 * 60 * 60 * 1000);
    const sooner = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const bookings = [
      { _id: 'b1', trip: { departure_time: later }, status: 'confirmed', updatedAt: new Date() },
      { _id: 'b2', trip: { departure_time: sooner }, status: 'pending', updatedAt: new Date() },
    ];
    (Booking.find as jest.Mock).mockReturnValue({ populate: jest.fn().mockResolvedValue(bookings) });
    const result = await bookingsService.getMyBookings(riderId, 'upcoming');
    expect(Booking.find).toHaveBeenCalledWith(
      expect.objectContaining({ status: { $in: ['pending', 'confirmed'] } })
    );
    expect(result[0]._id).toBe('b2');
    expect(result[1]._id).toBe('b1');
  });

  it('queries completed+cancelled+rejected for history tab and sorts by updatedAt desc', async () => {
    const older = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const newer = new Date(Date.now() - 1 * 60 * 60 * 1000);
    const bookings = [
      { _id: 'b3', trip: { departure_time: older }, status: 'completed', updatedAt: older },
      { _id: 'b4', trip: { departure_time: newer }, status: 'cancelled', updatedAt: newer },
    ];
    (Booking.find as jest.Mock).mockReturnValue({ populate: jest.fn().mockResolvedValue(bookings) });
    const result = await bookingsService.getMyBookings(riderId, 'history');
    expect(Booking.find).toHaveBeenCalledWith(
      expect.objectContaining({ status: { $in: ['completed', 'cancelled', 'rejected'] } })
    );
    expect(result[0]._id).toBe('b4');
    expect(result[1]._id).toBe('b3');
  });
});
