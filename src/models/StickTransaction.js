const mongoose = require('mongoose');

const stickTransactionSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['credit', 'debit'], required: true },
  amount: { type: Number, required: true },
  reason: { type: String, enum: ['purchase', 'campaign_apply', 'referral', 'admin_reward', 'signup_bonus'], required: true },
  description: { type: String },
  razorpay_payment_id: { type: String },
  balance_after: { type: Number },
}, { timestamps: true });

stickTransactionSchema.index({ user_id: 1, createdAt: -1 });

module.exports = mongoose.model('StickTransaction', stickTransactionSchema);
