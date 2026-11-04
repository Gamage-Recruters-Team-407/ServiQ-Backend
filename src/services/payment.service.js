const { Payment, Customer } = require("../models");

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Read-only lookup. TODO: swap with Dev 02's customer lookup once it exists.
async function findCustomerIdByUserId(userId) {
  if (!userId) return null;
  const customer = await Customer.findOne({ user_id: userId }).select("_id").lean();
  return customer ? customer._id : null;
}

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

// Only safe fields are populated (no address / location / bio / tax id / documents).
async function getPaymentById(id) {
  return Payment.findById(id)
    .populate({
      path: "booking_id",
      select: "booking_reference booking_status total_amount currency requested_at"
    })
    .populate({
      path: "customer_id",
      select:
        "profile_details.first_name profile_details.last_name profile_details.phone_number account_status"
    })
    .populate({
      path: "provider_id",
      select:
        "provider_type business_information.business_name business_information.contact_phone account_status"
    })
    .lean();
}

module.exports = { listPayments, getPaymentById, findCustomerIdByUserId };