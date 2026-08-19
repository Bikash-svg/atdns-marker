const express = require('express');
const AttendanceData = require('../models/AttendanceData');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// ---------- GET current user's data ----------
router.get('/', requireAuth, async (req, res) => {
  try {
    const doc = await AttendanceData.findOne({ user: req.userId });
    if (!doc) {
      return res.json({ data: null }); // no data synced yet
    }
    res.json({ data: doc.data, updatedAt: doc.updatedAt });
  } catch (err) {
    console.error('[data/get]', err);
    res.status(500).json({ error: 'Could not load your data.' });
  }
});

// ---------- Save/overwrite current user's data ----------
router.put('/', requireAuth, async (req, res) => {
  try {
    const { data } = req.body || {};
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Request must include a "data" object.' });
    }

    const doc = await AttendanceData.findOneAndUpdate(
      { user: req.userId },
      { data },
      { new: true, upsert: true }
    );

    res.json({ data: doc.data, updatedAt: doc.updatedAt });
  } catch (err) {
    console.error('[data/put]', err);
    res.status(500).json({ error: 'Could not save your data.' });
  }
});

module.exports = router;
