
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    Name: {
      type: String,
      required: true,
      trim: true,
    },

    Email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    Phone: {
      type: Number,
      required: true,
    },

    PasswordHash: {
      type: String,
      required: true,
    },

    Role: {
      type: String,
      enum: ["customer", "supportAgent", "admin"],
      default: "customer",
    },

    AgentRole: {
      type: String,
      enum: ["support", "general"],
      default: "general",
    },

    IsVerified: {
      type: Boolean,
      default: false,
    },

    OtpHash: {
      type: String,
      default: null,
    },

    OtpPurpose: {
      type: String,
      enum: ["login", "reset-password", null],
      default: null,
    },

    OtpExpiresAt: {
      type: Date,
      default: null,
    },

    RefreshToken: {
      type: String,
      default: null,
    },

    PendingEmail: {
      type: String,
      default: null,
      lowercase: true,
    },

    EmailOtpHash: {
      type: String,
      default: null,
    },

    EmailOtpExpiresAt: {
      type: Date,
      default: null,
    },

    EmailOtpAttempts: {
      type: Number,
      default: 0,
    },

    Status: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// INDEXES

// Role + Status filtering
userSchema.index({ Role: 1, Status: 1 });

// Agent filtering
userSchema.index({ AgentRole: 1 });

// Email verification filtering
userSchema.index({ IsVerified: 1 });

// Latest users sorting
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model("USER", userSchema);
