const { Payment } = require("../models");

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function buildFilter(q, base = {}) {
  const filter = { ...base };
  if (q.status) filter.payment_status = q.status;
  if (q.method) filter.payment_method = q.method;
  if (q.customerId) filter.customer_id = q.customerId;
  if (q.from || q.to) {
    filter.payment_datetime = {};
    if (q.from) filter.payment_datetime.$gte = q.from;
    if (q.to) filter.payment_datetime.$lte = q.to;
  }
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), "i");
    filter.$or = [{ payment_reference: rx }, { external_txn_ref: rx }];
  }
  return filter;
}

async function listPayments(q, base = {}) {
  const filter = buildFilter(q, base);
  const skip = (q.page - 1) * q.limit;

  const [items, total] = await Promise.all([
    Payment.find(filter)
      .sort({ payment_datetime: -1 })
      .skip(skip)
      .limit(q.limit)
      .lean(),
    Payment.countDocuments(filter)
  ]);

  return {
    items,
    pagination: {
      page: q.page,
      limit: q.limit,
      total,
      totalPages: Math.ceil(total / q.limit)
    }
  };
}

async function getPaymentById(id) {
  return Payment.findById(id)
    .populate("booking_id")
    .populate("customer_id")
    .populate("provider_id")
    .lean();
}

module.exports = { listPayments, getPaymentById };