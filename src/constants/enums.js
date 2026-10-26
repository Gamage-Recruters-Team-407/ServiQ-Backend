const USER_ROLES = {
  CUSTOMER: "Customer",
  PROVIDER: "Service Provider",
  ADMIN: "Administrator"
};

const USER_STATUSES = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  SUSPENDED: "Suspended",
  RESTRICTED: "Restricted",
  PENDING_VERIFICATION: "Pending Verification"
};

const CUSTOMER_STATUSES = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  SUSPENDED: "Suspended",
  RESTRICTED: "Restricted"
};

const PROVIDER_TYPES = {
  INDIVIDUAL: "Individual",
  BUSINESS: "Business"
};

const PROVIDER_VERIFICATION_STATUSES = {
  PENDING: "Pending",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
  UNDER_REVIEW: "Under Review"
};

const PROVIDER_ACCOUNT_STATUSES = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  PENDING: "Pending",
  SUSPENDED: "Suspended",
  RESTRICTED: "Restricted"
};

const CATEGORY_STATUSES = {
  ACTIVE: "Active",
  INACTIVE: "Inactive"
};

const SERVICE_STATUSES = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  TEMPORARILY_UNAVAILABLE: "Temporarily Unavailable",
  ARCHIVED: "Archived"
};

const PRICING_TYPES = {
  FIXED: "Fixed",
  HOURLY: "Hourly",
  QUOTE: "Quote"
};

const AVAILABILITY_STATUSES = {
  AVAILABLE: "Available",
  BOOKED: "Booked",
  BLOCKED: "Blocked",
  UNAVAILABLE: "Unavailable"
};

const BOOKING_STATUSES = {
  REQUESTED: "Requested",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  CONFIRMED: "Confirmed",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  DISPUTED: "Disputed"
};

const SCHEDULE_STATUSES = {
  REQUESTED: "Requested",
  PENDING_CONFIRMATION: "Pending Confirmation",
  CONFIRMED: "Confirmed",
  RESCHEDULED: "Rescheduled",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed"
};

const COMMUNICATION_STATUSES = {
  SENT: "Sent",
  DELIVERED: "Delivered",
  READ: "Read"
};

const PAYMENT_METHODS = {
  CARD: "Card",
  BANK_TRANSFER: "Bank Transfer",
  WALLET: "Wallet",
  CASH: "Cash",
  OTHER: "Other"
};

const PAYMENT_STATUSES = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  SUCCESSFUL: "Successful",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
  PARTIALLY_REFUNDED: "Partially Refunded"
};

const COMMISSION_TYPES = {
  PERCENTAGE: "Percentage",
  FIXED: "Fixed",
  TIERED: "Tiered",
  HYBRID: "Hybrid"
};

const COMMISSION_RULE_STATUSES = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  DRAFT: "Draft",
  ARCHIVED: "Archived"
};

const COMMISSION_STATUSES = {
  PENDING: "Pending",
  CALCULATED: "Calculated",
  CONFIRMED: "Confirmed",
  APPLIED: "Applied",
  ADJUSTED: "Adjusted",
  REVERSED: "Reversed",
  CANCELLED: "Cancelled"
};

const EARNINGS_STATUSES = {
  PENDING: "Pending",
  CALCULATED: "Calculated",
  CONFIRMED: "Confirmed",
  AVAILABLE: "Available",
  ON_HOLD: "On Hold",
  PARTIALLY_ADJUSTED: "Partially Adjusted",
  ADJUSTED: "Adjusted",
  REVERSED: "Reversed",
  PAID_OUT: "Paid Out"
};

const PAYOUT_METHODS = {
  BANK_TRANSFER: "Bank Transfer",
  PAYMENT_SERVICE: "Payment Service",
  MANUAL_TRANSFER: "Manual Transfer",
  OTHER: "Other"
};

const PAYOUT_STATUSES = {
  PENDING: "Pending",
  AWAITING_APPROVAL: "Awaiting Approval",
  APPROVED: "Approved",
  PROCESSING: "Processing",
  SUCCESSFUL: "Successful",
  FAILED: "Failed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  REQUIRES_REVIEW: "Requires Review",
  REVERSED: "Reversed"
};

const SERVICE_COMPLETION_STATUSES = {
  REQUESTED: "Requested",
  ACCEPTED: "Accepted",
  CONFIRMED: "Confirmed",
  ON_THE_WAY: "On the Way",
  STARTED: "Started",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  DISPUTED: "Disputed"
};

const REVIEW_STATUSES = {
  SUBMITTED: "Submitted",
  PENDING_MODERATION: "Pending Moderation",
  PUBLISHED: "Published",
  HIDDEN: "Hidden",
  REJECTED: "Rejected",
  REMOVED: "Removed"
};

const REVIEW_MODERATION_STATUSES = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  FLAGGED: "Flagged",
  UNDER_REVIEW: "Under Review"
};

const DISPUTE_CATEGORIES = {
  SERVICE_QUALITY: "Service Quality",
  INCOMPLETE_DELIVERY: "Incomplete Service Delivery",
  SCHEDULING_OR_ATTENDANCE: "Scheduling or Attendance",
  PAYMENT_ISSUES: "Payment-related Issues",
  DESCRIPTION_MISMATCH: "Service Description or Expectation Mismatch",
  OTHER: "Other"
};

const DISPUTE_STATUSES = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  IN_INVESTIGATION: "In Investigation",
  ESCALATED: "Escalated",
  RESOLVED: "Resolved",
  CLOSED: "Closed"
};

const DISPUTE_RESOLUTION_OUTCOMES = {
  CUSTOMER_REFUND: "Customer Refund",
  PROVIDER_PAYOUT: "Provider Payout",
  PARTIAL_REFUND: "Partial Refund",
  DISMISSED: "Dismissed",
  MUTUAL_AGREEMENT: "Mutual Agreement",
  OTHER: "Other"
};

const DISPUTE_EVIDENCE_TYPES = {
  WRITTEN_EXPLANATION: "Written Explanation",
  SERVICE_RECORD: "Service Record",
  BOOKING_INFORMATION: "Booking Information",
  PAYMENT_REFERENCE: "Payment Reference",
  IMAGE: "Image",
  DOCUMENT: "Document",
  OTHER: "Other"
};

const NOTIFICATION_EVENT_TYPES = {
  ACCOUNT_REGISTRATION: "Account Registration",
  BOOKING_REQUEST: "Booking Request",
  BOOKING_ACCEPTANCE_OR_REJECTION: "Booking Acceptance or Rejection",
  SCHEDULE_OR_SERVICE_UPDATE: "Schedule or Service Update",
  PAYMENT_STATUS_CHANGE: "Payment Status Change",
  SERVICE_COMPLETION: "Service Completion",
  REVIEW_REQUEST: "Review Request",
  DISPUTE_UPDATE: "Dispute Update",
  EARNINGS_UPDATE: "Earnings Update",
  PAYOUT_UPDATE: "Payout Update",
  OTHER: "Other"
};

const NOTIFICATION_CHANNELS = {
  IN_APP: "In-App",
  PUSH: "Push",
  EMAIL: "Email",
  SMS: "SMS"
};

const NOTIFICATION_STATUSES = {
  SUBMITTED: "Submitted",
  DELIVERED: "Delivered",
  READ: "Read",
  FAILED: "Failed"
};

const AUDIT_EVENT_TYPES = {
  AUTHENTICATION_AND_SECURITY: "Authentication and Security",
  APPLICATION: "Application",
  ADMINISTRATIVE_AUDIT: "Administrative Audit",
  TRANSACTION: "Transaction",
  INTEGRATION_AND_NOTIFICATION: "Integration and Notification",
  AI_OPERATIONAL: "AI Operational",
  PERFORMANCE_AND_AVAILABILITY: "Performance and Availability"
};

const AUDIT_OUTCOMES = {
  SUCCESS: "SUCCESS",
  FAILURE: "FAILURE",
  DENIED: "DENIED"
};

module.exports = {
  USER_ROLES,
  USER_STATUSES,
  CUSTOMER_STATUSES,
  PROVIDER_TYPES,
  PROVIDER_VERIFICATION_STATUSES,
  PROVIDER_ACCOUNT_STATUSES,
  CATEGORY_STATUSES,
  SERVICE_STATUSES,
  PRICING_TYPES,
  AVAILABILITY_STATUSES,
  BOOKING_STATUSES,
  SCHEDULE_STATUSES,
  COMMUNICATION_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  COMMISSION_TYPES,
  COMMISSION_RULE_STATUSES,
  COMMISSION_STATUSES,
  EARNINGS_STATUSES,
  PAYOUT_METHODS,
  PAYOUT_STATUSES,
  SERVICE_COMPLETION_STATUSES,
  REVIEW_STATUSES,
  REVIEW_MODERATION_STATUSES,
  DISPUTE_CATEGORIES,
  DISPUTE_STATUSES,
  DISPUTE_RESOLUTION_OUTCOMES,
  DISPUTE_EVIDENCE_TYPES,
  NOTIFICATION_EVENT_TYPES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUSES,
  AUDIT_EVENT_TYPES,
  AUDIT_OUTCOMES
};
