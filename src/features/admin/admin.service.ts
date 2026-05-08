import { User } from '../auth/User.model';
import { Trip } from '../trips/Trip.model';
import { Booking } from '../bookings/Booking.model';
import { Report } from '../chat/Report.model';
import { signAdminToken } from '../../utils/jwt';

export class AdminLoginError extends Error {
  constructor() {
    super('Invalid credentials');
    this.name = 'AdminLoginError';
  }
}

export class SuspendAdminError extends Error {
  constructor() {
    super('Cannot suspend admin accounts');
    this.name = 'SuspendAdminError';
  }
}

export const adminService = {
  loginAdmin(username: string, password: string): string {
    if (
      username !== process.env.ADMIN_USERNAME ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      throw new AdminLoginError();
    }
    return signAdminToken();
  },

  async listUsers(page: number, limit: number, search?: string) {
    const filter = search
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
          ],
        }
      : {};
    const [users, total] = await Promise.all([
      User.find(filter)
        .select('_id name phone email role status suspension_reason avg_rating review_count createdAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);
    return { users, total, page, pages: Math.ceil(total / limit) };
  },

  async exportUsers(): Promise<string> {
    const users = await User.find({})
      .select('name phone email role status avg_rating review_count createdAt')
      .lean<{ name: string; phone: string; email?: string; role: string; status: string; avg_rating: number; review_count: number; createdAt: Date }[]>();
    const header = 'name,phone,email,role,status,avg_rating,review_count,createdAt\n';
    const rows = users
      .map((u) =>
        [u.name, u.phone, u.email ?? '', u.role, u.status, u.avg_rating, u.review_count, u.createdAt.toISOString()].join(',')
      )
      .join('\n');
    return header + rows;
  },

  async getUser(userId: string) {
    const user = await User.findById(userId).lean();
    if (!user) return null;
    const [trips, bookings] = await Promise.all([
      Trip.find({ driver: userId }).sort({ createdAt: -1 }).limit(10).lean(),
      Booking.find({ rider: userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate({ path: 'trip', select: 'origin destination departure_time fare' })
        .lean(),
    ]);
    return { ...user, trips, bookings };
  },

  async suspendUser(userId: string, reason: string) {
    const user = await User.findById(userId);
    if (!user) return null;
    if (user.role === 'admin') throw new SuspendAdminError();
    user.status = 'suspended';
    user.suspension_reason = reason;
    user.suspended_at = new Date();
    return user.save();
  },

  async unsuspendUser(userId: string) {
    const user = await User.findById(userId);
    if (!user) return null;
    user.status = 'active';
    user.suspension_reason = undefined;
    user.suspended_at = undefined;
    return user.save();
  },

  async listTrips(filters: {
    page: number;
    limit: number;
    status?: string;
    origin?: string;
    destination?: string;
    from?: string;
    to?: string;
  }) {
    const { page, limit, status, origin, destination, from, to } = filters;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (origin) filter.origin = { $regex: origin, $options: 'i' };
    if (destination) filter.destination = { $regex: destination, $options: 'i' };
    if (from || to) {
      const dateFilter: Record<string, Date> = {};
      if (from) dateFilter['$gte'] = new Date(from);
      if (to) dateFilter['$lte'] = new Date(to);
      filter.createdAt = dateFilter;
    }
    const [trips, total] = await Promise.all([
      Trip.find(filter)
        .populate('driver', 'name phone')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Trip.countDocuments(filter),
    ]);
    const tripsWithCount = await Promise.all(
      trips.map(async (trip) => ({
        ...trip,
        bookingCount: await Booking.countDocuments({ trip: trip._id }),
      }))
    );
    return { trips: tripsWithCount, total, page, pages: Math.ceil(total / limit) };
  },

  async getTripStats() {
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const weekStart = new Date(todayStart);
    weekStart.setUTCDate(todayStart.getUTCDate() - ((todayStart.getUTCDay() + 6) % 7));
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const [today, thisWeek, thisMonth] = await Promise.all([
      Trip.countDocuments({ createdAt: { $gte: todayStart } }),
      Trip.countDocuments({ createdAt: { $gte: weekStart } }),
      Trip.countDocuments({ createdAt: { $gte: monthStart } }),
    ]);
    return { today, thisWeek, thisMonth };
  },

  async getTrip(tripId: string) {
    const trip = await Trip.findById(tripId).lean();
    if (!trip) return null;
    const bookings = await Booking.find({ trip: tripId })
      .populate({ path: 'rider', select: 'name phone' })
      .lean();
    return { ...trip, bookings };
  },

  async listBookings(filters: { page: number; limit: number; status?: string; from?: string; to?: string }) {
    const { page, limit, status, from, to } = filters;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (from || to) {
      const dateFilter: Record<string, Date> = {};
      if (from) dateFilter['$gte'] = new Date(from);
      if (to) dateFilter['$lte'] = new Date(to);
      filter.createdAt = dateFilter;
    }
    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('rider', 'name phone')
        .populate({ path: 'trip', select: 'origin destination departure_time fare driver', populate: { path: 'driver', select: 'name phone' } })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Booking.countDocuments(filter),
    ]);
    return { bookings, total, page, pages: Math.ceil(total / limit) };
  },

  async listReports(page: number, limit: number, status?: string) {
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    const [reports, total] = await Promise.all([
      Report.find(filter)
        .populate('reporter', 'name phone')
        .populate({ path: 'message', select: 'text sender', populate: { path: 'sender', select: 'name' } })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Report.countDocuments(filter),
    ]);
    return { reports, total, page, pages: Math.ceil(total / limit) };
  },

  async updateReportStatus(reportId: string, status: 'reviewed' | 'dismissed') {
    return Report.findByIdAndUpdate(reportId, { status }, { new: true }).lean();
  },

  async verifyDriverDocs(userId: string) {
    return User.findByIdAndUpdate(
      userId,
      { doc_status: 'approved', $unset: { doc_rejection_reason: '' } },
      { new: true },
    ).lean();
  },

  async rejectDriverDocs(userId: string, reason: string) {
    return User.findByIdAndUpdate(
      userId,
      { doc_status: 'rejected', doc_rejection_reason: reason },
      { new: true },
    ).lean();
  },

  async getMetrics() {
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const weekStart = new Date(todayStart);
    weekStart.setUTCDate(todayStart.getUTCDate() - ((todayStart.getUTCDay() + 6) % 7));
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const [
      totalUsers,
      totalDrivers,
      totalRiders,
      activeTrips,
      tripsToday,
      tripsThisWeek,
      tripsThisMonth,
      bookingsToday,
      bookingsThisWeek,
      bookingsThisMonth,
      pendingBookings,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: 'driver' }),
      User.countDocuments({ role: 'rider' }),
      Trip.countDocuments({ status: 'active' }),
      Trip.countDocuments({ createdAt: { $gte: todayStart } }),
      Trip.countDocuments({ createdAt: { $gte: weekStart } }),
      Trip.countDocuments({ createdAt: { $gte: monthStart } }),
      Booking.countDocuments({ createdAt: { $gte: todayStart } }),
      Booking.countDocuments({ createdAt: { $gte: weekStart } }),
      Booking.countDocuments({ createdAt: { $gte: monthStart } }),
      Booking.countDocuments({ status: 'pending' }),
    ]);

    return {
      users: { total: totalUsers, drivers: totalDrivers, riders: totalRiders },
      trips: { active: activeTrips, today: tripsToday, thisWeek: tripsThisWeek, thisMonth: tripsThisMonth },
      bookings: { today: bookingsToday, thisWeek: bookingsThisWeek, thisMonth: bookingsThisMonth, pending: pendingBookings },
    };
  },
};
