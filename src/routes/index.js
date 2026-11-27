const express = require("express");

const router = express.Router();

// Each module mounts its own router here.
router.use("/notifications", require("./notification.routes"));

module.exports = router;
