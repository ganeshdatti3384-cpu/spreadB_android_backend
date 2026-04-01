const User = require('../models/User');
const Campaign = require('../models/Campaign');
const Transaction = require('../models/Transaction');
const { asyncHandler, paginate, paginateResponse } = require('../utils/helpers');

// GET /admin/users
const getUsers = asyncHandler(async (req, res) => {
  const { role, page = 1, limit = 20 } = req.query;
  const { limit: lim, offset } = paginate(page, limit);
  const filter = role ? { role } : {};

  const [users, total] = await Promise.all([
    User.find(filter).select('-password_hash -otp_code').sort({ createdAt: -1 }).skip(offset).limit(lim),
    User.countDocuments(filter),
  ]);
  res.json(paginateResponse(users, total, page, lim));
});

// PUT /admin/users/:id/toggle
const toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('is_active email');
  if (!user) return res.status(404).json({ message: 'User not found' });
  user.is_active = !user.is_active;
  await user.save();
  res.json({ id: user._id, email: user.email, is_active: user.is_active });
});

// GET /admin/campaigns
const getAllCampaigns = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const { limit: lim, offset } = paginate(page, limit);
  const filter = status ? { status } : {};

  const campaigns = await Campaign.find(filter)
    .populate('brand_id', 'company_name')
    .sort({ createdAt: -1 }).skip(offset).limit(lim);
  res.json(campaigns);
});

// PUT /admin/campaigns/:id/status
const updateCampaignStatus = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  res.json(campaign);
});

// GET /admin/transactions
const getTransactions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const { limit: lim, offset } = paginate(page, limit);
  const transactions = await Transaction.find()
    .populate('user_id', 'email')
    .sort({ createdAt: -1 }).skip(offset).limit(lim);
  res.json(transactions);
});

// PUT /admin/transactions/:id/process-withdrawal
const processWithdrawal = asyncHandler(async (req, res) => {
  const txn = await Transaction.findOneAndUpdate(
    { _id: req.params.id, type: 'withdrawal' },
    { status: 'completed' },
    { new: true }
  );
  if (!txn) return res.status(404).json({ message: 'Transaction not found' });
  res.json({ message: 'Withdrawal processed', transaction: txn });
});

module.exports = { getUsers, toggleUserStatus, getAllCampaigns, updateCampaignStatus, getTransactions, processWithdrawal };
