const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "serviq_dev_secret_key_2026_super_secure";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

/**
 * Generate a JWT token for a user
 * @param {Object} user - User document or payload object
 * @returns {string} Signed JWT token
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user._id || user.id,
      email: user.email,
      role: user.user_role || user.role,
      status: user.account_status || user.status
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN
    }
  );
}

/**
 * Verify a JWT token
 * @param {string} token - JWT token string
 * @returns {Object} Decoded payload
 */
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = {
  generateToken,
  verifyToken
};
