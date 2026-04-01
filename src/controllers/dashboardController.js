const BrandProfile = require('../models/BrandProfile');
const InfluencerProfile = require('../models/InfluencerProfile');
const Campaign = require('../models/Campaign');
const Application = require('../models/Application');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { asyncHandler } = require('../utils/helpers');

// GET /dashboard/influencer
const getInfluencerDashboard = asyncHandler(async (req, res) => {
  const profile = await InfluencerProfile.findOne({ user_id: req.user.id }).select('wallet_balance total_earnings');
  if (!profile) return res.status(404).json({ message: 'Profile not found' });

  const [active, completed, pending, monthlyEarnings] = await Promise.all([
    Application.countDocuments({ influencer_id: profile._id, status: 'accepted' }),
    Application.countDocuments({ influencer_id: profile._id, status: 'completed' }),
    Application.countDocuments({ influencer_id: profile._id, status: 'pending' }),
    Transaction.aggregate([
      { $match: { user_id: profile.user_id, type: 'payment_received', status: 'completed', createdAt: { $gte: new Date(new Date().setDate(1)) } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  const recentApps = await Application.find({ influencer_id: profile._id })
    .populate({ path: 'campaign_id', select: 'title platform', populate: { path: 'brand_id', select: 'company_name' } })
    .sort({ updatedAt: -1 }).limit(5);

  const earningsChart = await Transaction.aggregate([
    { $match: { user_id: profile.user_id, type: 'payment_received', status: 'completed', createdAt: { $gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, earnings: { $sum: '$amount' } } },
    { $sort: { _id: 1 } },
  ]);

  res.json({
    stats: {
      wallet_balance: profile.wallet_balance,
      total_earnings: profile.total_earnings,
      monthly_earnings: monthlyEarnings[0]?.total || 0,
      active_campaigns: active,
      completed_campaigns: completed,
      pending_applications: pending,
    },
    recent_applications: recentApps.map((a) => ({
      ...a.toObject(),
      campaign_title: a.campaign_id?.title,
      platform: a.campaign_id?.platform,
      company_name: a.campaign_id?.brand_id?.company_name,
    })),
    earnings_chart: earningsChart,
  });
});

// GET /dashboard/brand
const getBrandDashboard = asyncHandler(async (req, res) => {
  const brand = await BrandProfile.findOne({ user_id: req.user.id }).select('wallet_balance');
  if (!brand) return res.status(404).json({ message: 'Profile not found' });

  const campaignIds = await Campaign.find({ brand_id: brand._id }).distinct('_id');

  const [totalCampaigns, activeCampaigns, totalApplications, totalSpent] = await Promise.all([
    Campaign.countDocuments({ brand_id: brand._id }),
    Campaign.countDocuments({ brand_id: brand._id, status: 'active' }),
    Application.countDocuments({ campaign_id: { $in: campaignIds } }),
    Transaction.aggregate([
      { $match: { user_id: brand.user_id, type: 'escrow_hold', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  const recentCampaigns = await Campaign.find({ brand_id: brand._id })
    .sort({ createdAt: -1 }).limit(5);

  const recentWithStats = await Promise.all(recentCampaigns.map(async (c) => {
    const [apps, accepted] = await Promise.all([
      Application.countDocuments({ campaign_id: c._id }),
      Application.countDocuments({ campaign_id: c._id, status: 'accepted' }),
    ]);
    return { ...c.toObject(), applications: apps, accepted };
  }));

  res.json({
    stats: {
      wallet_balance: brand.wallet_balance,
      total_campaigns: totalCampaigns,
      active_campaigns: activeCampaigns,
      total_applications: totalApplications,
      total_spent: totalSpent[0]?.total || 0,
    },
    recent_campaigns: recentWithStats,
  });
});

// GET /dashboard/admin
const getAdminDashboard = asyncHandler(async (req, res) => {
  const [totalUsers, totalBrands, totalInfluencers, totalCampaigns, totalTxns] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'brand' }),
    User.countDocuments({ role: 'influencer' }),
    Campaign.countDocuments(),
    Transaction.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
  ]);

  const [recentUsers, recentCampaigns] = await Promise.all([
    User.find().sort({ createdAt: -1 }).limit(10).select('-password_hash -otp_code'),
    Campaign.find().sort({ createdAt: -1 }).limit(10).populate('brand_id', 'company_name'),
  ]);

  res.json({
    stats: {
      total_users: totalUsers,
      total_brands: totalBrands,
      total_influencers: totalInfluencers,
      total_campaigns: totalCampaigns,
      total_transactions: totalTxns[0]?.total || 0,
    },
    recent_users: recentUsers,
    recent_campaigns: recentCampaigns,
  });
});

module.exports = { getInfluencerDashboard, getBrandDashboard, getAdminDashboard };
