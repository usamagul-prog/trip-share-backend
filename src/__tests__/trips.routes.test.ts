jest.mock('../features/auth/User.model', () => ({
  User: {
    findById: jest.fn().mockImplementation((id: string) => ({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(
          String(id) === 'rider1'
            ? { _id: 'rider1', name: 'Rider', role: 'rider', status: 'active' }
            : { _id: 'driver1', name: 'Ali', role: 'driver', status: 'active' }
        ),
      }),
    })),
  },
}));

jest.mock('../features/trips/trips.service', () => ({
  tripsService: {
    createTrip: jest.fn(),
    getMyTrips: jest.fn(),
    getTripById: jest.fn(),
    updateTrip: jest.fn(),
    cancelTrip: jest.fn(),
    completeTrip: jest.fn(),
  },
  TripNotFoundError: class TripNotFoundError extends Error {
    constructor() {
      super('Trip not found');
      this.name = 'TripNotFoundError';
    }
  },
  TripOwnershipError: class TripOwnershipError extends Error {
    constructor() {
      super('Not the trip driver');
      this.name = 'TripOwnershipError';
    }
  },
  TripStatusError: class TripStatusError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.name = 'TripStatusError';
      this.code = code;
    }
  },
}));

import request from 'supertest';
import app from '../app';
import { tripsService } from '../features/trips/trips.service';
import { signToken } from '../utils/jwt';

// Must be set before signToken is called at module level
process.env.JWT_SECRET = 'testsecret-32-chars-minimum-len';

const driverToken = signToken({ _id: 'driver1', role: 'driver', phone: '+921' });
const riderToken = signToken({ _id: 'rider1', role: 'rider', phone: '+922' });

const mockTrip = {
  _id: 'trip1',
  origin: 'Islamabad',
  destination: 'Lahore',
  departure_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  seats_total: 3,
  seats_available: 3,
  fare: 1500,
  status: 'scheduled',
  driver: { _id: 'driver1', name: 'Ali', phone: '+921' },
};

beforeEach(() => {
  process.env.JWT_SECRET = 'testsecret-32-chars-minimum-len';
  jest.clearAllMocks();
});

describe('POST /api/trips', () => {
  const validBody = {
    origin: 'Islamabad',
    destination: 'Lahore',
    departure_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    seats_total: 2,
    fare: 1500,
  };

  it('returns 401 with no token', async () => {
    const res = await request(app).post('/api/trips').send(validBody);
    expect(res.status).toBe(401);
  });

  it('returns 403 for rider role', async () => {
    const res = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${riderToken}`)
      .send(validBody);
    expect(res.status).toBe(403);
  });

  it('returns 400 when origin is missing', async () => {
    const res = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ ...validBody, origin: undefined });
    expect(res.status).toBe(400);
  });

  it('returns 400 when fare exceeds 50000', async () => {
    const res = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ ...validBody, fare: 60000 });
    expect(res.status).toBe(400);
  });

  it('returns 201 with trip on success', async () => {
    (tripsService.createTrip as jest.Mock).mockResolvedValue(mockTrip);
    const res = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${driverToken}`)
      .send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.trip.origin).toBe('Islamabad');
  });

  it('returns 400 when departure is too soon', async () => {
    const MockTripStatusError = (
      jest.requireMock('../features/trips/trips.service') as {
        TripStatusError: new (msg: string, code: string) => Error & { code: string };
      }
    ).TripStatusError;
    (tripsService.createTrip as jest.Mock).mockRejectedValue(
      new MockTripStatusError('Departure must be at least 30 minutes in the future', 'DEPARTURE_TOO_SOON')
    );
    const res = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${driverToken}`)
      .send(validBody);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/trips/my-trips', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/trips/my-trips');
    expect(res.status).toBe(401);
  });

  it('returns 403 for rider role', async () => {
    const res = await request(app)
      .get('/api/trips/my-trips')
      .set('Authorization', `Bearer ${riderToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 with paginated trips', async () => {
    (tripsService.getMyTrips as jest.Mock).mockResolvedValue({
      trips: [mockTrip],
      total: 1,
      page: 1,
      pages: 1,
    });
    const res = await request(app)
      .get('/api/trips/my-trips')
      .set('Authorization', `Bearer ${driverToken}`);
    expect(res.status).toBe(200);
    expect(res.body.trips).toHaveLength(1);
  });
});

describe('GET /api/trips/:id', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/trips/trip1');
    expect(res.status).toBe(401);
  });

  it('returns 404 when trip not found', async () => {
    const MockTripNotFoundError = (
      jest.requireMock('../features/trips/trips.service') as {
        TripNotFoundError: new () => Error;
      }
    ).TripNotFoundError;
    (tripsService.getTripById as jest.Mock).mockRejectedValue(new MockTripNotFoundError());
    const res = await request(app)
      .get('/api/trips/trip1')
      .set('Authorization', `Bearer ${driverToken}`);
    expect(res.status).toBe(404);
  });

  it('returns 200 with trip data', async () => {
    (tripsService.getTripById as jest.Mock).mockResolvedValue(mockTrip);
    const res = await request(app)
      .get('/api/trips/trip1')
      .set('Authorization', `Bearer ${driverToken}`);
    expect(res.status).toBe(200);
    expect(res.body.trip._id).toBe('trip1');
  });
});

describe('PATCH /api/trips/:id/cancel', () => {
  it('returns 403 for rider', async () => {
    const res = await request(app)
      .patch('/api/trips/trip1/cancel')
      .set('Authorization', `Bearer ${riderToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 403 when driver does not own trip', async () => {
    const MockTripOwnershipError = (
      jest.requireMock('../features/trips/trips.service') as {
        TripOwnershipError: new () => Error;
      }
    ).TripOwnershipError;
    (tripsService.cancelTrip as jest.Mock).mockRejectedValue(new MockTripOwnershipError());
    const res = await request(app)
      .patch('/api/trips/trip1/cancel')
      .set('Authorization', `Bearer ${driverToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 409 when trip is already cancelled', async () => {
    const MockTripStatusError = (
      jest.requireMock('../features/trips/trips.service') as {
        TripStatusError: new (msg: string, code: string) => Error & { code: string };
      }
    ).TripStatusError;
    (tripsService.cancelTrip as jest.Mock).mockRejectedValue(
      new MockTripStatusError('Trip is already cancelled', 'INVALID_STATUS_TRANSITION')
    );
    const res = await request(app)
      .patch('/api/trips/trip1/cancel')
      .set('Authorization', `Bearer ${driverToken}`);
    expect(res.status).toBe(409);
  });

  it('returns 200 on success', async () => {
    (tripsService.cancelTrip as jest.Mock).mockResolvedValue({ ...mockTrip, status: 'cancelled' });
    const res = await request(app)
      .patch('/api/trips/trip1/cancel')
      .set('Authorization', `Bearer ${driverToken}`);
    expect(res.status).toBe(200);
    expect(res.body.trip.status).toBe('cancelled');
  });
});

describe('PUT /api/trips/:id/complete', () => {
  it('returns 409 when departure is in the future', async () => {
    const MockTripStatusError = (
      jest.requireMock('../features/trips/trips.service') as {
        TripStatusError: new (msg: string, code: string) => Error & { code: string };
      }
    ).TripStatusError;
    (tripsService.completeTrip as jest.Mock).mockRejectedValue(
      new MockTripStatusError('Cannot complete a future trip', 'DEPARTURE_IN_FUTURE')
    );
    const res = await request(app)
      .put('/api/trips/trip1/complete')
      .set('Authorization', `Bearer ${driverToken}`);
    expect(res.status).toBe(409);
  });

  it('returns 200 on success', async () => {
    (tripsService.completeTrip as jest.Mock).mockResolvedValue({ ...mockTrip, status: 'completed' });
    const res = await request(app)
      .put('/api/trips/trip1/complete')
      .set('Authorization', `Bearer ${driverToken}`);
    expect(res.status).toBe(200);
    expect(res.body.trip.status).toBe('completed');
  });
});
