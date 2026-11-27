const { getDefaultService } = require("../services/notification.service");
const { ok } = require("../utils/response");

const list = async (req, res) => {
  const { items, meta } = await getDefaultService().list(req.user.id, req.valid.query);
  ok(res, items, meta);
};

const markRead = async (req, res) => ok(res, await getDefaultService().markRead(req.user.id, req.valid.params.id));

const markUnread = async (req, res) => ok(res, await getDefaultService().markUnread(req.user.id, req.valid.params.id));

const markAllRead = async (req, res) => ok(res, await getDefaultService().markAllRead(req.user.id));

module.exports = { list, markRead, markUnread, markAllRead };
