const express = require("express");
const upload = require("../middleware/upload");
const authorizeConversation = require("../middleware/authorizeConversation");
const { uploadAttachment } = require("../controllers/uploadController");

// Replace this with your team's existing auth middleware.
const authenticate = require("../middleware/authenticate");

const router = express.Router();

router.post(
  "/:conversationId",
  authenticate,
  authorizeConversation,
  upload.single("file"),
  uploadAttachment
);

module.exports = router;