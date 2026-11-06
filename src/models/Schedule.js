const mongoose = require("mongoose");
const { SCHEDULE_STATUSES } = require("../constants/enums");

const scheduleSchema = new mongoose.Schema(
  {
    booking_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true
    },
    scheduled_start: {
      type: Date,
      required: true,
      index: true
    },
    scheduled_end: {
      type: Date,
      required: true
    },
    duration_minutes: {
      type: Number,
      default: 60
    },
    schedule_status: {
      type: String,
      enum: Object.values(SCHEDULE_STATUSES),
      default: SCHEDULE_STATUSES.REQUESTED,
      index: true
    },
    reschedule_reason: {
      type: String,
      trim: true,
      default: null
    },
    rescheduled_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
  }
);

scheduleSchema.index({ booking_id: 1, schedule_status: 1 });

module.exports = mongoose.model("Schedule", scheduleSchema);
