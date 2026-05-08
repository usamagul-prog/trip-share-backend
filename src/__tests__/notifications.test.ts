jest.mock('../features/notifications/Notification.model', () => ({
  Notification: {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    updateMany: jest.fn(),
    countDocuments: jest.fn(),
  },
}));
jest.mock('../features/auth/User.model', () => ({
  User: { findById: jest.fn() },
}));
jest.mock('../lib/fcm', () => ({ sendPush: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../lib/email', () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) }));

import { Types } from 'mongoose';
import { Notification } from '../features/notifications/Notification.model';
import { User } from '../features/auth/User.model';
import { sendPush } from '../lib/fcm';
import { sendEmail } from '../lib/email';
import {
  notificationsService,
  NotificationNotFoundError,
  NotificationOwnershipError,
} from '../features/notifications/notifications.service';

const userId = new Types.ObjectId().toString();
const notifId = new Types.ObjectId().toString();
const saveMock = jest.fn();

const mockNotif = {
  _id: new Types.ObjectId(notifId),
  user: new Types.ObjectId(userId),
  title: 'Test',
  body: 'Body',
  type: 'general',
  is_read: false,
  save: saveMock,
};

function findChain(result: unknown[]) {
  const limit = jest.fn().mockResolvedValue(result);
  const skip = jest.fn().mockReturnValue({ limit });
  const sort = jest.fn().mockReturnValue({ skip });
  return { sort };
}

beforeEach(() => jest.clearAllMocks());

describe('notificationsService.notifyUser', () => {
  it('saves notification to DB', async () => {
    (Notification.create as jest.Mock).mockResolvedValue(mockNotif);
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({ fcm_token: null, email: null }),
    });
    await notificationsService.notifyUser(userId, {
      title: 'Test', body: 'Body', type: 'general',
    });
    expect(Notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Test', body: 'Body', type: 'general' })
    );
  });

  it('sends FCM push when user has fcm_token', async () => {
    (Notification.create as jest.Mock).mockResolvedValue(mockNotif);
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({ fcm_token: 'token123', email: null }),
    });
    await notificationsService.notifyUser(userId, {
      title: 'Test', body: 'Body', type: 'general', link: '/bookings',
    });
    // Wait for fire-and-forget to resolve
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(sendPush).toHaveBeenCalledWith('token123', 'Test', 'Body', '/bookings');
  });

  it('sends email when user has email and emailHtml provided', async () => {
    (Notification.create as jest.Mock).mockResolvedValue(mockNotif);
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({ fcm_token: null, email: 'user@example.com' }),
    });
    await notificationsService.notifyUser(userId, {
      title: 'Test', body: 'Body', type: 'general',
      emailSubject: 'Subject', emailHtml: '<p>Hello</p>',
    });
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(sendEmail).toHaveBeenCalledWith('user@example.com', 'Subject', '<p>Hello</p>');
  });

  it('skips FCM when no fcm_token', async () => {
    (Notification.create as jest.Mock).mockResolvedValue(mockNotif);
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({ fcm_token: null, email: null }),
    });
    await notificationsService.notifyUser(userId, { title: 'T', body: 'B', type: 'g' });
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(sendPush).not.toHaveBeenCalled();
  });
});

describe('notificationsService.getForUser', () => {
  it('returns notifications, unreadCount, and total', async () => {
    const notifs = [{ ...mockNotif, is_read: false }, { ...mockNotif, is_read: true }];
    (Notification.find as jest.Mock).mockReturnValue(findChain(notifs));
    (Notification.countDocuments as jest.Mock)
      .mockResolvedValueOnce(10)  // total
      .mockResolvedValueOnce(3);  // unreadCount
    const result = await notificationsService.getForUser(userId);
    expect(result.notifications).toHaveLength(2);
    expect(result.total).toBe(10);
    expect(result.unreadCount).toBe(3);
  });
});

describe('notificationsService.markRead', () => {
  it('marks notification read', async () => {
    saveMock.mockResolvedValue({ ...mockNotif, is_read: true });
    (Notification.findById as jest.Mock).mockResolvedValue({ ...mockNotif, save: saveMock });
    await notificationsService.markRead(notifId, userId);
    expect(saveMock).toHaveBeenCalled();
  });

  it('throws NotificationNotFoundError when not found', async () => {
    (Notification.findById as jest.Mock).mockResolvedValue(null);
    const err = await notificationsService.markRead(notifId, userId).catch(e => e);
    expect(err).toBeInstanceOf(NotificationNotFoundError);
  });

  it('throws NotificationOwnershipError when wrong user', async () => {
    const otherId = new Types.ObjectId().toString();
    (Notification.findById as jest.Mock).mockResolvedValue({ ...mockNotif, save: saveMock });
    const err = await notificationsService.markRead(notifId, otherId).catch(e => e);
    expect(err).toBeInstanceOf(NotificationOwnershipError);
  });
});

describe('notificationsService.markAllRead', () => {
  it('calls updateMany with correct filter', async () => {
    (Notification.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 3 });
    await notificationsService.markAllRead(userId);
    expect(Notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ is_read: false }),
      { $set: { is_read: true } }
    );
  });
});
