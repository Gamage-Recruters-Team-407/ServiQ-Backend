const express = require("express");
const { availabilityController } = require("../controllers/availabilityController");

const router = express.Router();

// Public / Customer endpoint: fetch slots for a provider (with date/service filter)
router.get("/provider/:providerId", availabilityController.getProviderSlots);

// Provider endpoints: manage availability (supports both /my and /my-slots, / and /slots)
router.get("/my", availabilityController.getMySlots);
router.get("/my-slots", availabilityController.getMySlots);

router.post("/", availabilityController.saveSlots);
router.post("/slots", availabilityController.saveSlots);

router.patch("/:id/status", availabilityController.updateSlotStatus);
router.patch("/slots/:id/status", availabilityController.updateSlotStatus);

router.delete("/:id", availabilityController.deleteSlot);
router.delete("/slots/:id", availabilityController.deleteSlot);

module.exports = router;

