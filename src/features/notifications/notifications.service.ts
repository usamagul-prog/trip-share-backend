import { Types } from 'mongoose';
import { Notification, INotification } from './Notification.model';
import { User } from '../auth/User.model';
import { sendPush } from '../../lib/fcm';
import { sendEmail } from '../../lib/email';

export class NotificationNotFoundError extends Error {
  constructor() { super('Notification not found'); this.name = 'NotificationNotFoundError'; }
}

export class NotificationOwnershipError extends Error {
  constructor() { super('Forbidden'); this.name = 'NotificationOwnershipError'; }
}

export const notificationsService = {
  async notifyUser(
    userId: string,
    payload: {
      title: string;
      body: string;
      type: string;
      link?: string;
      emailSubject?: string;
      emailHtml?: string;
    }
  ): Promise<void> {
    await Notification.create({
      user: new Types.ObjectId(userId),
      title: payload.title,
      body: payload.body,
      type: payload.type,
      link: payload.link,
      is_demo: false,
    });

    const user = await User.findById(userId).select('fcm_token email');
    if (!user) return;

    if (user.fcm_token) {
      void sendPush(user.fcm_token, payload.title, payload.body, payload.link ?? '/');
    }
    if (user.email && payload.emailHtml) {
      void sendEmail(user.email, payload.emailSubject ?? payload.title, payload.emailHtml);
    }
  },

  async getForUser(
    userId: string,
    page = 1,
    limit = 20
  ): Promise<{ notifications: INotification[]; unreadCount: number; total: number }> {
    const userOid = new Types.ObjectId(userId);
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ user: userOid })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Notification.countDocuments({ user: userOid }),
      Notification.countDocuments({ user: userOid, is_read: false }),
    ]);
    return { notifications, unreadCount, total };
  },

  async markRead(notificationId: string, userId: string): Promise<INotification> {
    const notification = await Notification.findById(notificationId);
    if (!notification) throw new NotificationNotFoundError();
    if (notification.user.toString() !== userId) throw new NotificationOwnershipError();
    notification.is_read = true;
    return notification.save();
  },

  async markAllRead(userId: string): Promise<void> {
    await Notification.updateMany(
      { user: new Types.ObjectId(userId), is_read: false },
      { $set: { is_read: true } }
    );
  },
};
