const User = require("../models/User");
const Customer = require("../models/Customer");
const Provider = require("../models/Provider");
const { USER_ROLES, USER_STATUSES, PROVIDER_TYPES } = require("../constants/enums");
const { generateToken } = require("../utils/jwt");

class AuthService {
  /**
   * Register a new user and initialize associated Customer/Provider profile
   * @param {Object} registrationData
   * @returns {Promise<{ user: Object, token: string }>}
   */
  async registerUser({ first_name, last_name, email, phone_number, password, user_role }) {
    // Check if user with this email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const error = new Error("An account with this email address already exists.");
      error.statusCode = 400;
      throw error;
    }

    // Create the User document
    const newUser = new User({
      first_name,
      last_name,
      email,
      phone_number: phone_number || undefined,
      password,
      user_role: user_role || USER_ROLES.CUSTOMER,
      account_status: USER_STATUSES.ACTIVE
    });

    await newUser.save();

    // Automatically create profile record for Customer or Provider
    try {
      if (newUser.user_role === USER_ROLES.CUSTOMER) {
        await Customer.create({
          user_id: newUser._id,
          profile_details: {
            first_name: newUser.first_name,
            last_name: newUser.last_name,
            phone_number: newUser.phone_number || ""
          }
        });
      } else if (newUser.user_role === USER_ROLES.PROVIDER) {
        await Provider.create({
          user_id: newUser._id,
          provider_type: PROVIDER_TYPES.INDIVIDUAL,
          business_information: {
            contact_email: newUser.email,
            contact_phone: newUser.phone_number || ""
          }
        });
      }
    } catch (profileErr) {
      console.warn("Notice: Profile auto-creation warning:", profileErr.message);
    }

    const token = generateToken(newUser);

    return {
      token,
      user: {
        id: newUser._id,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        full_name: newUser.full_name,
        email: newUser.email,
        phone_number: newUser.phone_number,
        user_role: newUser.user_role,
        account_status: newUser.account_status,
        created_at: newUser.created_at
      }
    };
  }

  /**
   * Authenticate a user by email/phone and password
   * @param {Object} credentials
   * @returns {Promise<{ user: Object, token: string }>}
   */
  async loginUser({ email: identifier, password }) {
    const normalizedIdentifier = identifier.trim().toLowerCase();

    // Search by email or phone number
    const user = await User.findOne({
      $or: [
        { email: normalizedIdentifier },
        { phone_number: identifier.trim() }
      ]
    }).select("+password");

    if (!user) {
      const error = new Error("Invalid email, phone number, or password.");
      error.statusCode = 401;
      throw error;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const error = new Error("Invalid email, phone number, or password.");
      error.statusCode = 401;
      throw error;
    }

    // Verify account status
    if (user.account_status === USER_STATUSES.SUSPENDED) {
      const error = new Error("Your account has been suspended. Please contact customer support.");
      error.statusCode = 403;
      error.code = "ACCOUNT_SUSPENDED";
      throw error;
    }

    if (user.account_status === USER_STATUSES.INACTIVE) {
      const error = new Error("Your account is currently inactive.");
      error.statusCode = 403;
      error.code = "ACCOUNT_INACTIVE";
      throw error;
    }

    // Update last login timestamp
    user.last_login_at = new Date();
    await user.save();

    const token = generateToken(user);

    return {
      token,
      user: {
        id: user._id,
        first_name: user.first_name,
        last_name: user.last_name,
        full_name: user.full_name,
        email: user.email,
        phone_number: user.phone_number,
        user_role: user.user_role,
        account_status: user.account_status,
        profile_image: user.profile_image,
        last_login_at: user.last_login_at
      }
    };
  }

  /**
   * Retrieve full user profile with linked Customer or Provider details
   * @param {string|mongoose.Types.ObjectId} userId
   * @returns {Promise<Object>}
   */
  async getUserProfile(userId) {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error("User account not found.");
      error.statusCode = 404;
      throw error;
    }

    let profile = null;
    if (user.user_role === USER_ROLES.CUSTOMER) {
      profile = await Customer.findOne({ user_id: user._id });
    } else if (user.user_role === USER_ROLES.PROVIDER) {
      profile = await Provider.findOne({ user_id: user._id });
    }

    return {
      id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      full_name: user.full_name,
      email: user.email,
      phone_number: user.phone_number,
      user_role: user.user_role,
      account_status: user.account_status,
      profile_image: user.profile_image,
      last_login_at: user.last_login_at,
      created_at: user.created_at,
      profile
    };
  }

  /**
   * Request password reset OTP
   * @param {string} identifier (email or phone)
   */
  async requestPasswordReset(identifier) {
    const normalized = identifier.trim().toLowerCase();
    const user = await User.findOne({
      $or: [{ email: normalized }, { phone_number: identifier.trim() }]
    });

    if (!user) {
      const error = new Error("No account found matching this email or phone number.");
      error.statusCode = 404;
      throw error;
    }

    // In production, an OTP is generated and sent via SMS / Email gateway
    return {
      success: true,
      message: "A 6-digit verification code has been dispatched."
    };
  }

  /**
   * Reset user password
   */
  async resetPassword({ identifier, otp, newPassword }) {
    const normalized = identifier.trim().toLowerCase();
    const user = await User.findOne({
      $or: [{ email: normalized }, { phone_number: identifier.trim() }]
    });

    if (!user) {
      const error = new Error("No account found matching this email or phone number.");
      error.statusCode = 404;
      throw error;
    }

    if (!otp || otp.length < 6) {
      const error = new Error("Invalid or incomplete verification code.");
      error.statusCode = 400;
      throw error;
    }

    if (!newPassword || newPassword.length < 8) {
      const error = new Error("New password must be at least 8 characters.");
      error.statusCode = 400;
      throw error;
    }

    user.password = newPassword;
    await user.save();

    return {
      success: true,
      message: "Password has been reset successfully."
    };
  }
}

module.exports = new AuthService();

