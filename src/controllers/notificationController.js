const Notification = require('../models/Notification');
const { asyncHandler } = require('../utils/helpers');

// GET /notifications
const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user_id: req.user.id })
    .sort({ createdAt: -1 }).limit(50);
  const unread_count = notifications.filter((n) => !n.is_read).length;
  res.json({ notifications, unread_count });
});

// PUT /notifications/read-all
const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user_id: req.user.id }, { is_read: true });
  res.json({ message: 'All notifications marked as read' });
});

// PUT /notifications/:id/read
const markRead = asyncHandler(async (req, res) => {
  await Notification.findOneAndUpdate({ _id: req.params.id, user_id: req.user.id }, { is_read: true });
  res.json({ message: 'Notification marked as read' });
});

module.exports = { getNotifications, markAllRead, markRead };
