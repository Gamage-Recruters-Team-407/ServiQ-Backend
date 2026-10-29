const mongoose = require("mongoose");

const providerServices = require("../services/providerServicesService");

const {
  createServiceSchema,
  updateServiceSchema,
  statusSchema
} = require("../validations/providerServicesValidation");

function errorResponse(res, error) {
  const status = error.statusCode || (
    [
      "ValidationError",
      "CastError",
      "StrictModeError"
    ].includes(error.name) ? 400 : 500
  );

  if (status === 500) {
    console.error("[Dev05 Provider Services]", error);
  }

  return res.status(status).json({
    success: false,
    message: status === 500
      ? "Internal server error"
      : error.message
  });
}

function validatedBody(res, schema, body) {
  const result = schema.safeParse(body);

  if (result.success) {
    return result.data;
  }

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

function validId(req, res) {
  if (mongoose.isObjectIdOrHexString(req.params.id)) {
    return true;
  }

  res.status(400).json({
    success: false,
    message: "Invalid service ID"
  });

  return false;
}

// GET ALL SERVICES
async function list(req, res) {
  try {
    const data = await providerServices.list(req.user);

    return res.status(200).json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

// GET SINGLE SERVICE
async function getById(req, res) {
  if (!validId(req, res)) return;

  try {
    const data = await providerServices.getById(
      req.user,
      req.params.id
    );

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

// CREATE SERVICE
async function create(req, res) {
  const data = validatedBody(
    res,
    createServiceSchema,
    req.body
  );

  if (!data) return;

  try {
    const created = await providerServices.create(
      req.user,
      data
    );

    return res.status(201).json({
      success: true,
      message: "Service created",
      data: created
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

// UPDATE SERVICE
async function update(req, res) {
  if (!validId(req, res)) return;

  const data = validatedBody(
    res,
    updateServiceSchema,
    req.body
  );

  if (!data) return;

  try {
    const updated = await providerServices.update(
      req.user,
      req.params.id,
      data
    );

    return res.status(200).json({
      success: true,
      message: "Service updated",
      data: updated
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

// CHANGE STATUS
async function changeStatus(req, res) {
  if (!validId(req, res)) return;

  const data = validatedBody(
    res,
    statusSchema,
    req.body
  );

  if (!data) return;

  try {
    const updated = await providerServices.changeStatus(
      req.user,
      req.params.id,
      data.status
    );

    return res.status(200).json({
      success: true,
      message: "Status updated",
      data: updated
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

// RESTORE ARCHIVED SERVICE
async function restore(req, res) {
  if (!validId(req, res)) return;

  try {
    const data = await providerServices.restore(
      req.user,
      req.params.id
    );

    return res.status(200).json({
      success: true,
      message: "Service restored as Inactive",
      data
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

// PERMANENT DELETE
async function remove(req, res) {
  if (!validId(req, res)) return;

  try {
    const deleted = await providerServices.remove(
      req.user,
      req.params.id
    );

    return res.status(200).json({
      success: true,
      message: "Service permanently deleted",
      data: {
        _id: deleted._id,
        name: deleted.name
      }
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

module.exports = {
  list,
  getById,
  create,
  update,
  changeStatus,
  restore,
  remove
};