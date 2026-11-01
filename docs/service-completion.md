# Service Completion module (Developer 15)

Base path: `/api/service-completions`. All routes need `Authorization: Bearer <token>`.
Response envelope: `{ success, data, meta? }`. Errors: `{ success:false, message, code, details? }`.

| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | `/` | Provider | Start tracking an **Accepted / Confirmed** booking. Body `{ booking_id }`. 201 |
| GET | `/` | Provider, Customer, Admin | Role-scoped list. Query: `status`, `scope=active\|finished`, `booking_id`, `page`, `limit` (max 50) |
| GET | `/booking/:bookingId` | Participants, Admin | Record for a booking (404 `COMPLETION_NOT_FOUND` if tracking not started) |
| GET | `/:id` | Participants, Admin | One record |
| PATCH | `/:id` | Provider **or** Customer | Provider: `{ status, notes?, evidence_urls? }` or `{ notes?, evidence_urls? }`. Customer: `{ confirm_completion: true }` |

## Status flow (provider)
`Accepted -> Confirmed -> On the Way -> Started -> In Progress -> Completed`, and `Cancelled` from any non-final step.
Illegal jumps return `409 INVALID_TRANSITION` with `details.allowed`. `Disputed` is set only by Developer 17 through
`getDefaultService().markDisputed(bookingId, { actorId, actorRole, reason })` (not exposed over HTTP).

Rules: `Completed` needs notes (>= 10 chars). `Cancelled` needs a reason (>= 5 chars). Evidence = up to 5 http(s) links
(file storage is a pending project decision).

## Booking sync
Every status change asks the Booking owner (Dev 08) to move the booking: Confirmed/On the Way -> `Confirmed`,
Started/In Progress -> `In Progress`, Completed -> `Completed`, Cancelled -> `Cancelled`, Disputed -> `Disputed`.
The default adapter in `serviceCompletion.service.js` (`bookings.setStatus`) updates the Booking model directly; swap it for
Dev 08's interface when it exists. If the booking update fails, the completion change is rolled back.

## Pending decision: customer confirmation
`REQUIRE_CUSTOMER_CONFIRMATION` (default `false`).
- `false`: provider completion finishes the booking and unlocks reviews immediately; customer confirmation is optional.
- `true`: booking stays `In Progress` and reviews stay locked until the customer confirms.

## Interfaces for other modules
- Reviews (Dev 16): a booking may be reviewed when its record has `review_eligibility: true` (`review_eligible` in the API).
- Earnings (Dev 18): completed jobs have `current_status: "Completed"`.
- Notifications / audit: written through `services/notification.service.js` and `services/audit.service.js`
  (Dev 24 can replace the internals, the function signatures should stay).
- Auth: `middlewares/auth.js` exports `authenticate` and `authorize(...roles)` and sets `req.user = { id, role }`.
  It is a working placeholder for Dev 01's real middleware.

## Tests
`npm test` runs rules and service tests (in-memory fake data layer, no MongoDB needed).
