function sendError(res, err) {
  if (err.statusCode) {
    return res.status(err.statusCode).json({ success: false, message: err.message, details: err.details });
  }
  if (err.code === 11000) {
    return res.status(409).json({ success: false, message: "A record with the same unique value already exists" });
  }
  if (err.name === "ValidationError") {
    const details = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
    return res.status(400).json({ success: false, message: "Validation failed", details });
  }
  if (err.name === "CastError") {
    return res.status(400).json({ success: false, message: "Invalid id" });
  }
  console.error("[catalogue]", err);
  return res.status(500).json({ success: false, message: "Something went wrong" });
}

module.exports = { sendError };