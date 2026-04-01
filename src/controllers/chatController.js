const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const BrandProfile = require('../models/BrandProfile');
const InfluencerProfile = require('../models/InfluencerProfile');
const { asyncHandler } = require('../utils/helpers');

// GET /chat/conversations
const getConversations = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const conversations = await Conversation.find({
    $or: [{ brand_user_id: userId }, { influencer_user_id: userId }],
  })
    .populate('brand_user_id', 'email')
    .populate('influencer_user_id', 'email')
    .populate({ path: 'application_id', populate: { path: 'campaign_id', select: 'title' } })
    .sort({ last_message_at: -1 });

  const data = await Promise.all(conversations.map(async (conv) => {
    const isBrand = conv.brand_user_id?._id.toString() === userId.toString();

    // Get the other party's profile name/avatar
    let other_name = '', other_avatar = '';
    if (isBrand) {
      const ip = await InfluencerProfile.findOne({ user_id: conv.influencer_user_id?._id }).select('full_name avatar_url');
      other_name = ip?.full_name || conv.influencer_user_id?.email;
      other_avatar = ip?.avatar_url;
    } else {
      const bp = await BrandProfile.findOne({ user_id: conv.brand_user_id?._id }).select('company_name logo_url');
      other_name = bp?.company_name || conv.brand_user_id?.email;
      other_avatar = bp?.logo_url;
    }

    const unread_count = await Message.countDocuments({
      conversation_id: conv._id,
      sender_id: { $ne: userId },
      is_read: false,
    });

    return {
      ...conv.toObject(),
      other_name,
      other_avatar,
      campaign_title: conv.application_id?.campaign_id?.title,
      unread_count,
    };
  }));

  res.json(data);
});

// GET /chat/conversations/:id/messages
const getMessages = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const userId = req.user.id;

  const conv = await Conversation.findOne({
    _id: req.params.id,
    $or: [{ brand_user_id: userId }, { influencer_user_id: userId }],
  });
  if (!conv) return res.status(403).json({ message: 'Access denied' });

  const messages = await Message.find({ conversation_id: req.params.id })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  // Mark as read
  await Message.updateMany(
    { conversation_id: req.params.id, sender_id: { $ne: userId }, is_read: false },
    { is_read: true }
  );

  // Return messages with sender_id as plain string for easy frontend comparison
  const result = messages.reverse().map(m => ({
    ...m.toObject(),
    sender_id: String(m.sender_id),
  }));

  res.json(result);
});

// POST /chat/conversations/:id/messages
const sendMessage = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const media_url = req.file?.path;
  const media_type = req.file ? (req.file.mimetype.startsWith('image/') ? 'image' : 'file') : null;
  const userId = req.user.id;

  const conv = await Conversation.findOne({
    _id: req.params.id,
    $or: [{ brand_user_id: userId }, { influencer_user_id: userId }],
  });
  if (!conv) return res.status(403).json({ message: 'Access denied' });

  const message = await Message.create({
    conversation_id: conv._id, sender_id: userId, content, media_url, media_type,
  });

  await Conversation.findByIdAndUpdate(conv._id, {
    last_message: content || 'Sent a file',
    last_message_at: new Date(),
  });

  res.status(201).json(message);
});

// POST /chat/direct - start a direct conversation (brand messages influencer)
const startDirectConversation = asyncHandler(async (req, res) => {
  const { influencerUserId } = req.body;
  const userId = req.user.id;

  // Check if conversation already exists between these two users
  let conv = await Conversation.findOne({
    $or: [
      { brand_user_id: userId, influencer_user_id: influencerUserId },
      { brand_user_id: influencerUserId, influencer_user_id: userId },
    ],
    application_id: { $exists: false },
  });

  if (!conv) {
    conv = await Conversation.create({
      brand_user_id: userId,
      influencer_user_id: influencerUserId,
    });
  }

  res.json({ conversationId: conv._id });
});

module.exports = { getConversations, getMessages, sendMessage, startDirectConversation };
