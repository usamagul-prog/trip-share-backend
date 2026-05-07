import { Resend } from 'resend';

let resendClient: Resend | null = null;

function getClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!to) return;
  try {
    await getClient().emails.send({
      from: 'TripShare <noreply@tripshare.pk>',
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('[email] send failed:', err);
  }
}

export function bookingRequestEmail(riderName: string, destination: string, tripDate: string): string {
  return `<p>Hi,</p><p><strong>${riderName}</strong> has requested to join your trip to <strong>${destination}</strong> on <strong>${tripDate}</strong>.</p><p>Open TripShare to accept or reject the request.</p>`;
}

export function bookingAcceptedEmail(destination: string, tripDate: string, driverName: string, driverPhone: string): string {
  return `<p>Your booking for <strong>${destination}</strong> on <strong>${tripDate}</strong> has been <strong>accepted</strong>!</p><p>Driver: ${driverName} — ${driverPhone}</p>`;
}

export function bookingRejectedEmail(destination: string): string {
  return `<p>Your booking request for <strong>${destination}</strong> was not accepted by the driver. You can search for another trip.</p>`;
}

export function bookingCancelledByRiderEmail(riderName: string, destination: string): string {
  return `<p><strong>${riderName}</strong> has cancelled their booking for your trip to <strong>${destination}</strong>.</p>`;
}

export function tripCancelledEmail(destination: string, tripDate: string): string {
  return `<p>Unfortunately, your trip to <strong>${destination}</strong> on <strong>${tripDate}</strong> has been <strong>cancelled by the driver</strong>. You can search for another trip.</p>`;
}

export function reviewPromptEmail(destination: string, reviewLink: string): string {
  return `<p>Your trip to <strong>${destination}</strong> is complete. <a href="${reviewLink}">Leave a review</a> to help the community.</p>`;
}
