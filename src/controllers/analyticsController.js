const CampaignAnalytics = require('../models/CampaignAnalytics');
const Application = require('../models/Application');
const InfluencerProfile = require('../models/InfluencerProfile');
const Campaign = require('../models/Campaign');
const BrandProfile = require('../models/BrandProfile');
const { asyncHandler } = require('../utils/helpers');

// POST /analytics/report
const reportMetrics = asyncHandler(async (req, res) => {
  const { applicationId, views, clicks, conversions, reach, engagement } = req.body;

  const influencer = await InfluencerProfile.findOne({ user_id: req.user.id });
  const app = await Application.findOne({ _id: applicationId, influencer_id: influencer?._id });
  if (!app) return res.status(403).json({ message: 'Access denied' });

  const analytics = await CampaignAnalytics.create({
    campaign_id: app.campaign_id, application_id: applicationId,
    views, clicks, conversions, reach, engagement,
  });
  res.status(201).json(analytics);
});

// GET /analytics/campaign/:id
const getCampaignAnalytics = asyncHandler(async (req, res) => {
  const brand = await BrandProfile.findOne({ user_id: req.user.id });
  const campaign = await Campaign.findOne({ _id: req.params.id, brand_id: brand?._id });
  if (!campaign) return res.status(403).json({ message: 'Access denied' });

  const analytics = await CampaignAnalytics.find({ campaign_id: req.params.id })
    .populate({ path: 'application_id', populate: { path: 'influencer_id', select: 'full_name avatar_url' } })
    .sort({ createdAt: -1 });

  const totals = analytics.reduce(
    (acc, r) => ({
      views: acc.views + r.views,
      clicks: acc.clicks + r.clicks,
      conversions: acc.conversions + r.conversions,
      reach: acc.reach + r.reach,
      engagement: acc.engagement + r.engagement,
    }),
    { views: 0, clicks: 0, conversions: 0, reach: 0, engagement: 0 }
  );

  res.json({ analytics, totals });
});

module.exports = { reportMetrics, getCampaignAnalytics };
