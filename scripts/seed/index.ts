import 'dotenv/config';
import mongoose from 'mongoose';
import { seedDrivers } from './drivers';
import { seedRiders } from './riders';
import { seedTrips } from './trips';
import { seedBookings } from './bookings';
import { seedReviews } from './reviews';
import { seedMessages } from './messages';
import { seedNotifications } from './notifications';

const STEPS: Array<{ name: string; fn: () => Promise<void> }> = [
  { name: 'Drivers', fn: seedDrivers },
  { name: 'Riders', fn: seedRiders },
  { name: 'Trips', fn: seedTrips },
  { name: 'Bookings', fn: seedBookings },
  { name: 'Reviews', fn: seedReviews },
  { name: 'Messages', fn: seedMessages },
  { name: 'Notifications', fn: seedNotifications },
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB\n');

  for (const step of STEPS) {
    console.log(`--- ${step.name} ---`);
    try {
      await step.fn();
    } catch (err) {
      console.error(`FAILED: ${step.name}`, err);
      await mongoose.disconnect();
      process.exit(1);
    }
  }

  console.log('\nSeed complete.');
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
