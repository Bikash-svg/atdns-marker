require('dotenv').config();

const express = require('express');
const cors = require('cors');

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');
const healthRoutes = require('./routes/health');

const app = express();

// ---- Middleware ----
app.use(express.json({ limit: '2mb' })); // attendance history can grow; keep a sane cap

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (mobile apps, curl, health monitors)
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
  })
);

// ---- Routes ----
app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/health', healthRoutes);

app.get('/', (req, res) => {
  res.send('Attendance Calculator API is running.');
});

// ---- 404 fallback ----
app.use((req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// ---- Error handler ----
app.use((err, req, res, next) => {
  console.error('[unhandled]', err);
  res.status(500).json({ error: 'Server error.' });
});

// ---- Start ----
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`[server] Listening on port ${PORT}`);
  });
});
