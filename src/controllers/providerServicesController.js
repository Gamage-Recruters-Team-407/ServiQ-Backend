const mongoose = require("mongoose");

const providerServices = require("../services/providerServicesService");

const {
  createServiceSchema,
  updateServiceSchema,
  statusSchema
} = require("../validations/providerServicesValidation");

function errorResponse(res, error) {
  const status = error.statusCode ||
    (
      error.name === "ValidationError" ||
      error.name === "CastError"
        ? 400
        : 500
    );

  if (status === 500) {
    console.error("Provider Services:", error);
  }

  return res.status(status).json({
    success: false,
    message: status === 500
      ? "Internal server error"
      : error.message
  });
}

function bodyOr400(res, schema, body) {
  const result = schema.safeParse(body);

  if (!result.success) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message
      }))
    });

    return null;
  }

  return result.data;
}

function validServiceId(req, res) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    res.status(400).json({
      success: false,
      message: "Invalid service ID"
    });

    return false;
  }

  return true;
}

async function list(req, res) {
  try {
    const services = await providerServices.list(req.user);

    return res.status(200).json({
      success: true,
      count: services.length,
      data: services
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

async function create(req, res) {
  const data = bodyOr400(res, createServiceSchema, req.body);

  if (!data) return;

  try {
    const service = await providerServices.create(req.user, data);

    return res.status(201).json({
      success: true,
      message: "Service created",
      data: service
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

async function update(req, res) {
  if (!validServiceId(req, res)) return;

  const changes = bodyOr400(
    res,
    updateServiceSchema,
    req.body
  );

  if (!changes) return;

  try {
    const service = await providerServices.update(
      req.user,
      req.params.id,
      changes
    );

    return res.status(200).json({
      success: true,
      message: "Service updated",
      data: service
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

async function changeStatus(req, res) {
  if (!validServiceId(req, res)) return;

  const data = bodyOr400(res, statusSchema, req.body);

  if (!data) return;

  try {
    const service = await providerServices.changeStatus(
      req.user,
      req.params.id,
      data.status
    );

    return res.status(200).json({
      success: true,
      message: "Service status updated",
      data: service
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

module.exports = {
  list,
  create,
  update,
  changeStatus
};