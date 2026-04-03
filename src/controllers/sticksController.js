const User = require('../models/User');
const StickTransaction = require('../models/StickTransaction');
const { asyncHandler } = require('../utils/helpers');
const crypto = require('crypto');

const STICK_COST_PER_APPLICATION = 5;

const STICK_PACKAGES = [
  { id: 'pkg_50', sticks: 50, price: 99, label: '50 Sticks' },
  { id: 'pkg_100', sticks: 100, price: 179, label: '100 Sticks' },
  { id: 'pkg_500', sticks: 500, price: 799, label: '500 Sticks' },
];

// GET /sticks/balance
const getBalance = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('sticksBalance email');
  res.json({ balance: user.sticksBalance || 0, costPerApplication: STICK_COST_PER_APPLICATION });
});

// GET /sticks/transactions
const getTransactions = asyncHandler(async (req, res) => {
  const txns = await StickTransaction.find({ user_id: req.user.id })
    .sort({ createdAt: -1 })
    .limit(50);
  res.json(txns);
});

// GET /sticks/packages
const getPackages = asyncHandler(async (req, res) => {
  res.json(STICK_PACKAGES);
});

// POST /sticks/purchase — create Razorpay order for sticks
const purchaseSticks = asyncHandler(async (req, res) => {
  const { packageId } = req.body;
  const pkg = STICK_PACKAGES.find(p => p.id === packageId);
  if (!pkg) return res.status(400).json({ message: 'Invalid package' });

  const isRazorpayConfigured = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_ID !== 'placeholder';

  if (!isRazorpayConfigured) {
    // Dev mode: directly credit sticks without payment
    const user = await User.findById(req.user.id);
    const newBalance = (user.sticksBalance || 0) + pkg.sticks;
    await User.findByIdAndUpdate(req.user.id, { sticksBalance: newBalance });
    await StickTransaction.create({
      user_id: req.user.id, type: 'credit', amount: pkg.sticks,
      reason: 'purchase', description: `Purchased ${pkg.label} (dev mode)`,
      balance_after: newBalance,
    });
    return res.json({ success: true, sticks: pkg.sticks, newBalance, devMode: true });
  }

  const Razorpay = require('razorpay');
  const razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
  const order = await razorpay.orders.create({
    amount: pkg.price * 100,
    currency: 'INR',
    receipt: `sticks_${req.user.id}_${Date.now()}`,
    notes: { userId: req.user.id.toString(), packageId, sticks: pkg.sticks.toString() },
  });

  res.json({ orderId: order.id, amount: order.amount, currency: 'INR', key: process.env.RAZORPAY_KEY_ID, package: pkg });
});

// POST /sticks/verify-purchase — verify Razorpay payment and credit sticks
const verifyPurchase = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, packageId } = req.body;

  const expectedSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSig !== razorpay_signature) {
    return res.status(400).json({ message: 'Payment verification failed' });
  }

  // Check not already processed
  const existing = await StickTransaction.findOne({ razorpay_payment_id });
  if (existing) return res.status(409).json({ message: 'Payment already processed' });

  const pkg = STICK_PACKAGES.find(p => p.id === packageId);
  if (!pkg) return res.status(400).json({ message: 'Invalid package' });

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { $inc: { sticksBalance: pkg.sticks } },
    { new: true }
  );

  await StickTransaction.create({
    user_id: req.user.id, type: 'credit', amount: pkg.sticks,
    reason: 'purchase', description: `Purchased ${pkg.label}`,
    razorpay_payment_id, balance_after: user.sticksBalance,
  });

  res.json({ success: true, sticks: pkg.sticks, newBalance: user.sticksBalance });
});

// POST /sticks/deduct — deduct sticks when applying to campaign (called internally)
const deductForApplication = asyncHandler(async (req, res) => {
  const { campaignId } = req.body;

  // Atomic check and deduct
  const user = await User.findOneAndUpdate(
    { _id: req.user.id, sticksBalance: { $gte: STICK_COST_PER_APPLICATION } },
    { $inc: { sticksBalance: -STICK_COST_PER_APPLICATION } },
    { new: true }
  );

  if (!user) {
    const current = await User.findById(req.user.id).select('sticksBalance');
    return res.status(400).json({
      message: `Insufficient Sticks. You need ${STICK_COST_PER_APPLICATION} sticks to apply. You have ${current?.sticksBalance || 0}.`,
      balance: current?.sticksBalance || 0,
      required: STICK_COST_PER_APPLICATION,
    });
  }

  await StickTransaction.create({
    user_id: req.user.id, type: 'debit', amount: STICK_COST_PER_APPLICATION,
    reason: 'campaign_apply', description: `Applied to campaign`,
    balance_after: user.sticksBalance,
  });

  res.json({ success: true, deducted: STICK_COST_PER_APPLICATION, newBalance: user.sticksBalance });
});

// POST /sticks/admin-reward — admin gives sticks to user
const adminReward = asyncHandler(async (req, res) => {
  const { userId, amount, reason } = req.body;
  if (!userId || !amount || amount <= 0) return res.status(400).json({ message: 'Invalid request' });

  const user = await User.findByIdAndUpdate(userId, { $inc: { sticksBalance: amount } }, { new: true });
  if (!user) return res.status(404).json({ message: 'User not found' });

  await StickTransaction.create({
    user_id: userId, type: 'credit', amount,
    reason: 'admin_reward', description: reason || 'Admin reward',
    balance_after: user.sticksBalance,
  });

  res.json({ success: true, newBalance: user.sticksBalance });
});

module.exports = { getBalance, getTransactions, getPackages, purchaseSticks, verifyPurchase, deductForApplication, adminReward, STICK_COST_PER_APPLICATION };
