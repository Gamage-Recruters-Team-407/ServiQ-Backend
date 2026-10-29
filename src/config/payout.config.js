// PROVISIONAL: The leader/client has not finalized the payout rules.
// Change the rules only here. Do not hard-code them elsewhere.

const MIN_PAYOUT_AMOUNT = Number(process.env.PAYOUT_MIN_AMOUNT) || 1000;
const CURRENCY = "LKR";

// MOCK: Dev 01 (Auth) remove that after ready
const MOCK_PROVIDER_ID = "665f00000000000000000001";
const MOCK_PROVIDER_USER_ID = "665f00000000000000000002";
const MOCK_ADMIN_ID = "665f00000000000000000099";

module.exports = { MIN_PAYOUT_AMOUNT, CURRENCY, MOCK_PROVIDER_ID, MOCK_PROVIDER_USER_ID, MOCK_ADMIN_ID };