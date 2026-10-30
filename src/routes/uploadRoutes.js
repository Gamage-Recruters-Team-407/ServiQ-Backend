
const express = require("express");
const upload = require("../middlewares/upload");
const authorizeConversation = require("../middlewares/authorizeConversation");
const { uploadAttachment } = require("../controllers/uploadController");
const { authenticate } = require("../middlewares/auth");

const router = express.Router();

router.post(
  "/:conversationId",
  authenticate,
  authorizeConversation,
  upload.single("file"),
  uploadAttachment
);

module.exports = router;
