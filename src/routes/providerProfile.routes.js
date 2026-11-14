
"use strict";

const router = require("express").Router();
const controller = require("../controllers/providerProfile.controller");
const {
  requireLocalProfileTesting
} = require("../middlewares/providerIdentity.middleware");

// TEMPORARY: no tokens or headers. Every endpoint works only on localhost.
// Replace this local-testing gate with D01/D02 authentication before release.
router.use(requireLocalProfileTesting);

router.get("/public/:providerId", controller.getPublic);
router.get("/:providerId/visibility", controller.getVisibility);
router.patch("/:providerId/visibility", controller.updateVisibility);
router.get("/:providerId/preview", controller.getPreview);
router.get("/:providerId", controller.getProfile);
router.patch("/:providerId", controller.updateProfile);
router.delete("/:providerId", controller.deleteProfile);

module.exports = router;
