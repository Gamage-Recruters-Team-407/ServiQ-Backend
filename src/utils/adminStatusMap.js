const { CUSTOMER_STATUSES } = require("../constants/enums");

// frontend key -> DB value
const toDb = {
  active: CUSTOMER_STATUSES.ACTIVE,
  inactive: CUSTOMER_STATUSES.INACTIVE,
  suspended: CUSTOMER_STATUSES.SUSPENDED,
  restricted: CUSTOMER_STATUSES.RESTRICTED,
};

// DB value -> frontend key
const toUi = Object.fromEntries(Object.entries(toDb).map(([k, v]) => [v, k]));

module.exports = { toDb, toUi };