import { User } from '../../src/features/auth/User.model';

export const DEMO_DRIVERS = [
  { phone: '+923001111001', name: 'Ali Hassan', vehicle_desc: 'Honda City', vehicle_plate: 'LEA-1234' },
  { phone: '+923001111002', name: 'Tariq Mehmood', vehicle_desc: 'Toyota Corolla', vehicle_plate: 'ABC-5678' },
  { phone: '+923001111003', name: 'Bilal Ahmed', vehicle_desc: 'Suzuki Cultus', vehicle_plate: 'KHI-9012' },
];

export async function seedDrivers(): Promise<void> {
  for (const d of DEMO_DRIVERS) {
    const existing = await User.findOne({ phone: d.phone });
    if (existing) {
      console.log(`  SKIP  driver ${d.name} (${d.phone})`);
    } else {
      await User.create({ ...d, role: 'driver', is_verified: true, status: 'active', terms_accepted_at: new Date(), is_demo: true });
      console.log(`  INSERT driver ${d.name}`);
    }
  }
}
