// MOCK STORE: Data is stored in memory, not in MongoDB.
// Data resets when the server restarts.
// Replace this file with a Mongoose Payout model later.
// Keep function and field names unchanged to match the Payout model

const crypto = require("crypto");
const { PAYOUT_STATUSES: S } = require("../constants/enums");
const { MOCK_PROVIDER_ID, MOCK_ADMIN_ID, CURRENCY } = require("../config/payout.config");

const payouts = [];

const newId = () => crypto.randomBytes(12).toString("hex");

function makeReference(date) {
  const prefix = date.toISOString().slice(0, 10).replace(/-/g, "");
  return `POUT-${prefix}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function seed({ date, amount, status, method = "Bank Transfer", reason = null }) {
  const created = new Date(date);
  const approved = [S.APPROVED, S.SUCCESSFUL].includes(status);
  payouts.push({
    _id: newId(),
    payout_reference: makeReference(created),
    provider_id: MOCK_PROVIDER_ID,
    payout_amount: amount,
    currency: CURRENCY,
    payout_method: method,
    destination_ref: "BANK-****4521",
    payout_status: status,
    external_txn_ref: null,
    failure_reason: reason,
    approved_by: approved ? MOCK_ADMIN_ID : null,
    approval_ref: null,
    initiated_at: approved ? created.toISOString() : null,
    completed_at: status === S.SUCCESSFUL ? created.toISOString() : null,
    created_at: created.toISOString(),
    updated_at: created.toISOString(),
  });
}

// Dashboard එකේ mock data එකටම ගැළපෙන seed data (balance: 8,000 / pending: 5,000 / paid: 42,000)
seed({ date: "2026-10-20T09:30:00Z", amount: 5000, status: S.PENDING });
seed({ date: "2026-10-05T11:10:00Z", amount: 12000, status: S.SUCCESSFUL });
seed({ date: "2026-09-18T14:45:00Z", amount: 3000, status: S.REJECTED, reason: "Incomplete payout account details" });
seed({ date: "2026-09-02T08:20:00Z", amount: 15000, status: S.SUCCESSFUL, method: "Manual Transfer" });
seed({ date: "2026-08-14T10:00:00Z", amount: 15000, status: S.SUCCESSFUL });

const copy = (doc) => ({ ...doc });

async function create(data) {
  const now = new Date();
  const doc = {
    _id: newId(),
    payout_reference: makeReference(now),
    external_txn_ref: null,
    failure_reason: null,
    approved_by: null,
    approval_ref: null,
    initiated_at: null,
    completed_at: null,
    ...data,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
  payouts.push(doc);
  return copy(doc);
}

async function findById(id) {
  const doc = payouts.find((p) => p._id === id);
  return doc ? copy(doc) : null;
}

async function update(id, patch) {
  const index = payouts.findIndex((p) => p._id === id);
  if (index === -1) return null;
  payouts[index] = { ...payouts[index], ...patch, updated_at: new Date().toISOString() };
  return copy(payouts[index]);
}

// providerId දුන්නොත් ඒ provider ගේ payouts විතරයි, නැත්නම් (admin) හැමෝගෙම
async function list({ providerId, status, page, limit }) {
  let rows = payouts.filter((p) => (providerId ? p.provider_id === providerId : true));
  if (status) rows = rows.filter((p) => p.payout_status === status);
  rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
  const total = rows.length;
  const items = rows.slice((page - 1) * limit, page * limit).map(copy);
  return { items, total };
}

async function sumAmount(providerId, statuses) {
  return payouts
    .filter((p) => p.provider_id === providerId && statuses.includes(p.payout_status))
    .reduce((sum, p) => sum + p.payout_amount, 0);
}

async function countByStatus() {
  const counts = {};
  for (const p of payouts) counts[p.payout_status] = (counts[p.payout_status] || 0) + 1;
  return counts;
}

module.exports = { create, findById, update, list, sumAmount, countByStatus };