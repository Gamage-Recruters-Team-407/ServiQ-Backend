const categoryService = require("../services/categoryService");
const { CATEGORY_STATUSES } = require("../constants/enums");
const { sendError } = require("../utils/handleError");

// function sendError(res, err) {
//   if (err.statusCode) {
//     return res.status(err.statusCode).json({ success: false, message: err.message, details: err.details });
//   }
//   if (err.code === 11000) {
//     return res.status(409).json({ success: false, message: "A category with this name already exists" });
//   }
//   if (err.name === "ValidationError") {
//     const details = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
//     return res.status(400).json({ success: false, message: "Validation failed", details });
//   }
//   if (err.name === "CastError") {
//     return res.status(400).json({ success: false, message: "Invalid id" });
//   }
//   console.error("[categories]", err);
//   return res.status(500).json({ success: false, message: "Something went wrong" });
// }

// GET /api/categories?parent=root|<id>&q=&withCounts=1   (public: Active only)
exports.getPublicCategories = async (req, res) => {
  try {
    const items = await categoryService.listCategories({
      status: CATEGORY_STATUSES.ACTIVE,
      parent: req.query.parent,
      q: req.query.q,
    });
    if (req.query.withCounts === "1") {
      const counts = await categoryService.getActiveServiceCounts();
      return res.json({ success: true, data: items.map((c) => ({ ...c, service_count: counts[String(c._id)] || 0 })) });
    }
    res.json({ success: true, data: items });
  } catch (err) { sendError(res, err); }
};

// GET /api/categories/admin/all?status=all|Active|Inactive   (admin)
exports.getAllCategoriesAdmin = async (req, res) => {
  try {
    const items = await categoryService.listCategories({
      status: req.query.status || "all",
      parent: req.query.parent,
      q: req.query.q,
    });
    res.json({ success: true, data: items });
  } catch (err) { sendError(res, err); }
};

// GET /api/categories/:idOrSlug   (public: Active only)
exports.getCategory = async (req, res) => {
  try {
    const category = await categoryService.getCategory(req.params.idOrSlug);
    if (!category || category.status !== CATEGORY_STATUSES.ACTIVE) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }
    res.json({ success: true, data: category });
  } catch (err) { sendError(res, err); }
};

// POST /api/categories   (admin)
exports.createCategory = async (req, res) => {
  try {
    res.status(201).json({ success: true, data: await categoryService.createCategory(req.body) });
  } catch (err) { sendError(res, err); }
};

// PUT /api/categories/:id   (admin) - also used to activate / deactivate via { status }
exports.updateCategory = async (req, res) => {
  try {
    res.json({ success: true, data: await categoryService.updateCategory(req.params.id, req.body) });
  } catch (err) { sendError(res, err); }
};