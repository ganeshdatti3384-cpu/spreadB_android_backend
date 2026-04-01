const jwt = require('jsonwebtoken');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const initSocket = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.userId}`);
    socket.join(`user:${socket.userId}`);

    socket.on('join_conversation', async (conversationId) => {
      const conv = await Conversation.findOne({
        _id: conversationId,
        $or: [{ brand_user_id: socket.userId }, { influencer_user_id: socket.userId }],
      });
      if (conv) {
        socket.join(`conv:${conversationId}`);
        socket.emit('joined_conversation', conversationId);
      }
    });

    socket.on('send_message', async ({ conversationId, content, mediaUrl, mediaType }) => {
      try {
        const conv = await Conversation.findOne({
          _id: conversationId,
          $or: [{ brand_user_id: socket.userId }, { influencer_user_id: socket.userId }],
        });
        if (!conv) return;

        const message = await Message.create({
          conversation_id: conversationId, sender_id: socket.userId,
          content, media_url: mediaUrl, media_type: mediaType,
        });
        await Conversation.findByIdAndUpdate(conversationId, {
          last_message: content || 'Sent a file', last_message_at: new Date(),
        });

        // Send to others only (not back to sender) with sender_id as plain string
        const msgObj = { ...message.toObject(), sender_id: String(socket.userId) };
        socket.to(`conv:${conversationId}`).emit('new_message', msgObj);
      } catch (err) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('typing', ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit('user_typing', { userId: socket.userId });
    });

    socket.on('stop_typing', ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit('user_stop_typing', { userId: socket.userId });
    });

    socket.on('disconnect', () => console.log(`Socket disconnected: ${socket.userId}`));
  });
};

module.exports = { initSocket };
