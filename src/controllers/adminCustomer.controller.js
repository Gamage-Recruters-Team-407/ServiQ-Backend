const service = require("../services/adminCustomer.service");
const { toDb } = require("../utils/adminStatusMap");

exports.list = async (req, res) => {
  try {
    const { search = "", status = "", location = "", page = 1, limit = 12 } = req.query;
    const data = await service.list({
      search: String(search).trim(),
      status,
      location,
      page: Math.max(1, Number(page) || 1),
      limit: Math.min(50, Number(limit) || 12),
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const row = await service.getById(req.params.id);
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch {
    res.status(400).json({ error: "Invalid id" });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!toDb[status]) return res.status(400).json({ error: "Invalid status" });
    const updated = await service.updateStatus(req.params.id, status);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};