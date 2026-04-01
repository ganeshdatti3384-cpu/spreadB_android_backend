const BrandProfile = require('../models/BrandProfile');
const InfluencerProfile = require('../models/InfluencerProfile');
const PortfolioItem = require('../models/PortfolioItem');
const { asyncHandler } = require('../utils/helpers');

// GET /profile/brand
const getBrandProfile = asyncHandler(async (req, res) => {
  const profile = await BrandProfile.findOne({ user_id: req.user.id }).populate('user_id', 'email');
  if (!profile) return res.status(404).json({ message: 'Profile not found' });
  res.json(profile);
});

// POST /profile/brand
const createOrUpdateBrandProfile = asyncHandler(async (req, res) => {
  const { company_name, industry, website, description, location } = req.body;
  const logo_url = req.file?.path || req.body.logo_url;

  const data = { company_name, industry, website, description, location };
  if (logo_url) data.logo_url = logo_url;

  const profile = await BrandProfile.findOneAndUpdate(
    { user_id: req.user.id },
    { $set: data },
    { new: true, upsert: true, runValidators: true }
  );
  res.json(profile);
});

// GET /profile/influencer
const getInfluencerProfile = asyncHandler(async (req, res) => {
  const userId = req.params.userId || req.user.id;
  const profile = await InfluencerProfile.findOne({ user_id: userId }).populate('user_id', 'email');
  if (!profile) return res.status(404).json({ message: 'Profile not found' });

  const portfolio = await PortfolioItem.find({ influencer_id: profile._id }).sort({ createdAt: -1 });
  res.json({ ...profile.toObject(), portfolio });
});

// POST /profile/influencer
const createOrUpdateInfluencerProfile = asyncHandler(async (req, res) => {
  const {
    full_name, bio, location, categories,
    instagram_handle, instagram_followers,
    youtube_handle, youtube_subscribers,
    twitter_handle, twitter_followers,
    tiktok_handle, tiktok_followers,
    engagement_rate,
  } = req.body;
  const avatar_url = req.file?.path || req.body.avatar_url;

  const cats = Array.isArray(categories)
    ? categories
    : categories ? categories.split(',').map((c) => c.trim()) : [];

  const data = {
    full_name, bio, location, categories: cats,
    instagram_handle, instagram_followers: Number(instagram_followers) || 0,
    youtube_handle, youtube_subscribers: Number(youtube_subscribers) || 0,
    twitter_handle, twitter_followers: Number(twitter_followers) || 0,
    tiktok_handle, tiktok_followers: Number(tiktok_followers) || 0,
    engagement_rate: Number(engagement_rate) || 0,
  };
  if (avatar_url) data.avatar_url = avatar_url;

  const profile = await InfluencerProfile.findOneAndUpdate(
    { user_id: req.user.id },
    { $set: data },
    { new: true, upsert: true, runValidators: true }
  );
  res.json(profile);
});

// POST /profile/portfolio
const addPortfolioItem = asyncHandler(async (req, res) => {
  const { title, description, platform, link, media_type } = req.body;
  const media_url = req.file?.path || req.body.media_url;

  const profile = await InfluencerProfile.findOne({ user_id: req.user.id });
  if (!profile) return res.status(404).json({ message: 'Profile not found' });

  const item = await PortfolioItem.create({
    influencer_id: profile._id, title, description,
    media_url, media_type: media_type || 'image', platform, link,
  });
  res.status(201).json(item);
});

// DELETE /profile/portfolio/:id
const deletePortfolioItem = asyncHandler(async (req, res) => {
  const profile = await InfluencerProfile.findOne({ user_id: req.user.id });
  await PortfolioItem.findOneAndDelete({ _id: req.params.id, influencer_id: profile._id });
  res.json({ message: 'Portfolio item deleted' });
});

// GET /profile/influencers
const browseInfluencers = asyncHandler(async (req, res) => {
  const { category, min_followers, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (category) filter.categories = category;
  if (min_followers) filter.instagram_followers = { $gte: Number(min_followers) };

  const profiles = await InfluencerProfile.find(filter)
    .populate('user_id', 'email')
    .sort({ instagram_followers: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json(profiles);
});

module.exports = {
  getBrandProfile, createOrUpdateBrandProfile,
  getInfluencerProfile, createOrUpdateInfluencerProfile,
  addPortfolioItem, deletePortfolioItem, browseInfluencers,
};
