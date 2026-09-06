# QA checklist

Use this during staged/production-like verification. Mark each item:

- VERIFIED
- AUTOMATED ONLY
- NOT VERIFIED
- REQUIRES PRODUCTION CREDENTIALS

## Authentication

- [ ] Login with valid credentials — REQUIRES PRODUCTION CREDENTIALS
- [ ] Login with invalid credentials shows a generic error — VERIFIED (Playwright)
- [ ] Unauthenticated `/dashboard` and `/me` redirect to `/login` with `next` — VERIFIED (Playwright)
- [ ] Sign out returns to login — AUTOMATED ONLY (control exists; live session not run)
- [ ] Expired session — NOT VERIFIED

## Organization

- [ ] Create organization — AUTOMATED ONLY
- [ ] Single-org auto-select — AUTOMATED ONLY
- [ ] Multi-org selection — AUTOMATED ONLY
- [ ] Switch organization — AUTOMATED ONLY
- [ ] Suspend / reactivate — AUTOMATED ONLY
- [ ] No membership → onboarding — AUTOMATED ONLY

## Users and invitations

- [ ] Invite, accept, resend, revoke — AUTOMATED ONLY (service tests); live email click-through REQUIRES PRODUCTION CREDENTIALS
- [ ] Last-admin protection — AUTOMATED ONLY (sequential + org row lock)
- [ ] STAFF cannot invite or edit org settings — AUTOMATED ONLY
- [ ] Cross-org invitation/role IDs fail — AUTOMATED ONLY

## Staff / shifts / rosters

- [ ] Staff CRUD, link/unlink — AUTOMATED ONLY
- [ ] Overnight shift types — AUTOMATED ONLY
- [ ] Draft → review → publish — AUTOMATED ONLY
- [ ] Amendments / historical versions — AUTOMATED ONLY
- [ ] Leave overlap and approved-leave blocking — AUTOMATED ONLY
- [ ] Shift swaps on published rosters — AUTOMATED ONLY

## Attendance / reports / audit

- [ ] Clock in/out identity — AUTOMATED ONLY
- [ ] Open-session uniqueness — AUTOMATED ONLY + PostgreSQL unique probe
- [ ] Report CSV BOM, formula prefix, export permission — AUTOMATED ONLY
- [ ] Cross-site GET export rejected — AUTOMATED ONLY
- [ ] Audit events for mutations — AUTOMATED ONLY

## Notifications

- [ ] In-app isolation and mark-read — AUTOMATED ONLY
- [ ] Outbox in the same transaction — AUTOMATED ONLY
- [ ] Drain 401 without secret — VERIFIED (Playwright)
- [ ] Twilio signature 401 — VERIFIED (Playwright)
- [ ] Live Resend/Twilio/WhatsApp send — REQUIRES PRODUCTION CREDENTIALS

## PWA

- [ ] `/sw.js` and manifest public, `/me` excluded from SW cache policy — VERIFIED (script + unit tests)
- [ ] Service worker registers for a signed-in staff user — REQUIRES PRODUCTION CREDENTIALS
- [ ] Offline read of cached static assets — NOT VERIFIED
- [ ] Offline clock-in does not pretend to succeed — NOT VERIFIED
- [ ] Staff A → sign out → Staff B identity-switch — REQUIRES PRODUCTION CREDENTIALS

## Accessibility / responsive

- [ ] Login keyboard tab order — VERIFIED (Playwright desktop + Pixel 7)
- [ ] Login labels — VERIFIED
- [ ] Admin tables, dialogs, staff nav — NOT VERIFIED in a browser

## Operations

- [ ] `npm run build` — run at release
- [ ] `npx prisma db verify` — run at release
- [ ] Worker cron configured — NOT VERIFIED in a hosted environment
- [ ] Supabase PITR / backups — NOT VERIFIED
- [ ] Restore drill — NOT VERIFIED
