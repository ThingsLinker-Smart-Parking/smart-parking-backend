# API Surface Overview

Base URL: `/api`

## Authentication (`/auth`)
- `POST /signup` — register new user (roles: user/admin) and trigger OTP.
- `POST /login` — email/password auth, returns JWT + profile.
- `POST /verify-otp` — confirm account using 6-digit code.
- `POST /forgot-password` — request OTP for password reset.
- `POST /reset-password` — update password with OTP.
- `POST /resend-otp` — resend verification or reset OTP.
- `GET /otp-config` — admin view of OTP settings.
- `GET /email-config` — admin view of sanitized mailer config.
- `POST /recover-account` — regeneration path for unverified accounts.
- `POST /create-test-users` — dev-only shortcut for seeded super admin/admin/user.

## Gateways (`/gateways`)
- Webhooks (no auth):
  - `POST /webhook/node-status` — ingest device telemetry.
  - `POST /webhook/gateway-status` — ingest gateway telemetry.
- Admin-only:
  - `GET /available` — list unlinked gateways ready to claim.
  - `GET /my-gateways` — gateways linked to current admin.
  - `POST /link` — claim a gateway by UUID.
  - `POST /:id/unlink` — release claimed gateway.
  - `POST /:id/assign-parking-lot` — bind to parking lot.
  - `POST /nodes` — create node under owned gateway.
  - `GET /:id/nodes` — fetch nodes for a gateway.
  - `GET /statistics` — aggregated metrics (admin/super admin).
- Super admin:
  - `POST /` — create gateway with ChirpStack metadata.
  - `GET /` — list gateways (optionally include inactive).
  - `GET /:id` — detailed gateway + nodes.
  - `PUT /:id` — update metadata / activation.
  - `DELETE /:id` — remove gateway.

## Nodes (`/nodes`)
- `GET /` — list nodes with status.
- `POST /` — create node mapped to gateway + slot.
- `GET /:nodeId` — retrieve node.
- `DELETE /:nodeId` — remove node.
- `PUT /:nodeId/status` — update status (distance/percentage/battery).

## Parking Slots (`/parking-slots`)
Admin-only across endpoints:
- `GET /floor/:floorId` — slots for a floor.
- `GET /:id` — slot details.
- `POST /floor/:floorId` — create slot.
- `POST /floor/:floorId/bulk` — bulk create slots.
- `PUT /:id` — update slot name/reservable flags.
- `DELETE /:id` — delete slot (requires no node binding).
- `POST /:id/assign-node` — attach node to slot.
- `POST /:id/unassign-node` — detach node.
- `GET /:id/status` — latest status + history.

## Additional Route Files (not wired in `app.ts`)
`src/routes` also defines parking lots, floors, subscription plans, and subscription lifecycle endpoints. They include CRUD, analytics, and payment webhook flows, but the simplified `app.ts` currently mounts only auth, nodes, gateways, and parking-slots. Mount these routes before use or expose via API gateway layer.
