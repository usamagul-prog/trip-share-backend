jest.mock('../features/trips/Trip.model', () => ({
  Trip: { find: jest.fn() },
}));

import { Trip } from '../features/trips/Trip.model';
import { tripsService } from '../features/trips/trips.service';

const mockTrips = [
  { _id: 'trip1', origin: 'Islamabad', destination: 'Lahore', status: 'scheduled', seats_available: 2 },
];

function chainMock() {
  const sort = jest.fn().mockResolvedValue(mockTrips);
  const populate = jest.fn().mockReturnValue({ sort });
  return { populate };
}

beforeEach(() => jest.clearAllMocks());

describe('tripsService.searchTrips', () => {
  it('queries with correct filters and returns results', async () => {
    (Trip.find as jest.Mock).mockReturnValue(chainMock());
    const result = await tripsService.searchTrips('Islamabad', 'Lahore', '2024-06-15');
    const call = (Trip.find as jest.Mock).mock.calls[0][0];
    expect(call.origin).toEqual({ $regex: '^Islamabad$', $options: 'i' });
    expect(call.destination).toEqual({ $regex: '^Lahore$', $options: 'i' });
    expect(call.status).toBe('scheduled');
    expect(call.seats_available).toEqual({ $gt: 0 });
    expect(call.departure_time.$gte).toBeInstanceOf(Date);
    expect(call.departure_time.$lte).toBeInstanceOf(Date);
    expect(result).toEqual(mockTrips);
  });

  it('day window start is midnight PKT and end is 23:59:59 PKT', async () => {
    (Trip.find as jest.Mock).mockReturnValue(chainMock());
    await tripsService.searchTrips('Islamabad', 'Lahore', '2024-06-15');
    const { departure_time } = (Trip.find as jest.Mock).mock.calls[0][0];
    // 2024-06-15 00:00:00 PKT (UTC+5) = 2024-06-14T19:00:00Z
    expect(departure_time.$gte.toISOString()).toBe('2024-06-14T19:00:00.000Z');
    // 2024-06-15 23:59:59 PKT = 2024-06-15T18:59:59Z
    expect(departure_time.$lte.toISOString()).toBe('2024-06-15T18:59:59.000Z');
  });
});
