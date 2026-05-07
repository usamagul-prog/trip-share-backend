import admin from '../config/firebase';

export async function sendPush(
  token: string,
  title: string,
  body: string,
  link: string
): Promise<void> {
  if (!token) return;
  try {
    await admin.messaging().send({
      token,
      notification: { title, body },
      webpush: {
        fcmOptions: { link },
      },
    });
  } catch (err) {
    console.error('[fcm] push failed:', err);
  }
}
