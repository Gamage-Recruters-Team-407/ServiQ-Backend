const service = require("../services/paymentAdminService");
const {
  listPaymentsQuerySchema,
  idParamSchema
} = require("../validations/paymentAdminValidation");
const { USER_ROLES } = require("../constants/enums");

function validationError(res, error) {
  return res.status(400).json({
    success: false,
    message: "Validation failed",
    errors: error.issues.map((i) => ({ field: i.path.join("."), message: i.message }))
  });
}

function serverError(res, error) {
  console.error("Payment admin error:", error);
  return res.status(500).json({ success: false, message: "Internal server error" });
}

// GET /api/payments  (customer: own payments, admin: all)
async function listMyPayments(req, res) {
  try {
    const parsed = listPaymentsQuerySchema.safeParse(req.query);
    if (!parsed.success) return validationError(res, parsed.error);

    let scope = {};
    if (req.user.role === USER_ROLES.CUSTOMER) {
      if (!req.user.customerId) {
        return res.status(400).json({ success: false, message: "Customer profile not found" });
      }
      scope = { customerId: req.user.customerId };
    }

    const { items, pagination } = await service.listPayments(parsed.data, scope);
    return res.json({ success: true, data: items, pagination });
  } catch (error) {
    return serverError(res, error);
  }
}

// GET /api/admin/payments
async function adminListPayments(req, res) {
  try {
    const parsed = listPaymentsQuerySchema.safeParse(req.query);
    if (!parsed.success) return validationError(res, parsed.error);

    const { items, pagination } = await service.listPayments(parsed.data);
    return res.json({ success: true, data: items, pagination });
  } catch (error) {
    return serverError(res, error);
  }
}

// GET /api/admin/payments/:id
async function adminGetPayment(req, res) {
  try {
    const parsed = idParamSchema.safeParse(req.params);
    if (!parsed.success) return validationError(res, parsed.error);

    const payment = await service.getPaymentById(parsed.data.id);
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }
    return res.json({ success: true, data: payment });
  } catch (error) {
    return serverError(res, error);
  }
}

module.exports = { listMyPayments, adminListPayments, adminGetPayment };