const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  return transporter;
}

async function sendResetEmail(toEmail, resetLink) {
  const t = getTransporter();

  await t.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: toEmail,
    subject: 'Reset your Attendance Calculator password',
    text:
      `We received a request to reset your password.\n\n` +
      `Reset it here (valid for 1 hour): ${resetLink}\n\n` +
      `If you didn't request this, you can safely ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="margin-bottom: 4px;">Reset your password</h2>
        <p>We received a request to reset your Attendance Calculator password.</p>
        <p>
          <a href="${resetLink}"
             style="display:inline-block;padding:10px 20px;background:#5B7A4A;color:#fff;
                    border-radius:8px;text-decoration:none;font-weight:600;">
            Reset password
          </a>
        </p>
        <p style="color:#666;font-size:13px;">This link expires in 1 hour.
        If you didn't request this, you can safely ignore this email.</p>
        <p style="color:#999;font-size:12px;word-break:break-all;">${resetLink}</p>
      </div>
    `,
  });
}

module.exports = { sendResetEmail, getTransporter };