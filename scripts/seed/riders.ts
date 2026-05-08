import { User } from '../../src/features/auth/User.model';

export const DEMO_RIDERS = [
  { phone: '+923002221001', name: 'Sara Khan' },
  { phone: '+923002221002', name: 'Usman Raza' },
  { phone: '+923002221003', name: 'Fatima Malik' },
  { phone: '+923002221004', name: 'Hamza Iqbal' },
  { phone: '+923002221005', name: 'Ayesha Nawaz' },
];

export async function seedRiders(): Promise<void> {
  for (const r of DEMO_RIDERS) {
    const existing = await User.findOne({ phone: r.phone });
    if (existing) {
      console.log(`  SKIP  rider ${r.name} (${r.phone})`);
    } else {
      await User.create({ ...r, role: 'rider', is_verified: true, status: 'active', terms_accepted_at: new Date(), is_demo: true });
      console.log(`  INSERT rider ${r.name}`);
    }
  }
}
