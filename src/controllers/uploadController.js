const { uploadToCloudinary } = require("../services/cloudinaryService");

const MIME_TO_KIND = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "image/gif": "image",
  "video/mp4": "video",
  "video/webm": "video",
  "audio/mpeg": "audio",
  "audio/mp4": "audio",
  "audio/webm": "audio",
  "audio/ogg": "audio",
  "audio/wav": "audio",
  "application/pdf": "file",
  "text/plain": "file",
  "application/zip": "file",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "file",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "file",
};

async function uploadAttachment(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Please select a file",
      });
    }

    const kind = MIME_TO_KIND[req.file.mimetype];

    if (!kind) {
      return res.status(415).json({
        message: "Unsupported file type",
      });
    }

    const result = await uploadToCloudinary(
      req.file,
      kind,
      String(req.conversation._id)
    );

    return res.status(201).json({
      attachment: {
        ...result,
        kind,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { uploadAttachment };