import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../src/features/auth/User.model';
import { Trip } from '../src/features/trips/Trip.model';
import { Booking } from '../src/features/bookings/Booking.model';
import { Review } from '../src/features/reviews/Review.model';
import { Message } from '../src/features/chat/Message.model';
import { Notification } from '../src/features/notifications/Notification.model';

const MONGODB_URI = process.env.MONGODB_URI!;

const CITIES = [
  'Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad',
  'Multan', 'Peshawar', 'Quetta', 'Gujranwala', 'Sialkot',
];

const VEHICLES = [
  'Toyota Corolla · White', 'Honda Civic · Silver', 'Suzuki Alto · Red',
  'Toyota Prius · Black', 'Honda City · Grey', 'Suzuki Cultus · White',
];

const PLATES = ['LEB-1234', 'KHI-9876', 'ISL-4567', 'RWP-3322', 'FSD-7788'];

const DRIVER_MSGS = [
  "I'll be at the pickup point 5 minutes early.",
  'Running on time, see you soon!',
  'Just entered the motorway, ETA on track.',
  'You can call me when you reach the pickup.',
  'Trip completed — hope you had a comfortable ride!',
  'Please be ready at the pickup point.',
  'I drive carefully, your safety is my priority.',
];

const RIDER_MSGS = [
  'On my way to the pickup point now.',
  'Thanks! How long until you arrive?',
  'Great ride, thank you!',
  "I'm at the pickup location.",
  'Could you share your live location?',
  'Perfect timing!',
  'Very comfortable trip, thanks!',
];

const REVIEW_COMMENTS_DRIVER = [
  'Great driver, very punctual and safe driving.',
  'Comfortable car and friendly conversation.',
  'Reached destination on time. Recommended!',
  'Very professional, will book again.',
  'Clean car, smooth ride from Lahore to Islamabad.',
];

const REVIEW_COMMENTS_RIDER = [
  'Polite passenger, ready on time.',
  'Very pleasant co-passenger.',
  'Punctual and cooperative rider.',
  'No issues at all, great experience.',
  'Would accept their booking again.',
];

const NOTIF_TEMPLATES = {
  booking_confirmed: (from: string, to: string) => ({
    title: 'Booking Confirmed',
    body: `Your seat from ${from} to ${to} has been confirmed.`,
    type: 'booking',
  }),
  booking_received: (rider: string) => ({
    title: 'New Booking Request',
    body: `${rider} has requested a seat on your trip.`,
    type: 'booking',
  }),
  review_received: (from: string) => ({
    title: 'New Review',
    body: `${from} left you a 5-star review.`,
    type: 'review',
  }),
  trip_reminder: (from: string, to: string) => ({
    title: 'Trip Tomorrow',
    body: `Your trip from ${from} to ${to} departs tomorrow.`,
    type: 'trip',
  }),
  trip_completed: (from: string, to: string) => ({
    title: 'Trip Completed',
    body: `Your trip from ${from} to ${to} is complete. Leave a review!`,
    type: 'trip',
  }),
};

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86400000);
}

function hoursFromNow(n: number): Date {
  return new Date(Date.now() + n * 3600000);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function cityPair(): [string, string] {
  const from = pick(CITIES);
  let to = pick(CITIES);
  while (to === from) to = pick(CITIES);
  return [from, to];
}

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const driver = await User.findOne({ email: 'driver@demo.com' });
  const rider = await User.findOne({ email: 'rider@demo.com' });

  if (!driver || !rider) {
    console.error('Demo users not found. Create driver@demo.com and rider@demo.com first.');
    process.exit(1);
  }

  console.log(`Driver: ${driver._id}  Rider: ${rider._id}`);

  // ── Wipe existing demo data ─────────────────────────────────────────────
  const existingTrips = await Trip.find({ is_demo: true }).select('_id');
  const tripIds = existingTrips.map((t) => t._id);
  const existingBookings = await Booking.find({ is_demo: true }).select('_id');
  const bookingIds = existingBookings.map((b) => b._id);

  await Message.deleteMany({ is_demo: true });
  await Review.deleteMany({ is_demo: true });
  await Booking.deleteMany({ is_demo: true });
  await Trip.deleteMany({ is_demo: true });
  await Notification.deleteMany({ is_demo: true });
  console.log('Cleared old demo data');
  void tripIds; void bookingIds;

  // ── 1. COMPLETED TRIPS (past) ───────────────────────────────────────────
  const completedTripData: Array<{
    trip: mongoose.Types.ObjectId;
    origin: string;
    destination: string;
    departure: Date;
  }> = [];

  for (let i = 0; i < 6; i++) {
    const [origin, destination] = cityPair();
    const departure = daysAgo(30 - i * 4);
    const trip = await Trip.create({
      driver: driver._id,
      origin,
      destination,
      departure_time: departure,
      seats_total: 4,
      seats_available: 0,
      fare: 800 + i * 200,
      status: 'completed',
      vehicle_desc: pick(VEHICLES),
      vehicle_plate: pick(PLATES),
      is_demo: true,
    });
    completedTripData.push({ trip: trip._id as mongoose.Types.ObjectId, origin, destination, departure });
  }

  // ── 2. CANCELLED TRIPS ──────────────────────────────────────────────────
  for (let i = 0; i < 2; i++) {
    const [origin, destination] = cityPair();
    await Trip.create({
      driver: driver._id,
      origin,
      destination,
      departure_time: daysAgo(10 - i * 3),
      seats_total: 3,
      seats_available: 1,
      fare: 600,
      status: 'cancelled',
      vehicle_desc: pick(VEHICLES),
      vehicle_plate: pick(PLATES),
      is_demo: true,
    });
  }

  // ── 3. SCHEDULED TRIPS (future) ─────────────────────────────────────────
  const scheduledTripData: Array<{
    trip: mongoose.Types.ObjectId;
    origin: string;
    destination: string;
  }> = [];

  for (let i = 0; i < 4; i++) {
    const [origin, destination] = cityPair();
    const trip = await Trip.create({
      driver: driver._id,
      origin,
      destination,
      departure_time: hoursFromNow(24 + i * 48),
      seats_total: 4,
      seats_available: 3 - i,
      fare: 700 + i * 150,
      status: 'scheduled',
      vehicle_desc: pick(VEHICLES),
      vehicle_plate: pick(PLATES),
      waypoints: i % 2 === 0 ? [pick(CITIES)] : [],
      is_demo: true,
    });
    scheduledTripData.push({ trip: trip._id as mongoose.Types.ObjectId, origin, destination });
  }

  console.log(`Created ${completedTripData.length} completed, 2 cancelled, ${scheduledTripData.length} scheduled trips`);

  // ── 4. BOOKINGS for completed trips ─────────────────────────────────────
  const completedBookings: Array<{
    booking: mongoose.Types.ObjectId;
    origin: string;
    destination: string;
  }> = [];

  for (const { trip, origin, destination } of completedTripData) {
    const booking = await Booking.create({
      trip,
      rider: rider._id,
      pickup_point: origin,
      seats: 1,
      status: 'completed',
      payment_method: 'cash',
      is_demo: true,
    });
    completedBookings.push({ booking: booking._id as mongoose.Types.ObjectId, origin, destination });
  }

  // ── 5. BOOKINGS for scheduled trips ─────────────────────────────────────
  const pendingBookings: Array<{
    booking: mongoose.Types.ObjectId;
    origin: string;
    destination: string;
  }> = [];

  for (let i = 0; i < scheduledTripData.length; i++) {
    const { trip, origin, destination } = scheduledTripData[i];
    const status = i === 0 ? 'confirmed' : i === 1 ? 'pending' : 'confirmed';
    const booking = await Booking.create({
      trip,
      rider: rider._id,
      pickup_point: origin,
      seats: 1,
      status,
      payment_method: 'cash',
      is_demo: true,
    });
    pendingBookings.push({ booking: booking._id as mongoose.Types.ObjectId, origin, destination });
  }

  console.log(`Created ${completedBookings.length} completed bookings, ${pendingBookings.length} upcoming bookings`);

  // ── 6. REVIEWS for completed bookings ───────────────────────────────────
  for (let i = 0; i < completedBookings.length; i++) {
    const { booking } = completedBookings[i];

    // Rider reviews driver
    await Review.create({
      booking,
      reviewer: rider._id,
      reviewee: driver._id,
      rating: 4 + (i % 2),
      comment: pick(REVIEW_COMMENTS_DRIVER),
      is_demo: true,
    });

    // Driver reviews rider
    await Review.create({
      booking,
      reviewer: driver._id,
      reviewee: rider._id,
      rating: 4 + (i % 2),
      comment: pick(REVIEW_COMMENTS_RIDER),
      is_demo: true,
    });
  }

  // Update avg_rating on both users
  const driverRating = 4.6;
  const riderRating = 4.8;
  await User.findByIdAndUpdate(driver._id, {
    avg_rating: driverRating,
    review_count: completedBookings.length,
  });
  await User.findByIdAndUpdate(rider._id, {
    avg_rating: riderRating,
    review_count: completedBookings.length,
  });

  console.log(`Created ${completedBookings.length * 2} reviews`);

  // ── 7. CHAT MESSAGES in bookings ────────────────────────────────────────
  for (const { booking } of [...completedBookings, ...pendingBookings]) {
    const msgCount = 4 + Math.floor(Math.random() * 5);
    for (let m = 0; m < msgCount; m++) {
      const isDriver = m % 2 === 0;
      await Message.create({
        booking,
        sender: isDriver ? driver._id : rider._id,
        text: pick(isDriver ? DRIVER_MSGS : RIDER_MSGS),
        is_read: true,
        is_demo: true,
      });
    }
  }

  console.log('Created chat messages');

  // ── 8. NOTIFICATIONS ────────────────────────────────────────────────────
  // Rider notifications
  for (const { origin, destination } of completedBookings.slice(0, 4)) {
    await Notification.create({
      user: rider._id,
      ...NOTIF_TEMPLATES.booking_confirmed(origin, destination),
      is_read: true,
      is_demo: true,
    });
    await Notification.create({
      user: rider._id,
      ...NOTIF_TEMPLATES.trip_completed(origin, destination),
      is_read: true,
      is_demo: true,
    });
  }

  for (const { origin, destination } of pendingBookings.slice(0, 2)) {
    await Notification.create({
      user: rider._id,
      ...NOTIF_TEMPLATES.booking_confirmed(origin, destination),
      is_read: false,
      is_demo: true,
    });
    await Notification.create({
      user: rider._id,
      ...NOTIF_TEMPLATES.trip_reminder(origin, destination),
      is_read: false,
      is_demo: true,
    });
  }

  await Notification.create({
    user: rider._id,
    ...NOTIF_TEMPLATES.review_received('Ahmed Khan'),
    is_read: false,
    is_demo: true,
  });

  // Driver notifications
  for (const { origin, destination } of completedBookings.slice(0, 4)) {
    await Notification.create({
      user: driver._id,
      ...NOTIF_TEMPLATES.booking_received('Rider'),
      is_read: true,
      is_demo: true,
    });
    await Notification.create({
      user: driver._id,
      ...NOTIF_TEMPLATES.trip_completed(origin, destination),
      is_read: true,
      is_demo: true,
    });
  }

  for (const { origin, destination } of scheduledTripData.slice(0, 2)) {
    await Notification.create({
      user: driver._id,
      ...NOTIF_TEMPLATES.booking_received('Sara Malik'),
      is_read: false,
      is_demo: true,
    });
    await Notification.create({
      user: driver._id,
      ...NOTIF_TEMPLATES.trip_reminder(origin, destination),
      is_read: false,
      is_demo: true,
    });
  }

  await Notification.create({
    user: driver._id,
    ...NOTIF_TEMPLATES.review_received('Usman Raza'),
    is_read: false,
    is_demo: true,
  });

  console.log('Created notifications');

  await mongoose.disconnect();
  console.log('\nSeed complete!');
  console.log(`  Trips:         ${completedTripData.length + 2 + scheduledTripData.length} (6 completed, 2 cancelled, 4 scheduled)`);
  console.log(`  Bookings:      ${completedBookings.length + pendingBookings.length}`);
  console.log(`  Reviews:       ${completedBookings.length * 2}`);
  console.log(`  Avg rating:    driver=${driverRating}  rider=${riderRating}`);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
