const mongoose = require('mongoose');

const portfolioItemSchema = new mongoose.Schema({
  influencer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InfluencerProfile', required: true },
  title: { type: String, required: true },
  description: { type: String },
  media_url: { type: String },
  media_type: { type: String, default: 'image' },
  platform: { type: String },
  link: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('PortfolioItem', portfolioItemSchema);
