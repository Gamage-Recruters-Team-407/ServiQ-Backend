const express = require("express");
const c = require("../controllers/serviceController");

// TODO: wire the real auth middleware here when it exists, e.g.
// const adminOnly = [protect, authorize(USER_ROLES.ADMIN)];
// const adminOrProvider = [protect, authorize(USER_ROLES.ADMIN, USER_ROLES.PROVIDER)];
const adminOnly = [];        // ⚠️ TEMPORARY: open
const adminOrProvider = [];  // ⚠️ TEMPORARY: open

const router = express.Router();

router.get("/", c.getPublicServices);
router.get("/admin/all", ...adminOnly, c.getAllServicesAdmin); // keep above "/:id"
router.get("/:id", c.getService);
router.post("/", ...adminOrProvider, c.createService);
router.put("/:id", ...adminOrProvider, c.updateService);
router.patch("/:id/status", ...adminOrProvider, c.changeStatus);
router.delete("/:id", ...adminOrProvider, c.archiveService);

module.exports = router;