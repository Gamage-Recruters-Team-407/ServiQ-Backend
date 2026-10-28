const serviceService = require("../services/serviceService");
const { sendError } = require("../utils/handleError");
const { SERVICE_STATUSES, USER_ROLES } = require("../constants/enums");

// TODO: replace once the auth middleware exists. It should set req.user = { role, provider_id }.
// ⚠️ Until then every request is treated as an Administrator (testing only).
function getActor(req) {
  if (req.user) return { role: req.user.role, providerId: req.user.provider_id || null };
  return { role: USER_ROLES.ADMIN, providerId: null };
}

function paging(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 12));
  return { page, limit };
}

// GET /api/services?q=&category_id=&provider_id=&page=&limit=   (public: Active only)
exports.getPublicServices = async (req, res) => {
  try {
    const { items, ...meta } = await serviceService.listServices({
      q: req.query.q,
      category_id: req.query.category_id,
      provider_id: req.query.provider_id,
      ...paging(req.query),
      publicOnly: true,
    });
    res.json({ success: true, data: items, meta });
  } catch (err) { sendError(res, err); }
};

// GET /api/services/admin/all?status=all|Active|...   (admin)
exports.getAllServicesAdmin = async (req, res) => {
  try {
    const { items, ...meta } = await serviceService.listServices({
      q: req.query.q,
      category_id: req.query.category_id,
      provider_id: req.query.provider_id,
      status: req.query.status || "all",
      ...paging(req.query),
      publicOnly: false,
    });
    res.json({ success: true, data: items, meta });
  } catch (err) { sendError(res, err); }
};

// GET /api/services/:id   (public: Active only)
exports.getService = async (req, res) => {
  try {
    const service = await serviceService.getService(req.params.id, { publicOnly: true });
    if (!service) return res.status(404).json({ success: false, message: "Service not found" });
    res.json({ success: true, data: service });
  } catch (err) { sendError(res, err); }
};

// POST /api/services   (admin or provider)
exports.createService = async (req, res) => {
  try {
    res.status(201).json({ success: true, data: await serviceService.createService(req.body, getActor(req)) });
  } catch (err) { sendError(res, err); }
};

// PUT /api/services/:id   (admin or owning provider)
exports.updateService = async (req, res) => {
  try {
    res.json({ success: true, data: await serviceService.updateService(req.params.id, req.body, getActor(req)) });
  } catch (err) { sendError(res, err); }
};

// PATCH /api/services/:id/status   body: { status }
exports.changeStatus = async (req, res) => {
  try {
    res.json({ success: true, data: await serviceService.changeServiceStatus(req.params.id, req.body.status, getActor(req)) });
  } catch (err) { sendError(res, err); }
};

// DELETE /api/services/:id  -> soft delete (status = Archived). Records are never removed.
exports.archiveService = async (req, res) => {
  try {
    const data = await serviceService.changeServiceStatus(req.params.id, SERVICE_STATUSES.ARCHIVED, getActor(req));
    res.json({ success: true, data, message: "Service archived" });
  } catch (err) { sendError(res, err); }
};