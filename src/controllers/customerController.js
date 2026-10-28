const customerService = require("../services/customerService");
const {
  updateProfileSchema,
  updateSettingsSchema,
  customerIdParamSchema
} = require("../validations/customerValidation");

/**
 * Get current customer profile
 * Route: GET /api/customers/me
 */
async function getMyProfile(req, res) {
  try {
    const customer = await customerService.getProfileByUserId(req.user._id);

    return res.status(200).json({
      success: true,
      message: "Customer profile retrieved successfully.",
      data: {
        customer
      }
    });
  } catch (error) {
    console.error("Get Customer Profile Error:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to retrieve customer profile.",
      details: error.details
    });
  }
}

/**
 * Update current customer profile details & address
 * Route: PATCH /api/customers/me
 */
async function updateMyProfile(req, res) {
  try {
    const parseResult = updateProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues
        ? parseResult.error.issues[0].message
        : "Validation failed";
      return res.status(400).json({
        success: false,
        message: errorMessage,
        errors: parseResult.error.issues
      });
    }

    const updatedCustomer = await customerService.updateProfile(
      req.user._id,
      parseResult.data
    );

    return res.status(200).json({
      success: true,
      message: "Customer profile updated successfully.",
      data: {
        customer: updatedCustomer
      }
    });
  } catch (error) {
    console.error("Update Customer Profile Error:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to update customer profile.",
      details: error.details
    });
  }
}

/**
 * Update current customer settings and preferences
 * Route: PATCH /api/customers/me/settings
 */
async function updateMySettings(req, res) {
  try {
    const parseResult = updateSettingsSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues
        ? parseResult.error.issues[0].message
        : "Validation failed";
      return res.status(400).json({
        success: false,
        message: errorMessage,
        errors: parseResult.error.issues
      });
    }

    const updatedCustomer = await customerService.updateSettings(
      req.user._id,
      parseResult.data
    );

    return res.status(200).json({
      success: true,
      message: "Customer settings updated successfully.",
      data: {
        customer: updatedCustomer
      }
    });
  } catch (error) {
    console.error("Update Customer Settings Error:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to update customer settings.",
      details: error.details
    });
  }
}

/**
 * Look up a customer by customer ID (Admin or authorized lookup)
 * Route: GET /api/customers/:id
 */
async function getCustomerById(req, res) {
  try {
    const paramResult = customerIdParamSchema.safeParse(req.params);
    if (!paramResult.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID format.",
        errors: paramResult.error.issues
      });
    }

    const customer = await customerService.getCustomerById(
      paramResult.data.id,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Customer details retrieved successfully.",
      data: {
        customer
      }
    });
  } catch (error) {
    console.error("Get Customer By ID Error:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to retrieve customer details.",
      details: error.details
    });
  }
}

module.exports = {
  getMyProfile,
  updateMyProfile,
  updateMySettings,
  getCustomerById
};
