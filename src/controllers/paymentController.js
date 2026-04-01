const Razorpay = require('razorpay');
const crypto = require('crypto');
const BrandProfile = require('../models/BrandProfile');
const InfluencerProfile = require('../models/InfluencerProfile');
const Transaction = require('../models/Transaction');
const EscrowPayment = require('../models/EscrowPayment');
const Application = require('../models/Application');
const Campaign = require('../models/Campaign');
const { asyncHandler, generateReference } = require('../utils/helpers');
const { createNotification } = require('../services/notificationService');

// Razorpay is optional - only initialize if real keys are provided
const isRazorpayConfigured =
  process.env.RAZORPAY_KEY_ID &&
  process.env.RAZORPAY_KEY_ID !== 'rzp_test_xxxxxxxxxxxx' &&
  process.env.RAZORPAY_KEY_SECRET;

const razorpay = isRazorpayConfigured
  ? new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET })
  : null;

if (!isRazorpayConfigured) {
  console.log('ℹ️  Razorpay not configured - payment orders disabled');
}

// POST /payments/create-order
const createOrder = asyncHandler(async (req, res) => {
  if (!razorpay) return res.status(503).json({ message: 'Payment gateway not configured' });
  const { amount } = req.body;
  if (amount < 100) return res.status(400).json({ message: 'Minimum amount is ₹100' });

  const order = await razorpay.orders.create({
    amount: Math.round(amount * 100),
    currency: 'INR',
    receipt: generateReference(),
  });

  await Transaction.create({
    user_id: req.user.id, type: 'deposit', amount,
    status: 'pending', razorpay_order_id: order.id, description: 'Wallet top-up',
  });

  res.json({ orderId: order.id, amount: order.amount, currency: order.currency, key: process.env.RAZORPAY_KEY_ID });
});

// POST /payments/verify
const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const expectedSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSig !== razorpay_signature) {
    return res.status(400).json({ message: 'Payment verification failed' });
  }

  const txn = await Transaction.findOneAndUpdate(
    { razorpay_order_id, status: 'pending' },
    { status: 'completed', razorpay_payment_id },
    { new: true }
  );
  if (!txn) return res.status(404).json({ message: 'Transaction not found' });

  const Model = req.user.role === 'brand' ? BrandProfile : InfluencerProfile;
  await Model.findOneAndUpdate({ user_id: req.user.id }, { $inc: { wallet_balance: txn.amount } });

  await createNotification(req.user.id, 'Payment Successful', `₹${txn.amount} added to your wallet`, 'payment');
  res.json({ message: 'Payment verified and wallet credited', amount: txn.amount });
});

// POST /payments/escrow
const createEscrow = asyncHandler(async (req, res) => {
  const { applicationId, amount } = req.body;

  const app = await Application.findOne({ _id: applicationId, status: 'accepted' })
    .populate('campaign_id', 'brand_id');
  if (!app) return res.status(404).json({ message: 'Accepted application not found' });

  const brand = await BrandProfile.findOne({ user_id: req.user.id });
  if (brand.wallet_balance < amount) return res.status(400).json({ message: 'Insufficient wallet balance' });

  const infProfile = await InfluencerProfile.findById(app.influencer_id);

  await BrandProfile.findOneAndUpdate({ user_id: req.user.id }, { $inc: { wallet_balance: -amount } });
  await EscrowPayment.findOneAndUpdate(
    { application_id: applicationId },
    { application_id: applicationId, brand_user_id: req.user.id, influencer_user_id: infProfile.user_id, amount, status: 'held' },
    { upsert: true }
  );
  await Transaction.create({
    user_id: req.user.id, type: 'escrow_hold', amount, status: 'completed', description: 'Escrow payment held',
  });

  res.json({ message: 'Escrow payment created successfully' });
});

// POST /payments/escrow/:applicationId/release
const releaseEscrow = asyncHandler(async (req, res) => {
  const escrow = await EscrowPayment.findOne({
    application_id: req.params.applicationId, brand_user_id: req.user.id, status: 'held',
  });
  if (!escrow) return res.status(404).json({ message: 'Escrow not found' });

  await InfluencerProfile.findOneAndUpdate(
    { user_id: escrow.influencer_user_id },
    { $inc: { wallet_balance: escrow.amount, total_earnings: escrow.amount } }
  );
  await EscrowPayment.findByIdAndUpdate(escrow._id, { status: 'released', released_at: new Date() });
  await Application.findByIdAndUpdate(req.params.applicationId, { status: 'completed' });
  await Transaction.create({
    user_id: escrow.influencer_user_id, type: 'payment_received',
    amount: escrow.amount, status: 'completed', description: 'Campaign payment received',
  });

  await createNotification(escrow.influencer_user_id, 'Payment Released', `₹${escrow.amount} has been released to your wallet`, 'payment');
  res.json({ message: 'Payment released to influencer' });
});

// POST /payments/withdraw
const requestWithdrawal = asyncHandler(async (req, res) => {
  const { amount, bank_account, ifsc, account_name } = req.body;

  const profile = await InfluencerProfile.findOne({ user_id: req.user.id });
  if (!profile || profile.wallet_balance < amount) return res.status(400).json({ message: 'Insufficient balance' });
  if (amount < 500) return res.status(400).json({ message: 'Minimum withdrawal is ₹500' });

  await InfluencerProfile.findOneAndUpdate({ user_id: req.user.id }, { $inc: { wallet_balance: -amount } });
  await Transaction.create({
    user_id: req.user.id, type: 'withdrawal', amount, status: 'pending',
    description: 'Withdrawal request', metadata: { bank_account, ifsc, account_name },
  });

  res.json({ message: 'Withdrawal request submitted. Processing in 2-3 business days.' });
});

// GET /payments/wallet
const getWallet = asyncHandler(async (req, res) => {
  const Model = req.user.role === 'brand' ? BrandProfile : InfluencerProfile;
  const profile = await Model.findOne({ user_id: req.user.id }).select('wallet_balance total_earnings');
  const transactions = await Transaction.find({ user_id: req.user.id }).sort({ createdAt: -1 }).limit(20);
  res.json({ ...profile?.toObject(), transactions });
});

module.exports = { createOrder, verifyPayment, createEscrow, releaseEscrow, requestWithdrawal, getWallet };
