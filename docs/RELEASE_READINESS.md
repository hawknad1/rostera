# Release readiness

Phase 3S assessment. This document distinguishes **automated evidence**, **real browser evidence**, **live-provider evidence**, and **unverified assumptions**.

## System status

| Check | Result |
| --- | --- |
| Unit/integration (`npm test`) | **618 passed** (78 files) |
| Lint | **passed** |
| Production build | **passed** |
| Database (`npx prisma db verify`) | **passed** (schema matches contract). There is **no** `prisma contract verify` command |
| E2E (`npx playwright test`) | **22 passed, 4 skipped** (Chromium desktop + Pixel 7). Skipped tests need `E2E_*` credentials |
| Dependency audit | 13 issues in Prisma CLI/Hono/lodash transitives; `npm audit fix --force` would install Prisma 7 — **not applied** |

Browser binaries: `npx playwright install chromium`

## Security

| Area | Evidence |
| --- | --- |
| Authentication | Unauthenticated admin and `/me` redirect to login (Playwright). Invalid password shows a generic error (Playwright). Live login **skipped** without credentials. |
| Authorization | Vitest across domain services. STAFF cannot invite or edit org settings. |
| Tenant isolation | Vitest IDOR matrix. Playwright does not log in as two tenants. |
| Headers | Config unit test + Playwright on `/login` (CSP, nosniff, frame, referrer, permissions-policy). HSTS is production-only. |
| Invitation tokens | Hashed at rest; missing/unknown token pages do not dump hashes (Playwright). Live accept **not** browser-tested. |
| Worker/webhook | Drain and Twilio are session-exempt and 401 without secret/signature (Playwright). |
| Exports | Formula prefix, BOM, `reports.export`, cross-site GET block (Vitest). |
| PWA isolation | SW policy unit tests + public `/sw.js` body checks. Identity-switch **not** run in a browser. |

## Infrastructure

| System | Status |
| --- | --- |
| PostgreSQL | Local `db verify` in this environment. Hosted backups **NOT VERIFIED**. |
| Supabase Auth | Used by the app. Live credential E2E **NOT VERIFIED**. |
| Vercel | No `vercel.json` in repo. Deploy process documented in `PRODUCTION.md`, **not** executed here. |
| Notification worker | Code + 401 E2E. Hosted cron **NOT VERIFIED**. |
| Email (Resend) | MOCKED in unit tests. Live send **NOT VERIFIED**. |
| SMS (Twilio) | Signature validation unit + E2E 401. Live send **NOT VERIFIED**. |
| WhatsApp | Same Twilio adapter. Live send **NOT VERIFIED**. |

## Production configuration

Required always: `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Required for features: worker secret; Twilio auth + callback URL for webhooks; Resend keys for email; Twilio from-numbers for SMS/WhatsApp.

Startup: `src/instrumentation.ts` calls `assertProductionConfiguration()` in Node production. Missing names are listed; values are not printed.

This environment’s hosted production variables are **not verified**. Treat configuration as **partially configured / local only**.

## Manual verification

See [`QA_CHECKLIST.md`](./QA_CHECKLIST.md).

## Known limitations

Carried forward from 3R plus 3S:

- Privileged DB role bypasses RLS; isolation is application-layer.
- Bounded in-memory filtering for reports/audit/swaps.
- No globally consistent rate limiter on Vercel.
- No physical org deletion, billing, or platform console.
- No Resend delivery receipts; WhatsApp may need a Content SID.
- Prisma CLI transitive advisories (Hono/lodash). Not runtime Next.js request path. Do not `npm audit fix --force`.
- Last-admin / overlapping leave / pending swap **application** races use row locks. Dual-session Postgres tests against those services were **not** run on the shared app database. Uniqueness probes use TEMP tables.
- Sentry is not integrated.
- Backup restore has not been drilled.
- Authenticated Playwright and PWA identity-switch require `E2E_ADMIN_*` / `E2E_STAFF_*`.

## Release decision

```text
CONDITIONAL GO
```

Automated tenant isolation, authorization, worker/webhook fail-closed behavior, security headers, and unauthenticated browser journeys are in good shape for a **staged** launch.

Do **not** treat this as an unsupervised production GO until:

1. Authenticated Playwright (or equivalent manual QA) covers login, org switch, invite accept, roster publish, leave/swap, attendance, and sign-out.
2. Staff A → Staff B PWA identity-switch is run in a real browser.
3. Notification worker cron and at least one live provider path are proven in the target environment — or those channels stay disabled.
4. Supabase PITR/backups are confirmed for the production project.

## What 3S changed

- Playwright E2E for public/security journeys
- Sign-out control (there was no logout path)
- Production env assertion at Node startup
- PostgreSQL uniqueness probes
- `allowedDevOrigins` for local Playwright
- Windows-safe `postinstall` (removed bash `||`)

## What 3S deliberately did not change

- Prisma 8 architecture
- Domain business semantics
- PWA cache policy
- Notification outbox model
- No Sentry without a DSN
- No Prisma 7 downgrade
