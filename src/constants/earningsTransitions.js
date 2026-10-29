const { EARNINGS_STATUSES: S } = require("./enums");

// PROVISIONAL: transitions are pending client approval (requirements 21.5).
// Keep this the single place to change once the approved graph is confirmed.
const EARNINGS_STATUS_TRANSITIONS = {
  [S.PENDING]: [S.CALCULATED, S.ON_HOLD, S.REVERSED],
  [S.CALCULATED]: [S.CONFIRMED, S.ON_HOLD, S.ADJUSTED, S.PARTIALLY_ADJUSTED, S.REVERSED],
  [S.CONFIRMED]: [S.AVAILABLE, S.ON_HOLD, S.ADJUSTED, S.PARTIALLY_ADJUSTED, S.REVERSED],
  [S.AVAILABLE]: [S.ON_HOLD, S.PAID_OUT, S.ADJUSTED, S.PARTIALLY_ADJUSTED, S.REVERSED],
  [S.ON_HOLD]: [S.PENDING, S.CALCULATED, S.CONFIRMED, S.AVAILABLE, S.ADJUSTED, S.REVERSED],
  [S.PARTIALLY_ADJUSTED]: [S.CONFIRMED, S.AVAILABLE, S.ON_HOLD, S.ADJUSTED, S.REVERSED],
  [S.ADJUSTED]: [S.CONFIRMED, S.AVAILABLE, S.ON_HOLD, S.REVERSED],
  [S.PAID_OUT]: [S.REVERSED],
  [S.REVERSED]: []
};

function isValidEarningsTransition(from, to) {
  if (from === to) return true;
  return (EARNINGS_STATUS_TRANSITIONS[from] || []).includes(to);
}

module.exports = { EARNINGS_STATUS_TRANSITIONS, isValidEarningsTransition };
