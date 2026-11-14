
"use strict";

// TEMPORARY: provider-ID-based access for LOCAL DEVELOPMENT ONLY.
// Do not deploy or merge this testing bypass into production.
const LOCAL_ADDRESSES = new Set([
  "127.0.0.1",
  "::1",
  "::ffff:127.0.0.1"
]);

function requireLocalProfileTesting(req, res, next) {
  const address = req.socket?.remoteAddress;

  if (
    process.env.NODE_ENV === "production" ||
    !LOCAL_ADDRESSES.has(address)
  ) {
    return res.status(403).json({
      success: false,
      message: "This temporary profile API is available only on localhost"
    });
  }

  return next();
}

module.exports = { requireLocalProfileTesting };
