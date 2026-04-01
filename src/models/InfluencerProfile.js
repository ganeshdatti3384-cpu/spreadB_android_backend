const mongoose = require('mongoose');

const influencerProfileSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  full_name: { type: String, required: true, trim: true },
  bio: { type: String },
  avatar_url: { type: String },
  location: { type: String },
  categories: [{ type: String }],
  instagram_handle: { type: String },
  instagram_followers: { type: Number, default: 0 },
  youtube_handle: { type: String },
  youtube_subscribers: { type: Number, default: 0 },
  twitter_handle: { type: String },
  twitter_followers: { type: Number, default: 0 },
  tiktok_handle: { type: String },
  tiktok_followers: { type: Number, default: 0 },
  engagement_rate: { type: Number, default: 0 },
  wallet_balance: { type: Number, default: 0 },
  total_earnings: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('InfluencerProfile', influencerProfileSchema);
