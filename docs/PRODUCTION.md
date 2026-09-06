# Rostera production operations

This document is the Phase 3R production-hardening record: security model, deployment, recovery, route classification, and accepted limitations.

## Security model

### Authentication

Supabase Auth is the only authentication system. `auth.users` is the identity source of truth. Rostera `User` is application identity (`authProviderId`). Sessions are verified with `getUser()` / `getClaims()`, not an untrusted client session blob.

### Authorization

Every organization-scoped read/write goes through:

authenticated user → Rostera user → **active** membership in an **ACTIVE** organization → permission → resource `organizationId`

Client-supplied organization, membership, role, staff, roster, and invitation IDs are never trusted. UI hiding is not authorization.

### Active organization

Cookie `rostera_active_organization` is httpOnly, SameSite=Lax, Secure in production. It is a hint only. `resolveMembership()` validates it against the user's ACTIVE memberships on every server boundary.

### Tenant isolation

Operational data is resolved from the active organization. Cross-organization IDs must fail closed (`NOT_FOUND` / `FORBIDDEN`). RLS is enabled on domain tables as defense-in-depth for a restricted database role; the current Prisma connection is privileged, so **application checks remain authoritative**.

### Roles and permissions

System roles are protected. Custom roles cannot receive invented permission keys. Last-admin protection locks the organization row in the same transaction before demotion/deactivation.

## Route classification

| Class | Routes | Control |
| --- | --- | --- |
| Public | `/`, `/login`, `/auth/*`, static assets, `/sw.js`, `/manifest.webmanifest`, `/invite/accept` | No session required. Invite accept still requires authentication to create a membership. |
| Authenticated app | dashboard, staff PWA, onboarding, settings | Supabase session + membership resolution |
| Permission-protected | domain mutations and exports | `requirePermission` / domain `require*Access` |
| Internal secret | `POST /api/internal/notifications/drain` | Bearer `NOTIFICATION_WORKER_SECRET`, fail-closed |
| Webhook | `POST /api/webhooks/twilio/status` | Twilio HMAC signature; production requires `TWILIO_STATUS_CALLBACK_URL` |

There is no public organization data API.

## Environment

Required in production:

- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Required for workers/webhooks when those features are used:

- `NOTIFICATION_WORKER_SECRET`
- `TWILIO_AUTH_TOKEN` and `TWILIO_STATUS_CALLBACK_URL` for SMS/WhatsApp receipts

Optional (fail closed per channel, do not crash unrelated pages):

- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- `TWILIO_ACCOUNT_SID`, `TWILIO_FROM_NUMBER`, `TWILIO_WHATSAPP_FROM`, `TWILIO_CONTENT_SID`

`NEXT_PUBLIC_*` must never hold server secrets. Invitation emails use `NEXT_PUBLIC_APP_URL`.

See `.env.example`.

## Notification worker

Call `POST /api/internal/notifications/drain` on a schedule (Vercel cron or equivalent) with the worker secret.

Safe if the worker starts twice, crashes, or is delayed: outbox/delivery leases reclaim `PROCESSING` rows older than 120 seconds. External send is **at-least-once**. Database uniqueness prevents duplicate inbox/outbox/delivery/receipt rows. Do not promise exactly-once provider delivery.

In-process drain after a domain mutation is a best-effort hint. Durable processing depends on the scheduled drain. Serverless in-memory rate limits are **not** used and would not be globally consistent on Vercel.

## Deployment

1. Set production environment variables.
2. `npm run build`
3. Apply committed migrations (`npx prisma db migrate`). Do not generate schema at application startup. Do not run destructive operations automatically.
4. `npx prisma db verify` against production (or staging that mirrors it).
5. Configure cron for `/api/internal/notifications/drain`.

Fresh databases replay `migrations/` from empty. Do not edit applied migration history.

## Recovery

- PostgreSQL/Supabase point-in-time backup is the data recovery mechanism. Rostera does not ship a custom backup product.
- Restore the database, then confirm `prisma db verify` matches the deployed contract.
- Provider outage: business transactions still commit; outbox retries until max attempts, then the delivery is permanently failed. Re-run drain after the provider recovers.
- Lost worker secret: rotate the env var; old callers get 401.

## HTTP security

`next.config.ts` sets CSP, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`, and HSTS in production. CSP allows Supabase and Next.js inline/eval scripts. Tighten later if a nonce-based Next CSP is adopted.

GET CSV exports reject `Sec-Fetch-Site: cross-site` and send `Cache-Control: private, no-store`. Missing fetch-site headers (curl, tests, older browsers) are allowed.

## Rate limits that exist

- Invitation resend: 10-minute cooldown (database).
- Invitation create: 20 per administrator per organization per 15 minutes (database).
- Login brute force: Supabase Auth, not an in-app limiter.

No Redis or globally consistent API limiter is deployed. Do not treat in-process maps as production protection on Vercel.

## Operational limits

- Interactive reports: 93-day range.
- Report export: 10,000 rows.
- Memberships/invitations lists: 25 per page after in-memory filter.
- Custom role `permissionKeys`: max 100 entries.

## Manual QA

Automated tests cover tenant isolation, invitations, last-admin sequential cases, RBAC, exports, webhooks, and PWA cache policy. **Browser click-through of the following was not performed in Phase 3R:**

- login / logout / expired session
- create / select / switch / suspend / reactivate organization
- invite / accept / resend / revoke
- staff link/unlink
- roster create → publish → amend
- leave and swap approval
- attendance clock-in/out
- in-app and email notification receipt
- report export from the UI
- PWA install, offline roster, identity switch

## Known limitations

- No physical organization deletion, billing, or platform operator console.
- No Resend delivery receipts.
- WhatsApp may need a production Content SID.
- No email→SMS fallback.
- Notification worker is scheduled HTTP drain, not a dedicated queue.
- Prisma 8 equality/`where` still requires some in-memory filtering (reports, audit, swaps, invitations).
- Reporting 93-day interactive cap and 10k export cap.
- No historical scheduling-validation snapshot.
- No charts.
- No offline mutation queue (PWA remains read-only offline).
- RLS policies are not defined; privileged DB role bypasses RLS.
- Leave overlap and pending-swap uniqueness are serialized with row locks, not gist/partial-unique constraints (Prisma 8 cannot express those constraints in the contract).
- Last-admin concurrency is serialized with an organization row lock; not proven in the in-memory test ORM.
- Sentry and PostHog are not integrated.
- Playwright is configured (`npx playwright test`, Chromium). Authenticated and PWA identity-switch tests skip unless `E2E_*` credentials are set.
- `npm audit` reports high issues in Prisma CLI / Composer / Hono / lodash **transitive** packages. The suggested fix installs Prisma 7, which is forbidden in this phase. These packages are not on the Next.js request path. Revisit after a Prisma 8 stable CLI that does not pull vulnerable Hono.
