// Notification interface (owned by Developer 24). Other modules call `notify`
// and never write the Notification collection themselves. A failed notification
// must never break the business action that triggered it.
const Notification = require("../models/Notification");
const { NOTIFICATION_CHANNELS } = require("../constants/enums");

async function notify({ recipientId, eventType, relatedRecordId = null, title = null, message }) {
  try {
    if (!recipientId) return null;
    return await Notification.create({
      recipient_id: recipientId,
      event_type: eventType,
      related_record_id: relatedRecordId ? String(relatedRecordId) : null,
      channel: NOTIFICATION_CHANNELS.IN_APP,
      title,
      message
    });
  } catch (err) {
    console.error("Notification failed:", err.message);
    return null;
  }
}

module.exports = { notify };
