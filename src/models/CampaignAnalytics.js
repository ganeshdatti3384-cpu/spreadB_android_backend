const mongoose = require('mongoose');

const campaignAnalyticsSchema = new mongoose.Schema({
  campaign_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
  application_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
  views: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  conversions: { type: Number, default: 0 },
  reach: { type: Number, default: 0 },
  engagement: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('CampaignAnalytics', campaignAnalyticsSchema);
