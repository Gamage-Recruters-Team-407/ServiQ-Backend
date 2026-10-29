const { ZodError } = require("zod");
const service = require("../services/payout.service");
const {
  createPayoutSchema,
  listQuerySchema,
  updateStatusSchema,
} = require("../validations/payout.validation");

const ok = (res, data, message, status = 200) =>
  res.status(status).json({ success: true, message, data });

// Common error handling for all handlers (validation, business rule, and unexpected errors).
function handle(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: err.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
        });
      }
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      console.error("Payout error:", err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  };
}

const createPayout = handle(async (req, res) => {
  const input = createPayoutSchema.parse(req.body);
  const payout = await service.createPayout(req.user.provider_id, input);
  ok(res, payout, "Payout request created", 201);
});

const getMyPayouts = handle(async (req, res) => {
  const query = listQuerySchema.parse(req.query);
  ok(res, await service.listProviderPayouts(req.user.provider_id, query), "Payouts fetched");
});

const getEligibility = handle(async (req, res) => {
  ok(res, await service.getEligibility(req.user.provider_id), "Eligibility fetched");
});

const getAdminPayouts = handle(async (req, res) => {
  const query = listQuerySchema.parse(req.query);
  ok(res, await service.listAdminPayouts(query), "Payouts fetched");
});

const updateStatus = handle(async (req, res) => {
  const body = updateStatusSchema.parse(req.body);
  const payout = await service.changeStatus(req.params.id, req.user.id, body);
  ok(res, payout, `Payout status changed to ${payout.payout_status}`);
});

module.exports = { createPayout, getMyPayouts, getEligibility, getAdminPayouts, updateStatus };