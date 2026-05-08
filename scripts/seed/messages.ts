import { User } from '../../src/features/auth/User.model';
import { Trip } from '../../src/features/trips/Trip.model';
import { Booking } from '../../src/features/bookings/Booking.model';
import { Message } from '../../src/features/chat/Message.model';
import { DEMO_RIDERS } from './riders';

const CHAT = [
  { senderIsDriver: false, text: 'Assalam o Alaikum! I have booked your trip to Mardan.' },
  { senderIsDriver: true,  text: 'Walaikum Salam! Yes, confirmed. Where exactly should I pick you up?' },
  { senderIsDriver: false, text: 'Please pick me up at Pak Secretariat main gate at 7am.' },
  { senderIsDriver: true,  text: 'No problem, I will be there at 7am sharp. My car is a white Honda City.' },
  { senderIsDriver: false, text: 'Perfect, I will look for you there. Jazak Allah.' },
  { senderIsDriver: true,  text: 'See you in the morning, Insha Allah. Drive safe!' },
];

export async function seedMessages(): Promise<void> {
  const rider = await User.findOne({ phone: DEMO_RIDERS[0].phone });
  const trip = await Trip.findOne({ origin: 'Islamabad', destination: 'Mardan', is_demo: true });
  if (!rider || !trip) { console.log('  WARN  missing rider/trip for messages'); return; }

  const booking = await Booking.findOne({ trip: trip._id, rider: rider._id });
  if (!booking) { console.log('  WARN  booking not found for messages'); return; }

  const existing = await Message.countDocuments({ booking: booking._id });
  if (existing > 0) { console.log(`  SKIP  messages (${existing} already exist)`); return; }

  const driver = await User.findById(trip.driver);
  if (!driver) return;

  const baseTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
  for (let i = 0; i < CHAT.length; i++) {
    const msg = CHAT[i];
    const createdAt = new Date(baseTime.getTime() + i * 3 * 60 * 1000); // 3 min apart
    await Message.create({
      booking: booking._id,
      sender: msg.senderIsDriver ? driver._id : rider._id,
      text: msg.text,
      is_read: true,
      is_demo: true,
      createdAt,
    });
    console.log(`  INSERT message: "${msg.text.slice(0, 40)}..."`);
  }
}
