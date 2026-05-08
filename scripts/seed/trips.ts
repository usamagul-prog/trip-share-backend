import { User } from '../../src/features/auth/User.model';
import { Trip } from '../../src/features/trips/Trip.model';
import { DEMO_DRIVERS } from './drivers';

function daysFromNow(days: number, hour = 7): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

const TRIP_TEMPLATES = [
  { origin: 'Islamabad', destination: 'Mardan', fare: 700, seats_total: 3, driverIdx: 0, daysOffset: 2 },
  { origin: 'Islamabad', destination: 'Mardan', fare: 700, seats_total: 2, driverIdx: 1, daysOffset: 4 },
  { origin: 'Lahore', destination: 'Faisalabad', fare: 600, seats_total: 3, driverIdx: 1, daysOffset: 3 },
  { origin: 'Lahore', destination: 'Faisalabad', fare: 600, seats_total: 2, driverIdx: 2, daysOffset: 5 },
  { origin: 'Karachi', destination: 'Hyderabad', fare: 800, seats_total: 3, driverIdx: 2, daysOffset: 2 },
  { origin: 'Karachi', destination: 'Hyderabad', fare: 800, seats_total: 2, driverIdx: 0, daysOffset: 6 },
];

export async function seedTrips(): Promise<void> {
  const drivers = await Promise.all(
    DEMO_DRIVERS.map((d) => User.findOne({ phone: d.phone }))
  );

  for (const t of TRIP_TEMPLATES) {
    const driver = drivers[t.driverIdx];
    if (!driver) { console.log(`  WARN  driver index ${t.driverIdx} not found`); continue; }

    const departure_time = daysFromNow(t.daysOffset);
    const existing = await Trip.findOne({ driver: driver._id, departure_time });
    if (existing) {
      console.log(`  SKIP  trip ${t.origin}→${t.destination} for ${driver.name}`);
    } else {
      await Trip.create({
        driver: driver._id,
        origin: t.origin,
        destination: t.destination,
        departure_time,
        seats_total: t.seats_total,
        seats_available: t.seats_total,
        fare: t.fare,
        status: 'scheduled',
        vehicle_desc: DEMO_DRIVERS[t.driverIdx].vehicle_desc,
        vehicle_plate: DEMO_DRIVERS[t.driverIdx].vehicle_plate,
        is_demo: true,
      });
      console.log(`  INSERT trip ${t.origin}→${t.destination} for ${driver.name}`);
    }
  }
}
