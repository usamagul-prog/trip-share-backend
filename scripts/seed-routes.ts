import 'dotenv/config';
import mongoose from 'mongoose';

const ROUTES = [
  {
    origin: 'Islamabad',
    destination: 'Mardan',
    distance_km: 130,
    duration_min: 120,
    waypoints: ['Attock', 'Nowshera'],
  },
  {
    origin: 'Lahore',
    destination: 'Faisalabad',
    distance_km: 130,
    duration_min: 150,
    waypoints: ['Sheikhupura', 'Sangla Hill'],
  },
  {
    origin: 'Karachi',
    destination: 'Hyderabad',
    distance_km: 160,
    duration_min: 150,
    waypoints: ['Gharo', 'Thatta'],
  },
  {
    origin: 'Islamabad',
    destination: 'Lahore',
    distance_km: 375,
    duration_min: 240,
    waypoints: ['Gujranwala', 'Wazirabad'],
  },
  {
    origin: 'Lahore',
    destination: 'Multan',
    distance_km: 340,
    duration_min: 240,
    waypoints: ['Sahiwal', 'Pakpattan'],
  },
];

const RouteSchema = new mongoose.Schema(
  {
    origin: { type: String, required: true },
    destination: { type: String, required: true },
    distance_km: { type: Number, required: true },
    duration_min: { type: Number, required: true },
    waypoints: [String],
  },
  { timestamps: true },
);

RouteSchema.index({ origin: 1, destination: 1 }, { unique: true });

const Route = mongoose.model('Route', RouteSchema);

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  let inserted = 0;
  let skipped = 0;

  for (const route of ROUTES) {
    const existing = await Route.findOne({ origin: route.origin, destination: route.destination });
    if (existing) {
      console.log(`SKIP  ${route.origin} → ${route.destination} (already exists)`);
      skipped++;
    } else {
      await Route.create(route);
      console.log(`INSERT ${route.origin} → ${route.destination}`);
      inserted++;
    }
  }

  console.log(`\nDone. Inserted: ${inserted}, Skipped: ${skipped}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
