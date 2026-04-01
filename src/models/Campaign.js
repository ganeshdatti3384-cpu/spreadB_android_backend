const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  brand_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BrandProfile', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  requirements: { type: String },
  budget: { type: Number, required: true },
  platform: { type: String, required: true },
  categories: [{ type: String }],
  min_followers: { type: Number, default: 0 },
  deadline: { type: Date },
  deliverables: { type: String },
  status: { type: String, enum: ['draft', 'active', 'paused', 'completed', 'cancelled'], default: 'active' },
  max_influencers: { type: Number, default: 10 },
  location: { type: String, default: '' },
}, { timestamps: true });

campaignSchema.index({ status: 1, platform: 1 });
campaignSchema.index({ brand_id: 1 });

module.exports = mongoose.model('Campaign', campaignSchema);
