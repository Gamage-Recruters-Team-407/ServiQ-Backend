const express = require("express");
const { authenticate } = require("../middlewares/auth");
const {
  createConversation,
  listConversations,
} = require("../controllers/conversationController");

const router = express.Router();

router.use(authenticate);

router.post("/", createConversation);
router.get("/", listConversations);

module.exports = router;