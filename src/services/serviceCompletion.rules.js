// Pure business rules for Service Completion (no database access, fully unit-testable).
const { SERVICE_COMPLETION_STATUSES: S, BOOKING_STATUSES: B } = require("../constants/enums");

// Visual / logical order of a normal job.
const PROGRESS_FLOW = [S.ACCEPTED, S.CONFIRMED, S.ON_THE_WAY, S.STARTED, S.IN_PROGRESS, S.COMPLETED];

// Statuses the provider may move a job to, per current status.
const PROVIDER_TRANSITIONS = {
  [S.ACCEPTED]: [S.CONFIRMED, S.ON_THE_WAY, S.CANCELLED],
  [S.CONFIRMED]: [S.ON_THE_WAY, S.STARTED, S.CANCELLED],
  [S.ON_THE_WAY]: [S.STARTED, S.CANCELLED],
  [S.STARTED]: [S.IN_PROGRESS, S.COMPLETED, S.CANCELLED],
  [S.IN_PROGRESS]: [S.COMPLETED, S.CANCELLED],
  [S.COMPLETED]: [],
  [S.CANCELLED]: [],
  [S.DISPUTED]: [],
  [S.REQUESTED]: []
};

// Transitions only the Dispute module may trigger through markDisputed().
const DISPUTE_FROM = [S.STARTED, S.IN_PROGRESS, S.COMPLETED];

const TERMINAL = [S.COMPLETED, S.CANCELLED, S.DISPUTED];

const PROVIDER_SETTABLE = Object.values(S).filter((s) => ![S.REQUESTED, S.ACCEPTED, S.DISPUTED].includes(s));

const allowedNextStatuses = (current) => PROVIDER_TRANSITIONS[current] || [];

const canProviderTransition = (from, to) => allowedNextStatuses(from).includes(to);

const canDispute = (from) => DISPUTE_FROM.includes(from);

const isTerminal = (status) => TERMINAL.includes(status);

// 0-100 progress for the stepper / progress bar.
const progressPercent = (status) => {
  if (status === S.CANCELLED) return 0;
  if (status === S.DISPUTED) return 100;
  const idx = PROGRESS_FLOW.indexOf(status);
  return idx < 0 ? 0 : Math.round((idx / (PROGRESS_FLOW.length - 1)) * 100);
};

// Booking status that matches a completion status (Booking is owned by Developer 08;
// the completion module only requests these transitions).
// requireCustomerConfirmation: the booking only becomes Completed after the customer confirms.
const bookingStatusFor = (status, { requireCustomerConfirmation = false, customerConfirmed = false } = {}) => {
  switch (status) {
    case S.ACCEPTED:
      return B.ACCEPTED;
    case S.CONFIRMED:
    case S.ON_THE_WAY:
      return B.CONFIRMED;
    case S.STARTED:
    case S.IN_PROGRESS:
      return B.IN_PROGRESS;
    case S.COMPLETED:
      return requireCustomerConfirmation && !customerConfirmed ? B.IN_PROGRESS : B.COMPLETED;
    case S.CANCELLED:
      return B.CANCELLED;
    case S.DISPUTED:
      return B.DISPUTED;
    default:
      return null;
  }
};

// Booking statuses from which tracking may begin.
const TRACKABLE_BOOKING_STATUSES = [B.ACCEPTED, B.CONFIRMED];

// Review unlocks once the job is complete and (when required) confirmed by the customer.
const reviewEligible = (status, { requireCustomerConfirmation = false, customerConfirmed = false } = {}) =>
  status === S.COMPLETED && (!requireCustomerConfirmation || customerConfirmed);

module.exports = {
  PROGRESS_FLOW,
  PROVIDER_TRANSITIONS,
  PROVIDER_SETTABLE,
  TRACKABLE_BOOKING_STATUSES,
  allowedNextStatuses,
  canProviderTransition,
  canDispute,
  isTerminal,
  progressPercent,
  bookingStatusFor,
  reviewEligible
};
