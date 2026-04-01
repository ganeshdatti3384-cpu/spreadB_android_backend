const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  campaign_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
  influencer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InfluencerProfile', required: true },
  proposal: { type: String, required: true },
  proposed_rate: { type: Number },
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'], default: 'pending' },
  rejection_reason: { type: String },
}, { timestamps: true });

applicationSchema.index({ campaign_id: 1, influencer_id: 1 }, { unique: true });
applicationSchema.index({ influencer_id: 1 });

module.exports = mongoose.model('Application', applicationSchema);
