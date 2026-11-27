// Notifications for the logged-in user: list + read/unread. Built as a factory so the
// data layer can be swapped in unit tests. Also exports `notify()` for other modules
// (booking, payment, ...) to create a notification without touching the collection.
const AppError = require("../utils/AppError");
const {
  NOTIFICATION_CHANNELS: CHANNELS,
  NOTIFICATION_STATUSES: STATUSES
} = require("../constants/enums");

const toDTO = (n) => ({
  id: String(n._id),
  title: n.title || n.event_type,
  message: n.message,
  event_type: n.event_type,
  channel: n.channel,
  related_record_id: n.related_record_id || null,
  read: n.notification_status === STATUSES.READ,
  read_at: n.read_at || null,
  created_at: n.created_at
});

function createNotificationService(deps = {}) {
  const Notification = deps.Notification || require("../models/Notification");

  // The user-facing inbox shows in-app notifications addressed to this user.
  const inbox = (userId) => ({ recipient_id: userId, channel: CHANNELS.IN_APP });

  async function list(userId, { status, event_type, page, limit }) {
    const filter = inbox(userId);
    if (status === "unread") filter.notification_status = { $ne: STATUSES.READ };
    if (status === "read") filter.notification_status = STATUSES.READ;
    if (event_type) filter.event_type = event_type;

    const [total, unread, rows] = await Promise.all([
      Notification.countDocuments(filter),
      Notification.countDocuments({ ...inbox(userId), notification_status: { $ne: STATUSES.READ } }),
      Notification.find(filter)
        .sort({ created_at: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
    ]);

    return {
      items: rows.map(toDTO),
      meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)), unread_count: unread }
    };
  }

  // Marking someone else's notification behaves exactly like a missing one (no information leak).
  async function setRead(userId, id, read) {
    const update = read
      ? { notification_status: STATUSES.READ, read_at: new Date() }
      : { notification_status: STATUSES.DELIVERED, read_at: null };

    // Already in the requested state? Return it unchanged (idempotent).
    const stateFilter = read ? { $ne: STATUSES.READ } : STATUSES.READ;
    const changed = await Notification.findOneAndUpdate(
      { _id: id, ...inbox(userId), notification_status: stateFilter },
      { $set: update },
      { returnDocument: "after" }
    ).lean();
    if (changed) return toDTO(changed);

    const existing = await Notification.findOne({ _id: id, ...inbox(userId) }).lean();
    if (!existing) throw new AppError("Notification not found", 404, "NOTIFICATION_NOT_FOUND");
    return toDTO(existing);
  }

  async function markAllRead(userId) {
    const result = await Notification.updateMany(
      { ...inbox(userId), notification_status: { $ne: STATUSES.READ } },
      { $set: { notification_status: STATUSES.READ, read_at: new Date() } }
    );
    return { modified: result.modifiedCount ?? result.nModified ?? 0 };
  }

  // For other modules. Never throws: a failed notification must not break the business action.
  async function notify({ recipientId, eventType, relatedRecordId = null, title = null, message }) {
    try {
      if (!recipientId) return null;
      return await Notification.create({
        recipient_id: recipientId,
        event_type: eventType,
        related_record_id: relatedRecordId ? String(relatedRecordId) : null,
        channel: CHANNELS.IN_APP,
        title,
        message,
        notification_status: STATUSES.DELIVERED,
        delivered_at: new Date()
      });
    } catch (err) {
      console.error("Notification failed:", err.message);
      return null;
    }
  }

  return { list, markRead: (u, id) => setRead(u, id, true), markUnread: (u, id) => setRead(u, id, false), markAllRead, notify, toDTO };
}

let instance;
const getDefaultService = () => (instance ||= createNotificationService());

module.exports = { createNotificationService, getDefaultService };
