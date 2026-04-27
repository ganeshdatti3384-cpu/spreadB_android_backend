const nodemailer = require('nodemailer');

const isEmailConfigured =
  process.env.SMTP_USER &&
  process.env.SMTP_USER !== 'placeholder' &&
  process.env.SMTP_PASS &&
  process.env.SMTP_PASS !== 'placeholder';

let transporter = null;

if (isEmailConfigured) {
  transporter = nodemailer.createTransport({
    service: 'gmail',          // Use Gmail service preset — handles host/port/TLS automatically
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,  // Gmail App Password (16 chars, no spaces)
    },
    pool: true,
    maxConnections: 3,
    rateDelta: 1000,
    rateLimit: 3,
  });

  // Verify connection on startup
  transporter.verify((err) => {
    if (err) {
      console.error('❌ Email transporter error:', err.message);
      console.log('   Check SMTP_USER and SMTP_PASS in Railway env vars');
    } else {
      console.log('✅ Email service ready (Gmail)');
    }
  });
} else {
  console.log('ℹ️  Email not configured — OTP will be logged to console only');
}

const sendEmail = async ({ to, subject, html }) => {
  if (!transporter) {
    console.log(`\n📧 [DEV EMAIL]\nTo: ${to}\nSubject: ${subject}\n`);
    return { dev: true };
  }
  try {
    const info = await transporter.sendMail({
      from: `"SpreadB" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`✅ Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`❌ Email failed to ${to}:`, err.message);
    throw err;
  }
};

const sendOTPEmail = async (email, otp) => {
  if (!transporter) {
    console.log(`\n🔑 OTP for ${email}: ${otp}\n`);
    return;
  }
  return sendEmail({
    to: email,
    subject: 'Your SpreadB verification code',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#0A0E1A;padding:32px;border-radius:16px">
        <h2 style="color:#4F8EF7;margin:0 0 8px">SpreadB</h2>
        <p style="color:#A8B4CC;margin:0 0 24px">Verify your account</p>
        <p style="color:#F0F4FF;font-size:15px">Your verification code is:</p>
        <div style="background:#1C2333;padding:24px;text-align:center;border-radius:12px;margin:20px 0;border:1px solid #1E2D45">
          <span style="font-size:40px;font-weight:900;letter-spacing:12px;color:#4F8EF7">${otp}</span>
        </div>
        <p style="color:#5A6A85;font-size:13px">Expires in <strong style="color:#F7A84F">10 minutes</strong>. Do not share this code.</p>
      </div>
    `,
  });
};

const sendResetEmail = async (email, otp) => {
  if (!transporter) {
    console.log(`\n🔑 PASSWORD RESET OTP for ${email}: ${otp}\n`);
    return;
  }
  return sendEmail({
    to: email,
    subject: 'Reset your SpreadB password',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#0A0E1A;padding:32px;border-radius:16px">
        <h2 style="color:#4F8EF7;margin:0 0 8px">SpreadB</h2>
        <p style="color:#A8B4CC;margin:0 0 24px">Password Reset Request</p>
        <p style="color:#F0F4FF;font-size:15px">Use this code to reset your password:</p>
        <div style="background:#1C2333;padding:24px;text-align:center;border-radius:12px;margin:20px 0;border:1px solid #1E2D45">
          <span style="font-size:40px;font-weight:900;letter-spacing:12px;color:#4F8EF7">${otp}</span>
        </div>
        <p style="color:#5A6A85;font-size:13px">Expires in <strong style="color:#F7A84F">15 minutes</strong>.</p>
        <p style="color:#5A6A85;font-size:12px;margin-top:16px">If you didn't request this, ignore this email. Your password won't change.</p>
      </div>
    `,
  });
};

const sendApplicationNotification = async (email, campaignTitle, status) => {
  if (!transporter) return;
  const accepted = status === 'accepted';
  return sendEmail({
    to: email,
    subject: `Application ${accepted ? 'Accepted ✅' : 'Update'} — ${campaignTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#0A0E1A;padding:32px;border-radius:16px">
        <h2 style="color:#4F8EF7">SpreadB</h2>
        <p style="color:#F0F4FF">Your application for <strong>${campaignTitle}</strong> has been <strong style="color:${accepted ? '#10D9A0' : '#F75A5A'}">${status}</strong>.</p>
      </div>
    `,
  });
};

module.exports = { sendEmail, sendOTPEmail, sendApplicationNotification, sendResetEmail };
