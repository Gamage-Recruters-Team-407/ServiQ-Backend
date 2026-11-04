const { listQuerySchema, idParamSchema } = require("../validations/payment.validation");
const paymentService = require("../services/payment.service");

// Customer: own payments only
exports.getMyPayments = async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.issues });
  }

  // req.user.id = logged-in User id (set by Dev 01's auth). Find the Customer from it.
  const customerId = await paymentService.findCustomerIdByUserId(req.user.id);
  if (!customerId) {
    return res.status(404).json({ success: false, message: "Customer profile not found" });
  }

  const result = await paymentService.listPayments(
    { ...parsed.data, customerId: undefined },
    { customer_id: customerId }
  );
  res.json({ success: true, data: result.items, pagination: result.pagination });
};

// Admin: all payments with filters
exports.getAllPayments = async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.issues });
  }
  const result = await paymentService.listPayments(parsed.data);
  res.json({ success: true, data: result.items, pagination: result.pagination });
};

// Admin: one transaction
exports.getPaymentDetails = async (req, res) => {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: "Invalid payment id" });
  }
  const payment = await paymentService.getPaymentById(parsed.data.id);
  if (!payment) {
    return res.status(404).json({ success: false, message: "Payment not found" });
  }
  res.json({ success: true, data: payment });
};