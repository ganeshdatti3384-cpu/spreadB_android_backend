const mongoose = require('mongoose');

const escrowPaymentSchema = new mongoose.Schema({
  application_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', unique: true },
  brand_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  influencer_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['held', 'released', 'refunded'], default: 'held' },
  released_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('EscrowPayment', escrowPaymentSchema);
