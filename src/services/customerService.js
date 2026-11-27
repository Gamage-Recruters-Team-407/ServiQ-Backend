const mongoose = require("mongoose");
const User = require("../models/User");
const Customer = require("../models/Customer");
const { AppError } = require("../utils/authUtils");

function createCustomerService({ UserModel = User, CustomerModel = Customer } = {}) {
  
  // 1. Get Customer Profile
  async function getCustomerProfile(userId) {
    const user = await UserModel.findById(userId).select("-password");
    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    // .populate() removing
    const customer = await CustomerModel.findOne({ user_id: userId });
    
    return {
      user,
      customer_profile: customer || null
    };
  }

  // 2. Update Customer Profile
  async function updateCustomerProfile(userId, updateData) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    const { first_name, last_name, phone_number, avatar_url, address, preferences } = updateData;

    const customerUpdatePayload = {};
    const userUpdatePayload = {};

    if (first_name !== undefined) {
      customerUpdatePayload["profile_details.first_name"] = first_name;
      userUpdatePayload.first_name = first_name;
    }
    if (last_name !== undefined) {
      customerUpdatePayload["profile_details.last_name"] = last_name;
      userUpdatePayload.last_name = last_name;
    }
    if (phone_number !== undefined) {
      customerUpdatePayload["profile_details.phone_number"] = phone_number;
      userUpdatePayload.phone_number = phone_number;
    }
    if (avatar_url !== undefined) {
      customerUpdatePayload["profile_details.avatar_url"] = avatar_url;
      userUpdatePayload.profile_image = avatar_url;
    }
    if (address !== undefined) {
      customerUpdatePayload["profile_details.address"] = address;
    }
    if (preferences !== undefined) {
      customerUpdatePayload["preferences"] = preferences;
    }

    // .populate() removing 
    const updatedCustomer = await CustomerModel.findOneAndUpdate(
      { user_id: userId },
      { $set: customerUpdatePayload },
      { new: true, runValidators: true }
    );

    if (Object.keys(userUpdatePayload).length > 0) {
      await UserModel.findByIdAndUpdate(userId, { $set: userUpdatePayload }, { new: true, runValidators: true });
    }

    return updatedCustomer;
  }

  // 3. Delete Customer Account (Cascading Delete)
  async function deleteCustomerAccount(userId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await CustomerModel.findOneAndDelete({ user_id: userId }).session(session);
      const deletedUser = await UserModel.findByIdAndDelete(userId).session(session);
      
      if (!deletedUser) {
        throw new AppError("User not found", 404, "USER_NOT_FOUND");
      }

      await session.commitTransaction();
      return { message: "Customer account deleted successfully." };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  return {
    getCustomerProfile,
    updateCustomerProfile,
    deleteCustomerAccount
  };
}

const customerService = createCustomerService();
module.exports = { createCustomerService, customerService };