const { getDefaultService } = require("../services/serviceCompletion.service");
const { ok, created } = require("../utils/response");

const ctxOf = (req) => ({ ip: req.ip, userAgent: req.get("user-agent") || null });

const list = async (req, res) => {
  const { items, meta } = await getDefaultService().list(req.user, req.valid.query);
  ok(res, items, meta);
};

const getOne = async (req, res) => ok(res, await getDefaultService().getById(req.user, req.valid.params.id));

const getByBooking = async (req, res) =>
  ok(res, await getDefaultService().getByBooking(req.user, req.valid.params.bookingId));

const create = async (req, res) => created(res, await getDefaultService().create(req.user, req.valid.body, ctxOf(req)));

const update = async (req, res) =>
  ok(res, await getDefaultService().update(req.user, req.valid.params.id, req.valid.body, ctxOf(req)));

module.exports = { list, getOne, getByBooking, create, update };
