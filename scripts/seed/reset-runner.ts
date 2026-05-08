import 'dotenv/config';
import mongoose from 'mongoose';
import { resetDemoData } from './reset';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }
  await mongoose.connect(uri);
  console.log('Connected to MongoDB\n--- Resetting demo data ---');
  try {
    await resetDemoData();
    console.log('\nReset complete.');
  } catch (err) {
    console.error('FAILED:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
