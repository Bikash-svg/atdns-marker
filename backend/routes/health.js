const express = require('express');
const { getTransporter } = require('../utils/mailer');
const router = express.Router();

// UptimeRobot (or any monitor) can ping this to confirm the server is alive.
// No auth required — this must stay publicly reachable.
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Verifies the email (Gmail SMTP) connection/credentials without sending a
// real message. The forgot-password endpoint always returns a generic
// success response for security, so email-sending failures are otherwise
// invisible from the client side — hit this route directly to check
// whether EMAIL_USER/EMAIL_PASS are actually valid and reachable.
// Safe to leave public: it never sends mail and never echoes credentials,
// only nodemailer's own connection/auth error message (e.g. "Invalid
// login: 535-5.7.8 Username and Password not accepted").
router.get('/email', async (req, res) => {
  try {
    await getTransporter().verify();
    res.json({ ok: true, message: 'SMTP connection verified — credentials and connectivity are good.' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;