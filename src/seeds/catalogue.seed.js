require("dotenv").config();
const mongoose = require("mongoose");
const ServiceCategory = require("../models/ServiceCategory");
const Service = require("../models/Service");
const { CATEGORY_STATUSES, SERVICE_STATUSES, PRICING_TYPES } = require("../constants/enums");

// ⚠️ .env එකේ DB variable නම බලන්න (MONGODB_URI / MONGO_URI)
const URI = process.env.MONGODB_URI || process.env.MONGO_URI;

const CATEGORIES = [
  { name: "Plumbing", description: "Pipe repairs, leaks, taps and installations." },
  { name: "Electrical", description: "Wiring, fittings, repairs and safety checks." },
  { name: "Cleaning", description: "Home, office and deep cleaning services." },
  { name: "Painting", description: "Interior and exterior painting." },
  { name: "Gardening", description: "Lawn care, trimming and landscaping." },
  { name: "Appliance Repair", description: "Repair and servicing of home appliances." },
  { name: "AC Repair", description: "Air conditioner service and repair.", parent: "Appliance Repair" },
  // Inactive category: used to test that it is hidden from customers
  { name: "Pest Control", description: "Pest treatment services.", status: CATEGORY_STATUSES.INACTIVE },
];

const SERVICES = [
  { name: "Tap & pipe leak repair", category: "Plumbing", amount: 2500, type: PRICING_TYPES.FIXED, locations: ["Negombo", "Colombo"], desc: "Fix dripping taps and leaking pipes." },
  { name: "Bathroom fitting installation", category: "Plumbing", amount: 6000, type: PRICING_TYPES.FIXED, locations: ["Gampaha"], desc: "Install basins, showers and toilets." },
  { name: "House wiring inspection", category: "Electrical", amount: 3500, type: PRICING_TYPES.FIXED, locations: ["Negombo"], desc: "Full safety inspection of home wiring." },
  { name: "Deep house cleaning", category: "Cleaning", amount: 1800, type: PRICING_TYPES.HOURLY, locations: ["Colombo", "Negombo"], desc: "Thorough cleaning of all rooms." },
  { name: "Interior wall painting", category: "Painting", amount: 0, type: PRICING_TYPES.QUOTE, locations: ["Colombo"], desc: "Per-room interior painting. Price depends on room size." },
  { name: "AC servicing", category: "AC Repair", amount: 4000, type: PRICING_TYPES.FIXED, locations: ["Negombo", "Colombo"], desc: "Cleaning, gas check and servicing." },
  { name: "Lawn mowing & trimming", category: "Gardening", amount: 2000, type: PRICING_TYPES.FIXED, locations: ["Negombo"], desc: "Regular lawn maintenance.", status: SERVICE_STATUSES.TEMPORARILY_UNAVAILABLE },
];

async function run() {
  if (!URI) throw new Error("DB connection string not found in .env");
  await mongoose.connect(URI);

  // Provider model belongs to another developer: use a real provider if one exists
  let providerId = new mongoose.Types.ObjectId("64b000000000000000000001");
  try {
    const Provider = require("../models/Provider");
    const p = await Provider.findOne().lean();
    if (p) providerId = p._id;
    else console.warn("⚠️  No provider found, using placeholder provider_id");
  } catch {
    console.warn("⚠️  Provider model not found, using placeholder provider_id");
  }

  const ids = {};
  // parents first, then children
  for (const c of [...CATEGORIES.filter((x) => !x.parent), ...CATEGORIES.filter((x) => x.parent)]) {
    let doc = await ServiceCategory.findOne({ name: c.name });
    if (!doc) {
      doc = await ServiceCategory.create({
        name: c.name,
        description: c.description,
        status: c.status || CATEGORY_STATUSES.ACTIVE,
        parent_category_id: c.parent ? ids[c.parent] : null,
      });
      console.log("＋ category:", c.name);
    }
    ids[c.name] = doc._id;
  }

  for (const s of SERVICES) {
    const exists = await Service.findOne({ name: s.name, category_id: ids[s.category] });
    if (exists) continue;
    await Service.create({
      provider_id: providerId,
      category_id: ids[s.category],
      name: s.name,
      description: s.desc,
      price: { amount: s.amount, currency: "LKR", pricing_type: s.type },
      coverage: { coverage_area: s.locations[0], supported_locations: s.locations, radius_km: 15 },
      status: s.status || SERVICE_STATUSES.ACTIVE,
    });
    console.log("＋ service:", s.name);
  }

  console.log("✅ Catalogue seed complete");
  await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });