const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Customer = require("../models/Customer");
const Provider = require("../models/Provider");
const {
  USER_ROLES,
  USER_STATUSES,
  PROVIDER_TYPES
} = require("../constants/enums");
const { AppError, signAccessToken } = require("../utils/authUtils");
const { defaultResetStore } = require("./passwordResetStore");

const BCRYPT_ROUNDS = 12;

function sanitizeUser(userDoc) {
  if (!userDoc) return null;
  const plain =
    typeof userDoc.toObject === "function" ? userDoc.toObject() : { ...userDoc };
  delete plain.password;
  delete plain.__v;
  return {
    id: String(plain._id || plain.id),
    _id: plain._id || plain.id,
    first_name: plain.first_name,
    last_name: plain.last_name,
    full_name:
      plain.full_name ||
      `${plain.first_name || ""} ${plain.last_name || ""}`.trim(),
    email: plain.email,
    phone_number: plain.phone_number || null,
    user_role: plain.user_role,
    role: plain.user_role,
    account_status: plain.account_status,
    profile_image: plain.profile_image || null,
    is_email_verified: Boolean(plain.is_email_verified),
    is_phone_verified: Boolean(plain.is_phone_verified),
    last_login_at: plain.last_login_at || null,
    created_at: plain.created_at || null
  };
}

function buildIdentifierQuery({ identifier, email, phone_number }) {
  const raw = (identifier || email || phone_number || "").trim();
  if (!raw) return null;
  if (raw.includes("@")) {
    return { email: raw.toLowerCase() };
  }
  return { phone_number: raw };
}

function createAuthService({
  UserModel = User,
  CustomerModel = Customer,
  ProviderModel = Provider,
  resetStore = defaultResetStore,
  hashPassword = (pw) => bcrypt.hash(pw, BCRYPT_ROUNDS),
  comparePassword = (pw, hash) => bcrypt.compare(pw, hash),
  generateToken = signAccessToken,
  generateOtp = () => String(crypto.randomInt(100000, 1000000))
} = {}) {
  async function ensureRoleProfile(user, providerType) {
    if (user.user_role === USER_ROLES.CUSTOMER) {
      await CustomerModel.findOneAndUpdate(
        { user_id: user._id },
        {
          $setOnInsert: {
            user_id: user._id,
            profile_details: {
              first_name: user.first_name,
              last_name: user.last_name,
              phone_number: user.phone_number || undefined
            }
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } else if (user.user_role === USER_ROLES.PROVIDER) {
      await ProviderModel.findOneAndUpdate(
        { user_id: user._id },
        {
          $setOnInsert: {
            user_id: user._id,
            provider_type: providerType || PROVIDER_TYPES.INDIVIDUAL
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
  }

  async function registerUser(input) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const normalizedPhone = input.phone_number ? input.phone_number.trim() : "";

    const existingEmail = await UserModel.findOne({ email: normalizedEmail });
    if (existingEmail) {
      throw new AppError(
        "An account with this email address already exists.",
        409,
        "DUPLICATE_EMAIL"
      );
    }

    if (normalizedPhone) {
      const existingPhone = await UserModel.findOne({ phone_number: normalizedPhone });
      if (existingPhone) {
        throw new AppError(
          "An account with this phone number already exists.",
          409,
          "DUPLICATE_PHONE"
        );
      }
    }

    const passwordHash = await hashPassword(input.password);
    const assignedRole =
      input.user_role === USER_ROLES.PROVIDER
        ? USER_ROLES.PROVIDER
        : USER_ROLES.CUSTOMER;

    const user = await UserModel.create({
      first_name: input.first_name.trim(),
      last_name: input.last_name.trim(),
      email: normalizedEmail,
      phone_number: normalizedPhone || undefined,
      password: passwordHash,
      user_role: assignedRole,
      account_status: USER_STATUSES.ACTIVE
    });

    await ensureRoleProfile(user, input.provider_type);

    const token = generateToken(user);
    return {
      user: sanitizeUser(user),
      token
    };
  }

  async function loginUser(input) {
    const query = buildIdentifierQuery(input);
    if (!query) {
      throw new AppError("Email or phone number is required.", 400, "MISSING_IDENTIFIER");
    }

    const user = await UserModel.findOne(query).select("+password");
    if (!user) {
      throw new AppError("Invalid email/phone or password.", 401, "INVALID_CREDENTIALS");
    }

    const isPasswordValid = await comparePassword(input.password, user.password);
    if (!isPasswordValid) {
      throw new AppError("Invalid email/phone or password.", 401, "INVALID_CREDENTIALS");
    }

    if (user.account_status === USER_STATUSES.PENDING_VERIFICATION) {
      throw new AppError(
        "Your account is pending verification. Please complete verification to sign in.",
        403,
        "ACCOUNT_PENDING_VERIFICATION"
      );
    }

    if (user.account_status !== USER_STATUSES.ACTIVE) {
      throw new AppError(
        `Access denied: Your account is currently ${user.account_status}. Please contact support@serviq.lk.`,
        403,
        "ACCOUNT_RESTRICTED"
      );
    }

    user.last_login_at = new Date();
    await user.save();

    const token = generateToken(user, { rememberMe: Boolean(input.remember_me) });
    return {
      user: sanitizeUser(user),
      token
    };
  }

  async function getCurrentUserProfile(user) {
    const sanitized = sanitizeUser(user);
    if (!sanitized) return null;

    let profile = null;
    if (user.user_role === USER_ROLES.CUSTOMER) {
      profile = await CustomerModel.findOne({ user_id: user._id });
    } else if (user.user_role === USER_ROLES.PROVIDER) {
      profile = await ProviderModel.findOne({ user_id: user._id });
    }

    return {
      user: sanitized,
      profile: profile || null
    };
  }

  async function requestPasswordReset(input) {
    const query = buildIdentifierQuery(input);
    if (!query) {
      throw new AppError(
        "Registered email or phone number is required.",
        400,
        "MISSING_IDENTIFIER"
      );
    }

    const user = await UserModel.findOne(query);
    if (
      user &&
      ![USER_STATUSES.SUSPENDED, USER_STATUSES.RESTRICTED].includes(
        user.account_status
      )
    ) {
      const otp = generateOtp();
      await resetStore.saveOtp(user._id, otp);

      if (
        process.env.NODE_ENV !== "production" &&
        process.env.NODE_ENV !== "test"
      ) {
        console.info(`[ServiQ Auth] Password reset OTP for ${user.email}: ${otp}`);
      }
    }

    return {
      message:
        "If a matching account exists, a 6-digit verification code has been sent."
    };
  }

  async function verifyResetOtp(input) {
    const query = buildIdentifierQuery(input);
    const user = query ? await UserModel.findOne(query) : null;
    if (!user) {
      throw new AppError("Invalid or expired verification code.", 400, "INVALID_OTP");
    }

    const result = await resetStore.verifyOtp(user._id, input.otp, { consume: false });
    if (!result.valid) {
      const msg =
        result.reason === "TOO_MANY_ATTEMPTS"
          ? "Too many invalid attempts. Please request a new verification code."
          : result.reason === "EXPIRED"
          ? "Verification code has expired. Please request a new one."
          : "Invalid verification code.";
      throw new AppError(msg, 400, "INVALID_OTP");
    }

    return {
      verified: true,
      message: "Verification code confirmed."
    };
  }

  async function resetPassword(input) {
    const query = buildIdentifierQuery(input);
    const user = query ? await UserModel.findOne(query) : null;
    if (!user) {
      throw new AppError("Invalid or expired verification code.", 400, "INVALID_OTP");
    }

    const result = await resetStore.verifyOtp(user._id, input.otp, { consume: true });
    if (!result.valid) {
      const msg =
        result.reason === "TOO_MANY_ATTEMPTS"
          ? "Too many invalid attempts. Please request a new verification code."
          : result.reason === "EXPIRED"
          ? "Verification code has expired. Please request a new one."
          : "Invalid verification code.";
      throw new AppError(msg, 400, "INVALID_OTP");
    }

    user.password = await hashPassword(input.new_password);
    await user.save();

    return {
      message: "Password reset successfully. You can now sign in with your new password."
    };
  }

  return {
    registerUser,
    loginUser,
    getCurrentUserProfile,
    requestPasswordReset,
    verifyResetOtp,
    resetPassword
  };
}

const authService = createAuthService();

module.exports = {
  createAuthService,
  authService,
  sanitizeUser,
  buildIdentifierQuery
};
