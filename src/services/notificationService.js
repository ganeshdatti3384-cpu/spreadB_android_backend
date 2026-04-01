const Notification = require('../models/Notification');
const { sendPushNotification } = require('../config/firebase');

const createNotification = async (userId, title, body, type = 'general', data = {}, fcmToken = null) => {
  try {
    await Notification.create({ user_id: userId, title, body, type, data });
    if (fcmToken) await sendPushNotification(fcmToken, title, body, data);
  } catch (err) {
    console.error('Notification error:', err.message);
  }
};

module.exports = { createNotification };
