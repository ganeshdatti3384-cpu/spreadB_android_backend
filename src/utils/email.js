const nodemailer = require('nodemailer');

const isEmailConfigured =
  process.env.SMTP_USER &&
  process.env.SMTP_USER !== 'placeholder' &&
  process.env.SMTP_PASS &&
  process.env.SMTP_PASS !== 'placeholder';

let transporter = null;

if (isEmailConfigured) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    tls: { rejectUnauthorized: false },
  });
  console.log('✅ Email service configured');
} else {
  console.log('ℹ️  Email not configured - OTP will be logged to console');
}

const sendEmail = async ({ to, subject, html }) => {
  if (!transporter) {
    console.log(`📧 [DEV EMAIL] To: ${to} | Subject: ${subject}`);
    return;
  }
  await transporter.sendMail({
    from: `"SpreadB" <${process.env.FROM_EMAIL}>`,
    to, subject, html,
  });
};

const sendOTPEmail = async (email, otp) => {
  if (!transporter) {
    // In dev mode, print OTP to console so you can still test
    console.log(`\n🔑 OTP for ${email}: ${otp}\n`);
    return;
  }
  await sendEmail({
    to: email,
    subject: 'Verify your SpreadB account',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#6C63FF">Welcome to SpreadB</h2>
        <p>Your verification code is:</p>
        <div style="background:#f4f4f4;padding:20px;text-align:center;border-radius:8px;margin:20px 0">
          <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#6C63FF">${otp}</span>
        </div>
        <p>This code expires in 10 minutes.</p>
      </div>
    `,
  });
};

const sendApplicationNotification = async (email, campaignTitle, status) => {
  if (!transporter) return;
  const statusText = status === 'accepted' ? 'accepted ✅' : 'rejected ❌';
  await sendEmail({
    to: email,
    subject: `Application ${statusText} - ${campaignTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#6C63FF">Application Update</h2>
        <p>Your application for <strong>${campaignTitle}</strong> has been <strong>${statusText}</strong>.</p>
      </div>
    `,
  });
};

const sendResetEmail = async (email, otp) => {
  if (!transporter) {
    console.log(`\n🔑 PASSWORD RESET OTP for ${email}: ${otp}\n`);
    return;
  }
  await sendEmail({
    to: email,
    subject: 'Reset your SpreadB password',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#6C63FF">Reset Your Password</h2>
        <p>You requested a password reset. Use this code:</p>
        <div style="background:#f4f4f4;padding:20px;text-align:center;border-radius:8px;margin:20px 0">
          <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#6C63FF">${otp}</span>
        </div>
        <p>This code expires in <strong>15 minutes</strong>.</p>
        <p style="color:#999;font-size:12px">If you didn't request this, please ignore this email.</p>
      </div>
    `,
  });
};

module.exports = { sendEmail, sendOTPEmail, sendApplicationNotification, sendResetEmail };
