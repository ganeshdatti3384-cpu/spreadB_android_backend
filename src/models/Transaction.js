const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['deposit', 'withdrawal', 'escrow_hold', 'escrow_release', 'payment_received'], required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
  razorpay_order_id: { type: String },
  razorpay_payment_id: { type: String },
  description: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

transactionSchema.index({ user_id: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
