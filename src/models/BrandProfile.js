const mongoose = require('mongoose');

const brandProfileSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  company_name: { type: String, required: true, trim: true },
  industry: { type: String },
  website: { type: String },
  description: { type: String },
  logo_url: { type: String },
  location: { type: String },
  wallet_balance: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('BrandProfile', brandProfileSchema);
