const mongoose = require("mongoose");
const Customer = require("../models/Customer");
const { toDb, toUi } = require("../utils/adminStatusMap");

const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const basePipeline = [
  { $lookup: { from: "users", localField: "user_id", foreignField: "_id", as: "user" } },
  { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
  // ASSUMPTION: Booking stores customer in "customer_id". Verify in Booking model.
  { $lookup: { from: "bookings", localField: "_id", foreignField: "customer_id", as: "bk" } },
  {
    $project: {
      _id: 0,
      id: { $toString: "$_id" },
      name: {
        $trim: {
          input: {
            $concat: [
              { $ifNull: ["$profile_details.first_name", ""] },
              " ",
              { $ifNull: ["$profile_details.last_name", ""] },
            ],
          },
        },
      },
      email: "$user.email",
      phone: "$profile_details.phone_number",
      location: "$profile_details.address.city",
      bookings: { $size: "$bk" },
      joinedAt: "$created_at",
      status: "$account_status", // DB value, mapped to UI key below
    },
  },
];

const mapRow = r => ({ ...r, status: toUi[r.status] ?? "inactive" });

exports.list = async ({ search, status, location, page, limit }) => {
  const match = {};
  if (status) {
    if (!toDb[status]) return { rows: [], total: 0, counts: { all: 0 }, locations: [] };
    match.status = toDb[status];
  }
  if (location) match.location = location;
  if (search) {
    const r = new RegExp(escapeRegex(search), "i");
    match.$or = [{ name: r }, { email: r }, { phone: r }];
  }

  const [result] = await Customer.aggregate([
    ...basePipeline,
    {
      $facet: {
        rows: [
          { $match: match },
          { $sort: { joinedAt: -1 } },
          { $skip: (page - 1) * limit },
          { $limit: limit },
        ],
        total: [{ $match: match }, { $count: "n" }],
        counts: [{ $group: { _id: "$status", n: { $sum: 1 } } }],
        all: [{ $count: "n" }],
        locations: [{ $group: { _id: "$location" } }],
      },
    },
  ]);

  const counts = { all: result.all[0]?.n ?? 0, active: 0, inactive: 0, restricted: 0, suspended: 0, pending: 0 };
  result.counts.forEach(c => { const k = toUi[c._id]; if (k) counts[k] = c.n; });

  return {
    rows: result.rows.map(mapRow),
    total: result.total[0]?.n ?? 0,
    counts,
    locations: result.locations.map(l => l._id).filter(Boolean).sort(),
  };
};

exports.getById = async id => {
  const [row] = await Customer.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(id) } },
    ...basePipeline,
  ]);
  return row ? mapRow(row) : null;
};

exports.updateStatus = async (id, statusKey) => {
  const updated = await Customer.findByIdAndUpdate(
    id,
    { account_status: toDb[statusKey] },
    { new: true, runValidators: true }
  );
  if (!updated) return null;
  return exports.getById(id);
};