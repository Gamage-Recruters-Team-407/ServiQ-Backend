const express = require("express");
const { authenticate, authorize } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const { USER_ROLES } = require("../constants/enums");
const v = require("../validations/serviceCompletion.validation");
const c = require("../controllers/serviceCompletion.controller");

const router = express.Router();

router.use(authenticate);

// POST   /api/service-completions                  provider starts tracking an accepted booking
// GET    /api/service-completions                  role-scoped list (?status, ?scope, ?page, ?limit)
// GET    /api/service-completions/booking/:bookingId   record for a booking (declared before /:id)
// GET    /api/service-completions/:id
// PATCH  /api/service-completions/:id              provider: status / notes / evidence, customer: confirm_completion
router.post("/", authorize(USER_ROLES.PROVIDER), validate({ body: v.createBody }), c.create);
router.get("/", validate({ query: v.listQuery }), c.list);
router.get("/booking/:bookingId", validate({ params: v.bookingParam }), c.getByBooking);
router.get("/:id", validate({ params: v.idParam }), c.getOne);
router.patch(
  "/:id",
  authorize(USER_ROLES.PROVIDER, USER_ROLES.CUSTOMER),
  validate({ params: v.idParam, body: v.updateBody }),
  c.update
);

module.exports = router;
