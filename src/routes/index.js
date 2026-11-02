const express = require("express");

const router = express.Router();

// Each module mounts its own router here.
router.use("/service-completions", require("./serviceCompletion.routes"));

module.exports = router;
