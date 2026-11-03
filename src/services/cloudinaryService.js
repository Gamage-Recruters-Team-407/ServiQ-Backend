const cloudinary = require("../config/cloudinary");
const { Readable } = require("node:stream");

const RESOURCE_TYPE = {
  image: "image",
  video: "video",
  audio: "video",
  file: "raw",
};

function uploadToCloudinary(file, kind, conversationId) {
  return new Promise((resolve, reject) => {
    const resourceType = RESOURCE_TYPE[kind];

    if (!resourceType) {
      return reject(new Error("Invalid media type"));
    }

    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        folder: `service-chat/${conversationId}`,
        timeout: 120000,
        ...(kind === "file" && {
          use_filename: false,
        }),
      },
      (error, result) => {
        if (error) return reject(error);

        resolve({
          publicId: result.public_id,
          secureUrl: result.secure_url,
          resourceType: result.resource_type,
          format: result.format,
          bytes: result.bytes,
          duration: result.duration || null,
        });
      }
    );

    Readable.from(file.buffer).pipe(stream);
  });
}

module.exports = { uploadToCloudinary };