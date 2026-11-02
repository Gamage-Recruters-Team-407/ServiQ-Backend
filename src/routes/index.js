const express = require("express");

const router = express.Router();

// Each module mounts its own router here.
router.use("/service-completions", require("./serviceCompletion.routes"));

// Provider Payouts (Developer 19)
router.use(require("./payout.routes"));

module.exports = router;
