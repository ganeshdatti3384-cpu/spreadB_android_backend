const admin = require('firebase-admin');

// Firebase is optional - only initialize if real credentials are provided
const isConfigured =
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_PROJECT_ID !== 'placeholder' &&
  process.env.FIREBASE_PRIVATE_KEY &&
  process.env.FIREBASE_PRIVATE_KEY !== 'placeholder';

if (isConfigured && !admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
    console.log('✅ Firebase initialized');
  } catch (err) {
    console.warn('⚠️  Firebase init failed (push notifications disabled):', err.message);
  }
} else {
  console.log('ℹ️  Firebase not configured - push notifications disabled');
}

const sendPushNotification = async (fcmToken, title, body, data = {}) => {
  if (!isConfigured || !admin.apps.length || !fcmToken) return;
  try {
    await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default' } } },
    });
  } catch (err) {
    console.error('FCM error:', err.message);
  }
};

module.exports = { sendPushNotification };
