// Read-only. Payment model is owned by Developer 12 - never write to it here.
const Payment = require("../models/Payment");

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const POPULATE = [
  { path: "booking_id", select: "booking_reference booking_status total_amount service_id" },
  { path: "customer_id", select: "profile_details.first_name profile_details.last_name" },
  { path: "provider_id", select: "business_information.business_name" }
];

// scope.customerId set => customer can only see their own payments
async function listPayments(query, scope = {}) {
  const filter = {};

  if (scope.customerId) filter.customer_id = scope.customerId;
  else if (query.customerId) filter.customer_id = query.customerId;

  if (query.providerId) filter.provider_id = query.providerId;
  if (query.bookingId) filter.booking_id = query.bookingId;
  if (query.status) filter.payment_status = query.status;
  if (query.method) filter.payment_method = query.method;

  if (query.from || query.to) {
    filter.payment_datetime = {};
    if (query.from) filter.payment_datetime.$gte = query.from;
    if (query.to) {
      const end = new Date(query.to);
      end.setUTCHours(23, 59, 59, 999);
      filter.payment_datetime.$lte = end;
    }
  }

  if (query.minAmount !== undefined || query.maxAmount !== undefined) {
    filter.amount = {};
    if (query.minAmount !== undefined) filter.amount.$gte = query.minAmount;
    if (query.maxAmount !== undefined) filter.amount.$lte = query.maxAmount;
  }

  if (query.search) {
    const rx = new RegExp(escapeRegex(query.search), "i");
    filter.$or = [{ payment_reference: rx }, { external_txn_ref: rx }];
  }

  const skip = (query.page - 1) * query.limit;
  const sort = { [query.sortBy]: query.order === "asc" ? 1 : -1 };

  const [items, total] = await Promise.all([
    Payment.find(filter).sort(sort).skip(skip).limit(query.limit).populate(POPULATE).lean(),
    Payment.countDocuments(filter)
  ]);

  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit)
    }
  };
}

async function getPaymentById(id, scope = {}) {
  const filter = { _id: id };
  if (scope.customerId) filter.customer_id = scope.customerId;
  return Payment.findOne(filter).populate(POPULATE).lean();
}

module.exports = { listPayments, getPaymentById };