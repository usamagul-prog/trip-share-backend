import { User } from '../../src/features/auth/User.model';
import { Trip } from '../../src/features/trips/Trip.model';
import { Booking } from '../../src/features/bookings/Booking.model';
import { Notification } from '../../src/features/notifications/Notification.model';
import { DEMO_RIDERS } from './riders';

const DEMO_NOTIFICATIONS = [
  { type: 'booking_confirmed', title: 'Booking Confirmed!', body: 'Your booking for Islamabad → Mardan has been confirmed.' },
  { type: 'trip_reminder', title: 'Trip Tomorrow', body: 'Your trip to Mardan departs tomorrow at 7:00 AM. Get ready!' },
  { type: 'new_message', title: 'New Message', body: 'Your driver sent you a message about the pickup point.' },
];

export async function seedNotifications(): Promise<void> {
  const rider = await User.findOne({ phone: DEMO_RIDERS[0].phone });
  if (!rider) { console.log('  WARN  missing rider for notifications'); return; }

  const trip = await Trip.findOne({ origin: 'Islamabad', destination: 'Mardan', is_demo: true });
  if (!trip) { console.log('  WARN  missing trip for notifications'); return; }

  const existing = await Notification.countDocuments({ user: rider._id, is_demo: true });
  if (existing > 0) { console.log(`  SKIP  notifications (${existing} already exist)`); return; }

  const booking = await Booking.findOne({ trip: trip._id, rider: rider._id });
  const link = booking ? `/chat/${booking._id}` : `/trips/${trip._id}`;

  const baseTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
  for (let i = 0; i < DEMO_NOTIFICATIONS.length; i++) {
    const n = DEMO_NOTIFICATIONS[i];
    const createdAt = new Date(baseTime.getTime() + i * 30 * 60 * 1000); // 30 min apart
    await Notification.create({
      user: rider._id,
      ...n,
      link,
      is_read: i < 2,
      is_demo: true,
      createdAt,
    });
    console.log(`  INSERT notification: "${n.title}"`);
  }
}
