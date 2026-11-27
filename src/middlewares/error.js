const mongoose = require("mongoose");
const { ZodError } = require("zod");
const AppError = require("../utils/AppError");

const notFound = (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, "ROUTE_NOT_FOUND"));
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let error = err;

  if (err instanceof ZodError) {
    error = new AppError(
      "Validation failed",
      400,
      "VALIDATION_ERROR",
      err.issues.map((i) => ({ field: i.path.join("."), message: i.message }))
    );
  } else if (err instanceof mongoose.Error.CastError) {
    error = new AppError(`Invalid ${err.path}`, 400, "INVALID_ID");
  } else if (err instanceof mongoose.Error.ValidationError) {
    error = new AppError("Validation failed", 400, "VALIDATION_ERROR", Object.values(err.errors).map((e) => ({ field: e.path, message: e.message })));
  } else if (err?.code === 11000) {
    error = new AppError("Duplicate record", 409, "DUPLICATE_RECORD");
  } else if (err?.type === "entity.parse.failed") {
    error = new AppError("Malformed JSON body", 400, "INVALID_JSON");
  }

  const status = error.statusCode || 500;
  if (status >= 500) console.error(err);

  res.status(status).json({
    success: false,
    message: status >= 500 && !error.isOperational ? "Internal server error" : error.message,
    code: error.code || "INTERNAL_ERROR",
    ...(error.details ? { details: error.details } : {})
  });
};

module.exports = { notFound, errorHandler };
