const Campaign = require('../models/Campaign');
const Application = require('../models/Application');
const BrandProfile = require('../models/BrandProfile');
const InfluencerProfile = require('../models/InfluencerProfile');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const { asyncHandler, paginate, paginateResponse } = require('../utils/helpers');
const { createNotification } = require('../services/notificationService');

const createCampaign = asyncHandler(async (req, res) => {
  const { title, description, requirements, budget, platform, categories, min_followers, deadline, deliverables, max_influencers, location } = req.body;
  let brand = await BrandProfile.findOne({ user_id: req.user.id });
  if (!brand) {
    const user = await User.findById(req.user.id).select('email');
    brand = await BrandProfile.create({ user_id: req.user.id, company_name: user?.email?.split('@')[0] || 'My Brand', location: location || '' });
  }
  const cats = Array.isArray(categories) ? categories : (categories ? categories.split(',').map(c => c.trim()) : []);
  const campaign = await Campaign.create({
    brand_id: brand._id, title: String(title||'').trim(), description: String(description||'').trim(),
    requirements: requirements||'', budget: Number(budget), platform: String(platform),
    categories: cats, min_followers: Number(min_followers)||0, deadline: deadline||undefined,
    deliverables: deliverables||'', max_influencers: Number(max_influencers)||10, location: location||brand.location||'',
  });
  res.status(201).json(campaign);
});

const getCampaigns = asyncHandler(async (req, res) => {
  const { platform, category, min_budget, max_budget, page = 1, limit = 10 } = req.query;
  const { limit: lim, offset } = paginate(page, limit);
  const filter = { status: 'active' };
  if (platform) filter.platform = platform;
  if (category) filter.categories = category;
  if (min_budget || max_budget) { filter.budget = {}; if (min_budget) filter.budget.$gte = Number(min_budget); if (max_budget) filter.budget.$lte = Number(max_budget); }
  const [campaigns, total] = await Promise.all([Campaign.find(filter).populate({ path: 'brand_id', select: 'company_name logo_url location' }).sort({ createdAt: -1 }).skip(offset).limit(lim), Campaign.countDocuments(filter)]);
  const ids = campaigns.map(c => c._id);
  const counts = await Application.aggregate([{ $match: { campaign_id: { $in: ids } } }, { $group: { _id: '$campaign_id', count: { $sum: 1 } } }]);
  const countMap = Object.fromEntries(counts.map(c => [c._id.toString(), c.count]));
  const data = campaigns.map(c => ({ ...c.toObject(), company_name: c.brand_id?.company_name, brand_logo: c.brand_id?.logo_url, brand_location: c.brand_id?.location, application_count: countMap[c._id.toString()]||0 }));
  res.json(paginateResponse(data, total, page, lim));
});

const getBrandCampaigns = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const brand = await BrandProfile.findOne({ user_id: req.user.id });
  if (!brand) return res.json([]);
  const filter = { brand_id: brand._id };
  if (status) filter.status = status;
  const campaigns = await Campaign.find(filter).sort({ createdAt: -1 });
  const ids = campaigns.map(c => c._id);
  const appStats = await Application.aggregate([{ $match: { campaign_id: { $in: ids } } }, { $group: { _id: '$campaign_id', total: { $sum: 1 }, accepted: { $sum: { $cond: [{ $eq: ['$status','accepted'] }, 1, 0] } } } }]);
  const statsMap = Object.fromEntries(appStats.map(s => [s._id.toString(), s]));
  res.json(campaigns.map(c => ({ ...c.toObject(), total_applications: statsMap[c._id.toString()]?.total||0, accepted_count: statsMap[c._id.toString()]?.accepted||0 })));
});

const getCampaignById = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findById(req.params.id).populate({ path: 'brand_id', select: 'company_name logo_url industry website location' });
  if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
  const obj = campaign.toObject();
  obj.company_name = campaign.brand_id?.company_name;
  obj.brand_logo = campaign.brand_id?.logo_url;
  res.json(obj);
});

const updateCampaign = asyncHandler(async (req, res) => {
  const brand = await BrandProfile.findOne({ user_id: req.user.id });
  if (!brand) return res.status(404).json({ message: 'Brand profile not found' });
  const updates = { ...req.body };
  if (updates.categories && !Array.isArray(updates.categories)) updates.categories = updates.categories.split(',');
  const campaign = await Campaign.findOneAndUpdate({ _id: req.params.id, brand_id: brand._id }, { $set: updates }, { new: true });
  if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
  res.json(campaign);
});

const deleteCampaign = asyncHandler(async (req, res) => {
  const brand = await BrandProfile.findOne({ user_id: req.user.id });
  if (!brand) return res.status(404).json({ message: 'Brand profile not found' });
  await Campaign.findOneAndUpdate({ _id: req.params.id, brand_id: brand._id }, { status: 'cancelled' });
  res.json({ message: 'Campaign cancelled' });
});

const getCampaignApplications = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = { campaign_id: req.params.id };
  if (status) filter.status = status;
  const applications = await Application.find(filter).populate({ path: 'influencer_id', select: 'full_name avatar_url instagram_followers engagement_rate categories user_id location' }).sort({ createdAt: -1 });
  const data = await Promise.all(applications.map(async app => { const user = await User.findById(app.influencer_id?.user_id).select('email'); return { ...app.toObject(), email: user?.email }; }));
  res.json(data);
});

const applyToCampaign = asyncHandler(async (req, res) => {
  const { proposal, proposed_rate } = req.body;
  const influencer = await InfluencerProfile.findOne({ user_id: req.user.id });
  if (!influencer) return res.status(404).json({ message: 'Influencer profile not found' });
  const campaign = await Campaign.findOne({ _id: req.params.id, status: 'active' });
  if (!campaign) return res.status(404).json({ message: 'Campaign not found or inactive' });
  const existing = await Application.findOne({ campaign_id: campaign._id, influencer_id: influencer._id });
  if (existing) return res.status(409).json({ message: 'You have already applied to this campaign' });
  const application = await Application.create({ campaign_id: campaign._id, influencer_id: influencer._id, proposal, proposed_rate: proposed_rate ? Number(proposed_rate) : undefined });
  const brand = await BrandProfile.findById(campaign.brand_id);
  const brandUser = await User.findById(brand?.user_id).select('_id fcm_token');
  if (brandUser) await createNotification(brandUser._id, 'New Application', `Someone applied to "${campaign.title}"`, 'application', { applicationId: application._id }, brandUser.fcm_token);
  res.status(201).json(application);
});

const updateApplicationStatus = asyncHandler(async (req, res) => {
  const { status, rejection_reason } = req.body;
  const brand = await BrandProfile.findOne({ user_id: req.user.id });
  if (!brand) return res.status(404).json({ message: 'Brand profile not found' });
  const brandCampaignIds = await Campaign.find({ brand_id: brand._id }).distinct('_id');
  const application = await Application.findOneAndUpdate({ _id: req.params.applicationId, campaign_id: { $in: brandCampaignIds } }, { $set: { status, rejection_reason } }, { new: true }).populate('campaign_id', 'title');
  if (!application) return res.status(404).json({ message: 'Application not found' });
  const infProfile = await InfluencerProfile.findById(application.influencer_id);
  const infUser = await User.findById(infProfile?.user_id).select('_id fcm_token');
  if (infUser) { const msg = status === 'accepted' ? 'Your application was accepted!' : 'Your application was not selected'; await createNotification(infUser._id, 'Application Update', msg, 'application_status', { applicationId: application._id }, infUser.fcm_token); }
  if (status === 'accepted' && infUser) await Conversation.findOneAndUpdate({ application_id: application._id }, { application_id: application._id, brand_user_id: req.user.id, influencer_user_id: infUser._id }, { upsert: true, new: true });
  res.json(application);
});

const getMyApplications = asyncHandler(async (req, res) => {
  const influencer = await InfluencerProfile.findOne({ user_id: req.user.id });
  if (!influencer) return res.status(404).json({ message: 'Profile not found' });
  const applications = await Application.find({ influencer_id: influencer._id }).populate({ path: 'campaign_id', select: 'title platform budget deadline location', populate: { path: 'brand_id', select: 'company_name logo_url' } }).sort({ createdAt: -1 });
  res.json(applications.map(app => ({ ...app.toObject(), campaign_title: app.campaign_id?.title, platform: app.campaign_id?.platform, budget: app.campaign_id?.budget, deadline: app.campaign_id?.deadline, location: app.campaign_id?.location, company_name: app.campaign_id?.brand_id?.company_name, brand_logo: app.campaign_id?.brand_id?.logo_url })));
});

module.exports = { createCampaign, getCampaigns, getBrandCampaigns, getCampaignById, updateCampaign, deleteCampaign, getCampaignApplications, applyToCampaign, updateApplicationStatus, getMyApplications };


