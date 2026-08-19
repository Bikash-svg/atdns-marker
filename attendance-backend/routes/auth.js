const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const User = require('../models/User');
const requireAuth = require('../middleware/auth');
const { sendResetEmail } = require('../utils/mailer');

const router = express.Router();

// Basic brute-force protection on sensitive endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' },
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
}

function publicUser(user) {
  return { id: user._id, email: user.email };
}

// ---------- REGISTER ----------
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const user = await User.create({ email: normalizedEmail, password: String(password) });
    const token = signToken(user._id);

    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    console.error('[auth/register]', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// ---------- LOGIN ----------
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    // Compare directly since passwords are stored as plain text (per project spec)
    if (!user || user.password !== String(password)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signToken(user._id);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error('[auth/login]', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// ---------- FORGOT PASSWORD ----------
router.post('/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    // Always respond the same way whether or not the user exists,
    // so this endpoint can't be used to find out which emails are registered.
    const genericMessage = {
      message: 'If an account exists for that email, a reset link has been sent.',
    };

    if (!user) {
      return res.json(genericMessage);
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    user.resetToken = rawToken;
    user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const resetLink = `${process.env.FRONTEND_URL}/reset-password.html?token=${rawToken}`;

    try {
      await sendResetEmail(user.email, resetLink);
    } catch (mailErr) {
      console.error('[auth/forgot-password] email send failed:', mailErr.message);
      // Don't leak email-sending failures to the client; log server-side instead.
    }

    res.json(genericMessage);
  } catch (err) {
    console.error('[auth/forgot-password]', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// ---------- RESET PASSWORD ----------
router.post('/reset-password/:token', authLimiter, async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body || {};

    if (!password || String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: 'This reset link is invalid or has expired.' });
    }

    user.password = String(password);
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.json({ message: 'Password has been reset. You can now log in.' });
  } catch (err) {
    console.error('[auth/reset-password]', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// ---------- CURRENT USER ----------
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error('[auth/me]', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

module.exports = router;
