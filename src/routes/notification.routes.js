const express = require("express");
const { authenticate } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const v = require("../validations/notification.validation");
const c = require("../controllers/notification.controller");

const router = express.Router();

router.use(authenticate);

// GET   /api/notifications?status=unread|read&event_type=&page=&limit=
// PATCH /api/notifications/read-all        (declared before /:id routes)
// PATCH /api/notifications/:id/read
// PATCH /api/notifications/:id/unread
router.get("/", validate({ query: v.listQuery }), c.list);
router.patch("/read-all", c.markAllRead);
router.patch("/:id/read", validate({ params: v.idParam }), c.markRead);
router.patch("/:id/unread", validate({ params: v.idParam }), c.markUnread);

module.exports = router;
