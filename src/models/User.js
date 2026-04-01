const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password_hash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'brand', 'influencer'], required: true },
  is_verified: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
  otp_code: { type: String },
  otp_expires_at: { type: Date },
  fcm_token: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
