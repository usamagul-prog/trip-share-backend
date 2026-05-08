import { User } from '../../src/features/auth/User.model';
import { Trip } from '../../src/features/trips/Trip.model';
import { Booking } from '../../src/features/bookings/Booking.model';
import { Review } from '../../src/features/reviews/Review.model';
import { DEMO_RIDERS } from './riders';

export async function seedReviews(): Promise<void> {
  const rider = await User.findOne({ phone: DEMO_RIDERS[3].phone });
  const trip = await Trip.findOne({ origin: 'Islamabad', destination: 'Mardan', is_demo: true });
  if (!rider || !trip) { console.log('  WARN  missing rider/trip for reviews'); return; }

  const booking = await Booking.findOne({ trip: trip._id, rider: rider._id });
  if (!booking) { console.log('  WARN  completed booking not found for reviews'); return; }

  const driver = await User.findById(trip.driver);
  if (!driver) return;

  const pairs = [
    { reviewer: rider._id, reviewee: driver._id, rating: 5, comment: 'Excellent driver! Very punctual and drove carefully on the motorway. Would ride again.' },
    { reviewer: driver._id, reviewee: rider._id, rating: 4, comment: 'Polite and respectful rider. Was ready at the pickup point on time.' },
  ];

  for (const p of pairs) {
    const existing = await Review.findOne({ booking: booking._id, reviewer: p.reviewer });
    if (existing) {
      console.log(`  SKIP  review from ${p.reviewer}`);
    } else {
      await Review.create({ ...p, booking: booking._id, is_demo: true });
      console.log(`  INSERT review rating=${p.rating}`);
    }
  }
}
