import { Types } from 'mongoose';
import { Message } from './Message.model';
import { Booking } from '../bookings/Booking.model';
import { Report } from './Report.model';

export const chatService = {
  async getMessages(bookingId: string, limit = 50) {
    return Message.find({ booking: bookingId })
      .sort({ createdAt: 1 })
      .limit(limit)
      .populate('sender', 'name avatar_url')
      .lean();
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
