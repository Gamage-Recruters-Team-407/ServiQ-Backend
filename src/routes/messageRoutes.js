
const express = require("express");

const { authenticate } = require("../middlewares/auth");
const authorizeConversation = require("../middlewares/authorizeConversation");

const {
  getMessages,
} = require("../controllers/conversationController");

const {
  sendMessage,
} = require("../controllers/messageController");

const router = express.Router();

router.get(
  "/:conversationId/messages",
  authenticate,
  authorizeConversation,
  getMessages
);

router.post(
  "/:conversationId/messages",
  authenticate,
  authorizeConversation,
  sendMessage
);

module.exports = router;
