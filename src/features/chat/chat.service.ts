import { Types } from 'mongoose';
import { Message } from './Message.model';
import { Booking } from '../bookings/Booking.model';
import { Trip } from '../trips/Trip.model';
import { Report } from './Report.model';

export const chatService = {
  async getMessages(
    bookingId: string,
    before?: string,
    limit = 50
  ): Promise<{ messages: unknown[]; hasMore: boolean }> {
    const filter: Record<string, unknown> = { booking: new Types.ObjectId(bookingId) };
    if (before && Types.ObjectId.isValid(before)) {
      filter._id = { $lt: new Types.ObjectId(before) };
    }
    const raw = await Message.find(filter)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .populate('sender', 'name avatar_url')
      .lean();
    const hasMore = raw.length > limit;
    if (hasMore) raw.pop();
    return { messages: raw.reverse(), hasMore };
  },

  async saveMessage(bookingId: string, senderId: string, text: string) {
    return Message.create({
      booking: new Types.ObjectId(bookingId),
      sender: new Types.ObjectId(senderId),
      text,
    });
  },

  async markRead(bookingId: string, userId: string) {
    await Message.updateMany(
      { booking: bookingId, sender: { $ne: new Types.ObjectId(userId) }, is_read: false },
      { is_read: true },
    );
  },

  async validateBookingAccess(bookingId: string, userId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(bookingId)) return false;
    const booking = await Booking.findById(bookingId)
      .populate<{ trip: { driver: Types.ObjectId } }>('trip', 'driver')
      .lean();
    if (!booking) return false;
    const riderId = String(booking.rider);
    const driverId = String(booking.trip.driver);
    return riderId === userId || driverId === userId;
  },

  async getConversations(userId: string) {
    const myTrips = await Trip.find({ driver: new Types.ObjectId(userId) }).select('_id').lean();
    const myTripIds = myTrips.map((t) => t._id);
    return Booking.find({
      status: { $in: ['confirmed', 'completed'] },
      $or: [
        { rider: new Types.ObjectId(userId) },
        { trip: { $in: myTripIds } },
      ],
    })
      .populate({
        path: 'trip',
        select: 'origin destination departure_time driver',
        populate: { path: 'driver', select: 'name' },
      })
      .populate('rider', 'name avatar_url')
      .sort({ updatedAt: -1 })
      .lean();
  },

  async reportMessage(messageId: string, reporterId: string, reason: string) {
    const msg = await Message.findById(messageId).lean();
    if (!msg) return null;
    const existing = await Report.findOne({ message: messageId, reporter: reporterId });
    if (existing) return existing;
    return Report.create({
      reporter: new Types.ObjectId(reporterId),
      message: new Types.ObjectId(messageId),
      booking: msg.booking,
      reason,
    });
  },
};
