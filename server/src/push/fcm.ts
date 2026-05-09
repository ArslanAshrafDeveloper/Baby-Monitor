// Firebase Cloud Messaging wrapper. Sends a high-priority "wake-on-cry" push.
//
// We use the legacy HTTP API for simplicity in v1; switch to HTTP v1 + service-account
// auth before scaling. The iOS path also goes through FCM via APNs token mapping.

interface SendArgs {
  platform: 'ios' | 'android' | undefined;
  token: string;
  pairId: string;
}

const FCM_URL = 'https://fcm.googleapis.com/fcm/send';

export async function sendWakePush({ platform, token, pairId }: SendArgs): Promise<void> {
  const serverKey = process.env.FCM_SERVER_KEY;
  if (!serverKey) {
    // Dev mode: just log and pretend.
    // eslint-disable-next-line no-console
    console.log('[push:dev] would wake', { platform, token, pairId });
    return;
  }

  const body = {
    to: token,
    priority: 'high',
    // For iOS, the app receives a VoIP push (handled via PushKit/CallKit on the client).
    // For Android, the data-only payload + a foreground service shows the alert.
    content_available: true,
    data: {
      type: 'wake_on_cry',
      pairId,
      ts: String(Date.now()),
    },
    android: {
      priority: 'HIGH',
    },
    apns: {
      headers: { 'apns-push-type': 'voip', 'apns-priority': '10' },
    },
  };

  const res = await fetch(FCM_URL, {
    method: 'POST',
    headers: {
      Authorization: `key=${serverKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FCM error ${res.status}: ${text}`);
  }
}
