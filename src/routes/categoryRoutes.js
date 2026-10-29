const express = require("express");
const c = require("../controllers/categoryController");

// TODO: replace with your real auth middleware, e.g.
// const { protect, authorize } = require("../middlewares/authMiddleware");
// const adminOnly = [protect, authorize("admin")];
const adminOnly = []; // ⚠️ TEMPORARY: admin routes are OPEN until this is wired. Do not deploy like this.

const router = express.Router();

router.get("/", c.getPublicCategories);
router.get("/admin/all", ...adminOnly, c.getAllCategoriesAdmin); // keep above "/:idOrSlug"
router.get("/:idOrSlug", c.getCategory);
router.post("/", ...adminOnly, c.createCategory);
router.put("/:id", ...adminOnly, c.updateCategory);

module.exports = router;