function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    code: "NOT_FOUND",
    message: "Requested endpoint not found"
  });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.statusCode || 500;
  let code = err.code || "INTERNAL_ERROR";
  let message = err.message || "An unexpected error occurred";

  // Handle MongoDB duplicate key errors cleanly without exposing DB internals
  if (err.code === 11000) {
    statusCode = 409;
    code = "DUPLICATE_RESOURCE";
    message = "An account with this email or identifier already exists.";
  } else if (err.name === "ValidationError") {
    statusCode = 400;
    code = "VALIDATION_ERROR";
  } else if (err.name === "CastError") {
    statusCode = 400;
    code = "INVALID_IDENTIFIER";
    message = "Invalid identifier format.";
  }

  if (statusCode >= 500) {
    console.error("Unhandled server error:", err.message);
    message = "Internal server error. Please try again later.";
  }

  return res.status(statusCode).json({
    success: false,
    code,
    message
  });
}

module.exports = {
  notFoundHandler,
  errorHandler
};
