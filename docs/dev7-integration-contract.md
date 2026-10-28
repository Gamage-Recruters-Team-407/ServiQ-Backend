
# Developer 07 — Provider Comparison Integration Contract

## Status
Proposed integration contract. Requires agreement with module owners.

## Endpoint
GET /api/compare

### Query Parameters

| Parameter | Type | Description |
|---|---|---|
| ids | string | 2–3 comma-separated provider ObjectIds |
| categoryId | string | Optional category ObjectId |
| serviceName | string | Optional service name; requires categoryId |
| date | string | Optional date in YYYY-MM-DD format |

Maximum comparison limit: 3 (provisional).

## Authentication

- Authenticated Customer or authorized Administrator.
- Use shared authentication middleware from Developer 01.
- Do not expose private or restricted provider information.

## Required Owner Interfaces

### Developer 04 — Provider Profiles

getProvidersByIds({ providerIds })

Expected result:
- _id
- provider_type
- account_status
- verification_status
- experience.years_of_experience
- coverage_area
- publicDisplayName

Only eligible providers should be included.

The provider owner must supply an approved public display name.

### Developers 03/05 — Provider Services

getServicesByProviderIds({ providerIds, categoryId })

Expected result:
- _id
- provider_id
- category_id
- name
- status
- price.amount
- price.currency
- price.pricing_type

Only active services may be compared.

Service-name matching is provisional until a canonical
service identifier is agreed upon.

### Developer 16 — Ratings and Reviews

getRatingSummariesByProviderIds({ providerIds })

Expected result:
- provider_id
- average
- count

Use only approved, customer-visible rating information.

### Developer 10 — Scheduling and Availability

getAvailabilitySummariesByProviderIds({ providerIds, date })

Expected result:
- provider_id
- date
- status
- isAvailable

Availability must account for scheduling rules and
existing bookings.

Missing availability must not be represented as available.

## Security and Ownership

- Read-only operations.
- No direct changes to models owned by other developers.
- No private emails, phone numbers, bank details,
  verification documents, or administrative notes.
- Preserve selected provider order.
- Reject invalid or duplicate provider IDs.
- Reject unavailable or ineligible providers.
- Use approved owner service interfaces.

## Pending Decisions

- Final comparison limit.
- Canonical service identification.
- Public display-name source.
- Rating summary source.
- Date-specific availability rules.
- Shared authentication middleware and authorization guards.

## Integration Dependencies

Developer 01: Authentication
Developer 03/05: Services and pricing
Developer 04: Provider profiles
Developer 10: Availability
Developer 16: Ratings and reviews

## Final Integration

Register GET /api/compare only after the real owner
interfaces and authentication middleware are available.

No frontend implementation is included in this phase.
