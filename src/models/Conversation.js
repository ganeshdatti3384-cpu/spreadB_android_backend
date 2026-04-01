const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  application_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', unique: true },
  brand_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  influencer_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  last_message: { type: String },
  last_message_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Conversation', conversationSchema);
