function createRateLimiter({
  windowMs = 15 * 60 * 1000,
  maxRequests = 20,
  message = "Too many attempts. Please wait a few minutes and try again.",
  keyGenerator
} = {}) {
  const hits = new Map();

  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits.entries()) {
      if (entry.resetAt <= now) {
        hits.delete(key);
      }
    }
  }, windowMs);

  if (typeof cleanupInterval.unref === "function") {
    cleanupInterval.unref();
  }

  return function rateLimitMiddleware(req, res, next) {
    const now = Date.now();
    const key = keyGenerator
      ? keyGenerator(req)
      : `${req.ip || req.socket?.remoteAddress || "unknown"}:${req.path}`;

    const existing = hits.get(key);
    if (!existing || existing.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    existing.count += 1;
    if (existing.count > maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({
        success: false,
        code: "RATE_LIMIT_EXCEEDED",
        message
      });
    }

    return next();
  };
}

module.exports = { createRateLimiter };
