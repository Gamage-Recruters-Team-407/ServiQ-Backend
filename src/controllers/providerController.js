
const { ZodError } = require("zod");
const providerService = require("../services/providerService");

// Handle errors consistently without exposing internal details.
function handleProviderError(error, res) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Invalid provider profile data.",
      errors: error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message
      }))
    });
  }

  // MongoDB duplicate-key error
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Provider profile already exists."
    });
  }

  // Known application errors
  if (
    Number.isInteger(error.status) &&
    error.status >= 400 &&
    error.status < 500
  ) {
    return res.status(error.status).json({
      success: false,
      message: error.message
    });
  }

  console.error("Provider Profiles error:", error);

  return res.status(500).json({
    success: false,
    message: "An internal server error occurred."
  });
}

// POST /api/providers
async function create(req, res) {
  try {
    const profile = await providerService.createProfile(
      req.user._id,
      req.body
    );

    return res.status(201).json({
      success: true,
      message: "Provider profile created successfully.",
      data: profile
    });
  } catch (error) {
    return handleProviderError(error, res);
  }
}

// GET /api/providers/me
async function getMine(req, res) {
  try {
    const profile = await providerService.getMyProfile(
      req.user._id
    );

    return res.status(200).json({
      success: true,
      data: profile
    });
  } catch (error) {
    return handleProviderError(error, res);
  }
}

// PATCH /api/providers/me
async function updateMine(req, res) {
  try {
    const profile = await providerService.updateMyProfile(
      req.user._id,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Provider profile updated successfully.",
      data: profile
    });
  } catch (error) {
    return handleProviderError(error, res);
  }
}

// GET /api/providers
async function list(req, res) {
  try {
    const profiles = await providerService.listPublicProfiles();

    return res.status(200).json({
      success: true,
      count: profiles.length,
      data: profiles
    });
  } catch (error) {
    return handleProviderError(error, res);
  }
}

// GET /api/providers/:id
async function getById(req, res) {
  try {
    const profile = await providerService.getPublicProfile(
      req.params.id
    );

    return res.status(200).json({
      success: true,
      data: profile
    });
  } catch (error) {
    return handleProviderError(error, res);
  }
}

module.exports = {
  create,
  getMine,
  updateMine,
  list,
  getById
};
