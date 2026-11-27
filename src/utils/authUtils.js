const jwt = require("jsonwebtoken");

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not configured");
  }
  return secret;
}

function signAccessToken(user, { rememberMe = false } = {}) {
  const expiresIn = rememberMe
    ? "30d"
    : process.env.JWT_EXPIRES_IN || "1d";

  return jwt.sign(
    {
      sub: String(user._id || user.id),
      role: user.user_role || user.role,
      email: user.email
    },
    getJwtSecret(),
    { expiresIn }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, getJwtSecret());
}

class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  AppError
};
