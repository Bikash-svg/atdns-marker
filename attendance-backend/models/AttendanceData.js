const mongoose = require('mongoose');

// Stores the entire app state (schedule, records, extras, startDate) as one
// flexible blob per user, mirroring the shape already used in localStorage.
// Using Mixed keeps this in sync with the frontend without needing to
// duplicate/maintain a rigid schema for every field the app tracks.
const attendanceDataSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AttendanceData', attendanceDataSchema);
