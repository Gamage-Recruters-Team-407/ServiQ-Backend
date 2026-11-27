const mongoose = require("mongoose");
const ProviderAvailability = require("../models/ProviderAvailability");
const { AVAILABILITY_STATUSES } = require("../constants/enums");
const { ok, created } = require("../utils/response");

/**
 * Controller for Provider Availability endpoints
 * SRS §12.4, §14.2 - Provider availability management and customer display
 */
const availabilityController = {
  /**
   * GET /api/availability/provider/:providerId
   * Public/Customer endpoint: Returns all available and booked slots for a provider.
   * Query params:
   *   - startDate (YYYY-MM-DD)
   *   - endDate (YYYY-MM-DD)
   *   - serviceId (optional)
   */
  getProviderSlots: async (req, res, next) => {
    try {
      const { providerId } = req.params;
      const { startDate, endDate, serviceId } = req.query;

      // Only query DB if providerId is a valid 24-character hex ObjectId
      if (!mongoose.Types.ObjectId.isValid(providerId)) {
        return ok(res, []);
      }

      const query = { provider_id: providerId };

      if (startDate || endDate) {
        query.available_date = {};
        if (startDate) {
          query.available_date.$gte = new Date(startDate);
        }
        if (endDate) {
          query.available_date.$lte = new Date(endDate);
        }
      }

      if (serviceId && serviceId !== "all" && mongoose.Types.ObjectId.isValid(serviceId)) {
        query.$or = [{ service_id: serviceId }, { service_id: null }];
      }

      const slots = await ProviderAvailability.find(query)
        .sort({ available_date: 1, start_time: 1 })
        .lean();

      return ok(res, slots);
    } catch (error) {
      return next(error);
    }
  },

  /**
   * GET /api/availability/my
   * Provider endpoint: Get all configured availability slots for the logged-in provider.
   */
  getMySlots: async (req, res, next) => {
    try {
      const rawId = req.user?._id || req.query.provider_id;
      
      // If no valid MongoDB ObjectId is passed (e.g. mock strings like 'usr_mock_provider_01'),
      // return empty array cleanly so Mongoose doesn't throw CastError
      if (!rawId || !mongoose.Types.ObjectId.isValid(rawId)) {
        return ok(res, []);
      }

      const slots = await ProviderAvailability.find({ provider_id: rawId })
        .sort({ available_date: 1, start_time: 1 })
        .lean();

      return ok(res, slots);
    } catch (error) {
      return next(error);
    }
  },

  /**
   * POST /api/availability
   * Provider endpoint: Save or batch-create availability slots.
   * Body can be a single slot or { slots: [ ... ] }
   */
  saveSlots: async (req, res, next) => {
    try {
      let providerId = req.user?._id || req.body.provider_id;
      // If no valid ObjectId or mock string, provide a fallback 24-char ObjectId so MongoDB accepts it
      if (!providerId || !mongoose.Types.ObjectId.isValid(providerId)) {
        providerId = new mongoose.Types.ObjectId("65f000000000000000000001");
      }

      const rawSlots = Array.isArray(req.body.slots) 
        ? req.body.slots 
        : Array.isArray(req.body) 
        ? req.body 
        : [req.body];

      if (!rawSlots.length || !rawSlots[0]) {
        return res.status(400).json({
          success: false,
          message: "No slots provided."
        });
      }

      const slotsToInsert = rawSlots.map((s) => ({
        provider_id: (s.provider_id && mongoose.Types.ObjectId.isValid(s.provider_id)) 
          ? s.provider_id 
          : providerId,
        service_id: s.service_id && s.service_id !== "all" && mongoose.Types.ObjectId.isValid(s.service_id) 
          ? s.service_id 
          : null,
        available_date: new Date(s.available_date),
        start_time: s.start_time,
        end_time: s.end_time,
        is_available: s.is_available !== undefined ? s.is_available : true,
        status: s.status || AVAILABILITY_STATUSES.AVAILABLE
      }));

      // Insert slots into database
      const inserted = await ProviderAvailability.insertMany(slotsToInsert);
      return created(res, inserted);
    } catch (error) {
      return next(error);
    }
  },

  /**
   * PATCH /api/availability/:id/status
   * Provider endpoint: Update status (e.g., Available <-> Blocked)
   */
  updateSlotStatus: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!Object.values(AVAILABILITY_STATUSES).includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${Object.values(AVAILABILITY_STATUSES).join(", ")}`
        });
      }

      const updated = await ProviderAvailability.findByIdAndUpdate(
        id,
        {
          status,
          is_available: status === AVAILABILITY_STATUSES.AVAILABLE
        },
        { new: true }
      );

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: "Availability slot not found."
        });
      }

      return ok(res, updated);
    } catch (error) {
      return next(error);
    }
  },

  /**
   * DELETE /api/availability/:id
   * Provider endpoint: Delete a specific availability slot
   */
  deleteSlot: async (req, res, next) => {
    try {
      const { id } = req.params;
      const deleted = await ProviderAvailability.findByIdAndDelete(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Availability slot not found."
        });
      }

      return ok(res, { message: "Slot removed successfully", id });
    } catch (error) {
      return next(error);
    }
  }
};

module.exports = { availabilityController };
