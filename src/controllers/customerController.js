const { customerService } = require("../services/customerService");

function createCustomerController(service = customerService) {
  return {
    getProfile: async (req, res, next) => {
      try {
        const userId = req.user._id;
        const result = await service.getCustomerProfile(userId);
        return res.status(200).json({
          success: true,
          message: "Profile retrieved successfully.",
          data: result
        });
      } catch (error) {
        return next(error);
      }
    },

    updateProfile: async (req, res, next) => {
      try {
        const userId = req.user._id;
        const result = await service.updateCustomerProfile(userId, req.validatedBody);
        return res.status(200).json({
          success: true,
          message: "Profile updated successfully.",
          data: result
        });
      } catch (error) {
        return next(error);
      }
    },

    deleteAccount: async (req, res, next) => {
      try {
        const userId = req.user._id;
        const result = await service.deleteCustomerAccount(userId);
        return res.status(200).json({
          success: true,
          message: result.message
        });
      } catch (error) {
        return next(error);
      }
    }
  };
}

const customerController = createCustomerController();
module.exports = { createCustomerController, customerController };