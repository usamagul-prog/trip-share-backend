jest.mock('../features/trips/Trip.model', () => ({
  Trip: {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

jest.mock('../features/bookings/Booking.model', () => ({
  Booking: {
    find: jest.fn(),
    countDocuments: jest.fn(),
    updateMany: jest.fn(),
  },
}));

jest.mock('../features/notifications/notifications.service', () => ({
  notificationsService: { notifyUser: jest.fn().mockResolvedValue(undefined) },
}));

import { Types } from 'mongoose';
import { Trip } from '../features/trips/Trip.model';
import { Booking } from '../features/bookings/Booking.model';
import {
  tripsService,
  TripNotFoundError,
  TripOwnershipError,
  TripStatusError,
} from '../features/trips/trips.service';

const driverId = new Types.ObjectId().toString();
const tripId = new Types.ObjectId().toString();
const saveMock = jest.fn();

const mockTrip = {
  _id: new Types.ObjectId(tripId),
  driver: { toString: () => driverId },
  origin: 'Islamabad',
  destination: 'Lahore',
  departure_time: new Date(Date.now() + 60 * 60 * 1000),
  seats_total: 3,
  seats_available: 3,
  fare: 1500,
  status: 'scheduled' as const,
  vehicle_desc: undefined as string | undefined,
  toObject: jest.fn(),
  save: saveMock,
};

beforeEach(() => jest.clearAllMocks());

describe('tripsService.createTrip', () => {
  it('creates trip with seats_available equal to seats_total', async () => {
    (Trip.create as jest.Mock).mockResolvedValue(mockTrip);
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const trip = await tripsService.createTrip(driverId, {
      origin: 'Islamabad',
      destination: 'Lahore',
      departure_time: future,
      seats_total: 3,
      fare: 1500,
    });

    expect(Trip.create).toHaveBeenCalledWith(
      expect.objectContaining({ seats_available: 3, status: 'scheduled' })
    );
    expect(trip).toBeDefined();
  });

  it('throws TripStatusError DEPARTURE_TOO_SOON when departure is < 30 min away', async () => {
    const soon = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const err = await tripsService
      .createTrip(driverId, { origin: 'Islamabad', destination: 'Lahore', departure_time: soon, seats_total: 2, fare: 1000 })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(TripStatusError);
    expect((err as TripStatusError).code).toBe('DEPARTURE_TOO_SOON');
  });
});

describe('tripsService.getMyTrips', () => {
  it('returns paginated trips for driver', async () => {
    const mockQuery = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([mockTrip]),
    };
    (Trip.find as jest.Mock).mockReturnValue(mockQuery);
    (Trip.countDocuments as jest.Mock).mockResolvedValue(1);

    const result = await tripsService.getMyTrips(driverId, 'scheduled', 1, 20);

    expect(result.trips).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.pages).toBe(1);
    expect(mockQuery.sort).toHaveBeenCalledWith({ departure_time: 1 });
  });

  it('sorts descending for completed trips', async () => {
    const mockQuery = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    };
    (Trip.find as jest.Mock).mockReturnValue(mockQuery);
    (Trip.countDocuments as jest.Mock).mockResolvedValue(0);

    await tripsService.getMyTrips(driverId, 'completed', 1, 20);

    expect(mockQuery.sort).toHaveBeenCalledWith({ departure_time: -1 });
  });
});

describe('tripsService.getTripById', () => {
  it('throws TripNotFoundError when trip does not exist', async () => {
    (Trip.findById as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue(null),
    });

    const err = await tripsService.getTripById(tripId, driverId).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(TripNotFoundError);
  });

  it('includes bookings when requester is the trip driver', async () => {
    const driverObjId = new Types.ObjectId(driverId);
    const populated = {
      ...mockTrip,
      driver: { _id: driverObjId, name: 'Ali', phone: '+921' },
      toObject: jest.fn().mockReturnValue({ ...mockTrip }),
    };
    (Trip.findById as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue(populated),
    });
    (Booking.find as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue([{ _id: 'b1', status: 'pending' }]),
    });

    const result = await tripsService.getTripById(tripId, driverId);
    expect(result.bookings).toHaveLength(1);
  });

  it('does not include bookings when requester is not the driver', async () => {
    const otherDriverId = new Types.ObjectId().toString();
    const driverObjId = new Types.ObjectId(otherDriverId);
    const populated = {
      ...mockTrip,
      driver: { _id: driverObjId, name: 'Other', phone: '+922' },
      toObject: jest.fn().mockReturnValue({ ...mockTrip }),
    };
    (Trip.findById as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue(populated),
    });

    const result = await tripsService.getTripById(tripId, driverId);
    expect(result.bookings).toBeUndefined();
    expect(Booking.find).not.toHaveBeenCalled();
  });
});

describe('tripsService.updateTrip', () => {
  it('throws TripNotFoundError when trip does not exist', async () => {
    (Trip.findById as jest.Mock).mockResolvedValue(null);
    const err = await tripsService
      .updateTrip(tripId, driverId, { fare: 2000 })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(TripNotFoundError);
  });

  it('throws TripOwnershipError when caller is not the driver', async () => {
    (Trip.findById as jest.Mock).mockResolvedValue({ ...mockTrip, driver: { toString: () => 'other-id' } });
    const err = await tripsService
      .updateTrip(tripId, driverId, { fare: 2000 })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(TripOwnershipError);
  });

  it('throws HAS_CONFIRMED_BOOKINGS when confirmed bookings exist', async () => {
    (Trip.findById as jest.Mock).mockResolvedValue({ ...mockTrip, driver: { toString: () => driverId } });
    (Booking.countDocuments as jest.Mock).mockResolvedValue(1);
    const err = await tripsService
      .updateTrip(tripId, driverId, { fare: 2000 })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(TripStatusError);
    expect((err as TripStatusError).code).toBe('HAS_CONFIRMED_BOOKINGS');
  });

  it('updates fare and returns saved trip', async () => {
    const trip = { ...mockTrip, driver: { toString: () => driverId }, save: saveMock };
    (Trip.findById as jest.Mock).mockResolvedValue(trip);
    (Booking.countDocuments as jest.Mock).mockResolvedValue(0);
    saveMock.mockResolvedValue({ ...trip, fare: 2000 });

    await tripsService.updateTrip(tripId, driverId, { fare: 2000 });
    expect(trip.fare).toBe(2000);
    expect(saveMock).toHaveBeenCalled();
  });
});

describe('tripsService.cancelTrip', () => {
  it('sets status to cancelled and cascades to bookings', async () => {
    const trip = { ...mockTrip, driver: { toString: () => driverId }, save: saveMock };
    (Trip.findById as jest.Mock).mockResolvedValue(trip);
    (Booking.updateMany as jest.Mock).mockResolvedValue({});
    (Booking.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    });
    saveMock.mockResolvedValue({ ...trip, status: 'cancelled' });

    await tripsService.cancelTrip(tripId, driverId);

    expect(Booking.updateMany).toHaveBeenCalledWith(
      { trip: trip._id, status: { $in: ['pending', 'confirmed'] } },
      { $set: { status: 'cancelled' } }
    );
    expect(saveMock).toHaveBeenCalled();
  });

  it('throws INVALID_STATUS_TRANSITION when trip is already cancelled', async () => {
    (Trip.findById as jest.Mock).mockResolvedValue({
      ...mockTrip,
      status: 'cancelled',
      driver: { toString: () => driverId },
    });
    const err = await tripsService.cancelTrip(tripId, driverId).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(TripStatusError);
    expect((err as TripStatusError).code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('throws TripOwnershipError when caller is not the driver', async () => {
    (Trip.findById as jest.Mock).mockResolvedValue({
      ...mockTrip,
      driver: { toString: () => 'someone-else' },
    });
    const err = await tripsService.cancelTrip(tripId, driverId).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(TripOwnershipError);
  });
});

describe('tripsService.completeTrip', () => {
  it('throws DEPARTURE_IN_FUTURE when departure has not passed', async () => {
    const trip = { ...mockTrip, driver: { toString: () => driverId } };
    (Trip.findById as jest.Mock).mockResolvedValue(trip);

    const err = await tripsService.completeTrip(tripId, driverId).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(TripStatusError);
    expect((err as TripStatusError).code).toBe('DEPARTURE_IN_FUTURE');
  });

  it('sets status to completed for a past trip', async () => {
    const trip = {
      ...mockTrip,
      departure_time: new Date(Date.now() - 60 * 60 * 1000),
      driver: { toString: () => driverId },
      save: saveMock,
    };
    (Trip.findById as jest.Mock).mockResolvedValue(trip);
    (Booking.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    });
    saveMock.mockResolvedValue({ ...trip, status: 'completed' });

    await tripsService.completeTrip(tripId, driverId);
    expect(trip.status).toBe('completed');
    expect(saveMock).toHaveBeenCalled();
  });
});
