import { User } from '../../src/features/auth/User.model';
import { Trip } from '../../src/features/trips/Trip.model';
import { Booking } from '../../src/features/bookings/Booking.model';
import { Review } from '../../src/features/reviews/Review.model';
import { Message } from '../../src/features/chat/Message.model';
import { Notification } from '../../src/features/notifications/Notification.model';

export async function resetDemoData(): Promise<void> {
  const filter = { is_demo: true };
  const [users, trips, bookings, reviews, messages, notifications] = await Promise.all([
    User.deleteMany(filter),
    Trip.deleteMany(filter),
    Booking.deleteMany(filter),
    Review.deleteMany(filter),
    Message.deleteMany(filter),
    Notification.deleteMany(filter),
  ]);
  console.log(`  DELETE ${users.deletedCount} users`);
  console.log(`  DELETE ${trips.deletedCount} trips`);
  console.log(`  DELETE ${bookings.deletedCount} bookings`);
  console.log(`  DELETE ${reviews.deletedCount} reviews`);
  console.log(`  DELETE ${messages.deletedCount} messages`);
  console.log(`  DELETE ${notifications.deletedCount} notifications`);
}
