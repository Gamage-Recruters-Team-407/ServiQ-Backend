const crypto = require("node:crypto");
const mongoose = require("mongoose");

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

const passwordResetOtpSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    otp_hash: {
      type: String,
      required: true
    },
    attempts: {
      type: Number,
      default: 0
    },
    expires_at: {
      type: Date,
      required: true,
      index: { expires: 0 }
    }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
  }
);

const PasswordResetOtpModel =
  mongoose.models.PasswordResetOtp ||
  mongoose.model("PasswordResetOtp", passwordResetOtpSchema);

function hashOtp(userId, otp) {
  const pepper = process.env.JWT_SECRET || "serviq-otp-salt";
  return crypto
    .createHmac("sha256", pepper)
    .update(`${String(userId)}:${String(otp)}`)
    .digest("hex");
}

function createPasswordResetStore({ memoryOnly = false } = {}) {
  const memoryMap = new Map();

  const useDb = () => !memoryOnly && mongoose.connection.readyState === 1;

  async function saveOtp(userId, otp) {
    const key = String(userId);
    const otpHash = hashOtp(key, otp);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    if (useDb()) {
      await PasswordResetOtpModel.deleteMany({ user_id: userId });
      await PasswordResetOtpModel.create({
        user_id: userId,
        otp_hash: otpHash,
        attempts: 0,
        expires_at: expiresAt
      });
      return { expiresAt };
    }

    memoryMap.set(key, {
      user_id: key,
      otp_hash: otpHash,
      attempts: 0,
      expires_at: expiresAt
    });
    return { expiresAt };
  }

  async function verifyOtp(userId, otp, { consume = false } = {}) {
    const key = String(userId);
    const candidateHash = hashOtp(key, otp);

    if (useDb()) {
      const record = await PasswordResetOtpModel.findOne({ user_id: userId });
      if (!record) {
        return { valid: false, reason: "NOT_FOUND" };
      }
      if (record.expires_at.getTime() <= Date.now()) {
        await PasswordResetOtpModel.deleteOne({ _id: record._id });
        return { valid: false, reason: "EXPIRED" };
      }
      if (record.attempts >= MAX_OTP_ATTEMPTS) {
        await PasswordResetOtpModel.deleteOne({ _id: record._id });
        return { valid: false, reason: "TOO_MANY_ATTEMPTS" };
      }

      const matches = crypto.timingSafeEqual(
        Buffer.from(record.otp_hash, "hex"),
        Buffer.from(candidateHash, "hex")
      );

      if (!matches) {
        record.attempts += 1;
        if (record.attempts >= MAX_OTP_ATTEMPTS) {
          await PasswordResetOtpModel.deleteOne({ _id: record._id });
          return { valid: false, reason: "TOO_MANY_ATTEMPTS" };
        }
        await record.save();
        return { valid: false, reason: "MISMATCH" };
      }

      if (consume) {
        await PasswordResetOtpModel.deleteOne({ _id: record._id });
      }
      return { valid: true };
    }

    const record = memoryMap.get(key);
    if (!record) {
      return { valid: false, reason: "NOT_FOUND" };
    }
    if (record.expires_at.getTime() <= Date.now()) {
      memoryMap.delete(key);
      return { valid: false, reason: "EXPIRED" };
    }
    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      memoryMap.delete(key);
      return { valid: false, reason: "TOO_MANY_ATTEMPTS" };
    }

    const matches = crypto.timingSafeEqual(
      Buffer.from(record.otp_hash, "hex"),
      Buffer.from(candidateHash, "hex")
    );

    if (!matches) {
      record.attempts += 1;
      if (record.attempts >= MAX_OTP_ATTEMPTS) {
        memoryMap.delete(key);
        return { valid: false, reason: "TOO_MANY_ATTEMPTS" };
      }
      return { valid: false, reason: "MISMATCH" };
    }

    if (consume) {
      memoryMap.delete(key);
    }
    return { valid: true };
  }

  return {
    saveOtp,
    verifyOtp
  };
}

const defaultResetStore = createPasswordResetStore();

module.exports = {
  createPasswordResetStore,
  defaultResetStore
};
