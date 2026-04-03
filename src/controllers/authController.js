const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendOTPEmail, sendResetEmail } = require('../utils/email');
const { generateOTP, asyncHandler } = require('../utils/helpers');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

// POST /auth/register
const register = asyncHandler(async (req, res) => {
  const { email, password, role } = req.body;

  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ message: 'Email already registered' });

  const password_hash = await bcrypt.hash(password, 12);
  const otp_code = generateOTP();
  const otp_expires_at = new Date(Date.now() + 10 * 60 * 1000);

  const user = await User.create({ email, password_hash, role, otp_code, otp_expires_at });

  // Give 10 signup bonus sticks
  const StickTransaction = require('../models/StickTransaction');
  StickTransaction.create({ user_id: user._id, type: 'credit', amount: 10, reason: 'signup_bonus', description: 'Welcome bonus sticks', balance_after: 10 }).catch(() => {});

  // Send email in background — don't block the response
  sendOTPEmail(email, otp_code).catch((err) => console.error('Email send failed:', err.message));

  res.status(201).json({ message: 'Registration successful. Check your email for OTP.', userId: user._id });
});

// POST /auth/verify-otp
const verifyOTP = asyncHandler(async (req, res) => {
  const { userId, otp } = req.body;

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.otp_code !== otp) return res.status(400).json({ message: 'Invalid OTP' });
  if (new Date() > user.otp_expires_at) return res.status(400).json({ message: 'OTP expired' });

  user.is_verified = true;
  user.otp_code = undefined;
  user.otp_expires_at = undefined;
  await user.save();

  const token = generateToken(user._id);
  res.json({ message: 'Email verified successfully', token, role: user.role });
});

// POST /auth/resend-otp
const resendOTP = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  user.otp_code = generateOTP();
  user.otp_expires_at = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  sendOTPEmail(user.email, user.otp_code).catch((err) => console.error('Email send failed:', err.message));
  res.json({ message: 'OTP resent successfully' });
});

// POST /auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  if (!user.is_active) return res.status(403).json({ message: 'Account suspended' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

  if (!user.is_verified) {
    user.otp_code = generateOTP();
    user.otp_expires_at = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    sendOTPEmail(email, user.otp_code).catch((err) => console.error('Email send failed:', err.message));
    return res.status(403).json({
      message: 'Email not verified. OTP sent.',
      userId: user._id,
      requiresVerification: true,
    });
  }

  const token = generateToken(user._id);
  res.json({ token, role: user.role, userId: user._id });
});

// GET /auth/me
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-password_hash -otp_code -otp_expires_at');
  res.json(user);
});

// POST /auth/fcm-token
const updateFCMToken = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, { fcm_token: req.body.fcmToken });
  res.json({ message: 'FCM token updated' });
});

// POST /auth/change-password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user.id);
  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) return res.status(400).json({ message: 'Current password is incorrect' });

  user.password_hash = await bcrypt.hash(newPassword, 12);
  await user.save();
  res.json({ message: 'Password changed successfully' });
});

// POST /auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  // Always return success to prevent email enumeration
  if (!user) return res.json({ message: 'If this email exists, a reset link has been sent.' });

  // Generate a 6-digit reset OTP (reuse OTP system)
  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  user.otp_code = otp;
  user.otp_expires_at = otpExpiry;
  await user.save();

  sendResetEmail(email, otp).catch((err) => console.error('Reset email failed:', err.message));
  res.json({ message: 'Password reset code sent to your email.', userId: user._id });
});

// POST /auth/reset-password
const resetPassword = asyncHandler(async (req, res) => {
  const { userId, otp, newPassword } = req.body;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.otp_code !== otp) return res.status(400).json({ message: 'Invalid reset code' });
  if (new Date() > user.otp_expires_at) return res.status(400).json({ message: 'Reset code expired' });

  user.password_hash = await bcrypt.hash(newPassword, 12);
  user.otp_code = undefined;
  user.otp_expires_at = undefined;
  await user.save();
  res.json({ message: 'Password reset successfully. You can now login.' });
});

module.exports = { register, verifyOTP, resendOTP, login, getMe, updateFCMToken, changePassword, forgotPassword, resetPassword };
