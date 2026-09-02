const mongoose = require('mongoose');

// NOTE: Password is stored as plain text, by explicit request.
// This is not a secure practice for production apps handling real users —
// anyone with database access (or a DB leak) can read passwords directly.
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    resetToken: {
      type: String,
      default: null,
    },
    resetTokenExpiry: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
