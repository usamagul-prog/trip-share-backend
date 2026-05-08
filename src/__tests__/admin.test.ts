jest.mock('../features/auth/User.model', () => ({
  User: {
    find: jest.fn(),
    findById: jest.fn(),
    countDocuments: jest.fn(),
  },
}));
jest.mock('../features/trips/Trip.model', () => ({
  Trip: { find: jest.fn(), findById: jest.fn(), countDocuments: jest.fn() },
}));
jest.mock('../features/bookings/Booking.model', () => ({
  Booking: { find: jest.fn(), countDocuments: jest.fn() },
}));

import { Types } from 'mongoose';
import { User } from '../features/auth/User.model';
import { Trip } from '../features/trips/Trip.model';
import { Booking } from '../features/bookings/Booking.model';
import { adminService, AdminLoginError, SuspendAdminError } from '../features/admin/admin.service';

beforeEach(() => jest.clearAllMocks());

// ---- loginAdmin ----
describe('adminService.loginAdmin', () => {
  beforeEach(() => {
    process.env.ADMIN_USERNAME = 'admin';
    process.env.ADMIN_PASSWORD = 'secret';
    process.env.JWT_SECRET = 'testsecret';
  });

  it('returns token for valid credentials', () => {
    const token = adminService.loginAdmin('admin', 'secret');
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('throws AdminLoginError for invalid credentials', () => {
    expect(() => adminService.loginAdmin('admin', 'wrong')).toThrow(AdminLoginError);
  });
});

// ---- listUsers ----
describe('adminService.listUsers', () => {
  function mockFind(docs: unknown[]) {
    const lean = jest.fn().mockResolvedValue(docs);
    const limit = jest.fn().mockReturnValue({ lean });
    const skip = jest.fn().mockReturnValue({ limit });
    const sort = jest.fn().mockReturnValue({ skip });
    const select = jest.fn().mockReturnValue({ sort });
    return { select };
  }

  it('returns paginated users', async () => {
    const users = [{ _id: new Types.ObjectId(), name: 'Alice', role: 'rider', status: 'active' }];
    (User.find as jest.Mock).mockReturnValue(mockFind(users));
    (User.countDocuments as jest.Mock).mockResolvedValue(1);
    const result = await adminService.listUsers(1, 20);
    expect(result.users).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.pages).toBe(1);
  });

  it('applies search filter', async () => {
    (User.find as jest.Mock).mockReturnValue(mockFind([]));
    (User.countDocuments as jest.Mock).mockResolvedValue(0);
    await adminService.listUsers(1, 20, 'alice');
    expect(User.find).toHaveBeenCalledWith(
      expect.objectContaining({ $or: expect.any(Array) })
    );
  });
});

// ---- suspendUser ----
describe('adminService.suspendUser', () => {
  it('suspends an active user', async () => {
    const saveMock = jest.fn().mockResolvedValue(true);
    (User.findById as jest.Mock).mockResolvedValue({ role: 'rider', status: 'active', save: saveMock });
    await adminService.suspendUser(new Types.ObjectId().toString(), 'Abuse');
    expect(saveMock).toHaveBeenCalled();
  });

  it('throws SuspendAdminError when target is admin', async () => {
    (User.findById as jest.Mock).mockResolvedValue({ role: 'admin', status: 'active', save: jest.fn() });
    await expect(adminService.suspendUser(new Types.ObjectId().toString(), 'test')).rejects.toThrow(SuspendAdminError);
  });

  it('returns null when user not found', async () => {
    (User.findById as jest.Mock).mockResolvedValue(null);
    const result = await adminService.suspendUser(new Types.ObjectId().toString(), 'test');
    expect(result).toBeNull();
  });
});

// ---- unsuspendUser ----
describe('adminService.unsuspendUser', () => {
  it('unsuspends a suspended user', async () => {
    const saveMock = jest.fn().mockResolvedValue(true);
    (User.findById as jest.Mock).mockResolvedValue({
      role: 'rider', status: 'suspended', suspension_reason: 'Abuse', suspended_at: new Date(), save: saveMock,
    });
    await adminService.unsuspendUser(new Types.ObjectId().toString());
    expect(saveMock).toHaveBeenCalled();
  });

  it('returns null when user not found', async () => {
    (User.findById as jest.Mock).mockResolvedValue(null);
    const result = await adminService.unsuspendUser(new Types.ObjectId().toString());
    expect(result).toBeNull();
  });
});

// ---- listTrips ----
describe('adminService.listTrips', () => {
  function mockFind(docs: unknown[]) {
    const lean = jest.fn().mockResolvedValue(docs);
    const limit = jest.fn().mockReturnValue({ lean });
    const skip = jest.fn().mockReturnValue({ limit });
    const sort = jest.fn().mockReturnValue({ skip });
    const populate = jest.fn().mockReturnValue({ sort });
    return { populate };
  }

  it('returns paginated trips with bookingCount', async () => {
    const tripId = new Types.ObjectId();
    const trips = [{ _id: tripId, origin: 'Lahore', destination: 'Islamabad', status: 'scheduled' }];
    (Trip.find as jest.Mock).mockReturnValue(mockFind(trips));
    (Trip.countDocuments as jest.Mock).mockResolvedValue(1);
    (Booking.countDocuments as jest.Mock).mockResolvedValue(3);
    const result = await adminService.listTrips({ page: 1, limit: 20 });
    expect(result.trips[0]).toMatchObject({ bookingCount: 3 });
    expect(result.total).toBe(1);
  });
});

// ---- getTripStats ----
describe('adminService.getTripStats', () => {
  it('returns today/thisWeek/thisMonth counts', async () => {
    (Trip.countDocuments as jest.Mock).mockResolvedValue(5);
    const stats = await adminService.getTripStats();
    expect(stats).toEqual({ today: 5, thisWeek: 5, thisMonth: 5 });
    expect(Trip.countDocuments).toHaveBeenCalledTimes(3);
  });
});

// ---- getTrip ----
describe('adminService.getTrip', () => {
  it('returns trip with bookings', async () => {
    const tripId = new Types.ObjectId().toString();
    (Trip.findById as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: tripId, origin: 'Lahore' }) });
    const leanMock = jest.fn().mockResolvedValue([{ _id: new Types.ObjectId(), status: 'confirmed' }]);
    const populateMock = jest.fn().mockReturnValue({ lean: leanMock });
    (Booking.find as jest.Mock).mockReturnValue({ populate: populateMock });
    const result = await adminService.getTrip(tripId);
    expect(result).toMatchObject({ origin: 'Lahore', bookings: expect.any(Array) });
  });

  it('returns null when trip not found', async () => {
    (Trip.findById as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    const result = await adminService.getTrip(new Types.ObjectId().toString());
    expect(result).toBeNull();
  });
});
