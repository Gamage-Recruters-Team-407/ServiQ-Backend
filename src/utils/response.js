// Standard API response envelope: { success, data, meta?, message? }
// The frontend `useApi` hook reads `data` and `meta` from this shape.
const ok = (res, data, meta = null, status = 200) =>
  res.status(status).json({ success: true, data, ...(meta ? { meta } : {}) });

const created = (res, data) => ok(res, data, null, 201);

module.exports = { ok, created };
