const express = require('express');
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

module.exports = router;
