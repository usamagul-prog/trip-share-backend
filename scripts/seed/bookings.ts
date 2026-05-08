import { User } from '../../src/features/auth/User.model';
import { Trip } from '../../src/features/trips/Trip.model';
import { Booking, IBooking } from '../../src/features/bookings/Booking.model';
import { DEMO_RIDERS } from './riders';

export let DEMO_BOOKINGS: { phone: string; tripOrigin: string; tripDest: string; pickup: string; status: IBooking['status'] }[] = [];

export async function seedBookings(): Promise<void> {
  DEMO_BOOKINGS = [
    { phone: DEMO_RIDERS[0].phone, tripOrigin: 'Islamabad', tripDest: 'Mardan', pickup: 'Pak Secretariat Gate', status: 'confirmed' },
    { phone: DEMO_RIDERS[1].phone, tripOrigin: 'Lahore', tripDest: 'Faisalabad', pickup: 'Thokar Niaz Baig', status: 'confirmed' },
    { phone: DEMO_RIDERS[2].phone, tripOrigin: 'Karachi', tripDest: 'Hyderabad', pickup: 'Numaish Chowrangi', status: 'pending' },
    { phone: DEMO_RIDERS[3].phone, tripOrigin: 'Islamabad', tripDest: 'Mardan', pickup: 'Zero Point', status: 'completed' },
  ];

  for (const b of DEMO_BOOKINGS) {
    const rider = await User.findOne({ phone: b.phone });
    const trip = await Trip.findOne({ origin: b.tripOrigin, destination: b.tripDest, is_demo: true });
    if (!rider || !trip) { console.log(`  WARN  missing rider/trip for booking`); continue; }

    const existing = await Booking.findOne({ trip: trip._id, rider: rider._id });
    if (existing) {
      console.log(`  SKIP  booking ${rider.name} on ${b.tripOrigin}→${b.tripDest}`);
    } else {
      await Booking.create({
        trip: trip._id,
        rider: rider._id,
        pickup_point: b.pickup,
        seats: 1,
        status: b.status,
        payment_method: 'cash',
        is_demo: true,
      });
      console.log(`  INSERT booking ${rider.name} on ${b.tripOrigin}→${b.tripDest} (${b.status})`);
    }
  }
}
