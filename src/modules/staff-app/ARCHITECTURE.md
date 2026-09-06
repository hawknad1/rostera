# Staff PWA and self-service

Phase 3M adds a staff workplace at `/me`. Admin staff directory remains at `/staff`. The two surfaces must not be confused: `/staff` is HR administration; `/me` is the authenticated staff member’s own roster, leave, swaps, and notifications.

```
Supabase auth.users
        ↓
Rostera User
        ↓
ACTIVE OrganizationMember
        ↓
StaffProfile.userId = User.id
AND StaffProfile.organizationId = membership.organizationId
```

A `StaffProfile` can exist without a login. Only a profile linked to the current user in the current organization may use self-service. Pages and services never trust client-supplied `staffId`, `organizationId`, or `userId` as identity.

## Why `/me` instead of `/staff`

`src/app/(dashboard)/staff` already occupies `/staff`. A second `src/app/staff` route group would collide. The staff PWA therefore lives in `src/app/(staff-app)/me`.

## Authorization

Identity is resolved in `src/modules/staff-app/services/identity.ts`.

| State | Read | Leave/swap mutations |
| --- | --- | --- |
| No membership | Redirect to existing login/onboarding | — |
| Membership, no linked profile | Unlinked message | Rejected |
| Linked, `TERMINATED` | Historical published data | Rejected |
| Linked, not `ACTIVE` | Published own data | Rejected |
| Linked, `ACTIVE` | Published own data | Existing leave/swap services |

STAFF role permissions are unchanged. Administrative routes live under `src/app/(dashboard)` and are gated by `requireAdminSurface` / `hasAdminSurfaceAccess` in that layout, in addition to existing page-level `requirePermission` checks.

Admin surface access is granted when the membership has **any permission outside** the default STAFF self-service set (`roster.view`, `staff.view`, `leave.view`, `leave.create`, `shift_swap.view`, `shift_swap.request`). That admits SUPERVISOR, HR, DEPARTMENT_HEAD, ROSTER_MANAGER, and SUPER_ADMIN without checking a role name. A STAFF user who directly opens `/rosters`, `/staff`, `/settings`, `/audit`, `/dashboard`, or other dashboard routes is redirected to `/forbidden`.

Reads do not write audit events. Mutations go through existing leave and swap services, which keep their audit and notification side effects.

## Published roster selection

Staff reads use `selectCurrentPublishedRosters` in `src/modules/rosters/services/versions.ts`:

- Group rosters by `seriesId`
- Keep the highest `versionNumber` among rows with `status = PUBLISHED`
- Ignore `DRAFT` and `IN_REVIEW`, even if they have a higher version number

After an amendment is published, staff see that version only. V1 and V2 assignments are not merged. Historical published versions remain visible only to authorized admin version-history UI.

## Offline and PWA

- Manifest: `src/app/manifest.ts` (`name` Rostera, `start_url` `/me`, `display` standalone)
- Service worker: `public/sw.js`, registered from the staff layout with scope `/me`
- Shared Cache Storage holds **only** static assets (`/_next/static/`, icons, manifest). Policy: `src/modules/staff-app/sw-cache-policy.ts`
- Authenticated `/me` HTML, navigations, and RSC payloads are **never** written to Cache Storage, so User B cannot be shown User A’s page after a logout/login on the same device
- Structured cache: `localStorage` key `rostera:staff-offline:v1:{userId}:{organizationId}`; reads use `staffCacheForIdentity` and return nothing for another user or organization
- POST/mutations are never cached or queued

Cached when viewed:

- Own published roster metadata
- Own assignments and shift details
- Own notification previews

Not cached:

- Other staff schedules
- Other staff leave
- Audit logs
- Scheduling policies
- Staffing requirements
- Draft/admin roster data

Mutations are online-only. There is no offline queue. The UI shows: `You're offline. Reconnect to submit this request.`

Online data always comes from the database. The cache is a fallback. An offline banner includes the last cache timestamp in the organization timezone.

## Leave, swaps, notifications

No duplicate tables or notification types. Staff actions call `createLeave`, `cancelLeave`, `createSwap`, `cancelSwap`, and the existing inbox services. Staff leave/swap actions omit trusted identity fields and call `requireMutableStaff` first.

Swap requests remain requests. Completing a swap against a published roster still requires an amendment (`SWAP_REQUIRES_AMENDMENT`) inside the existing swap module.

Staff notification “Open” uses `/me/leave/...`, `/me/swaps/...`, `/me/roster`, and `/me/attendance`. Admin notification deep links are unchanged.

## PWA testing

Service-worker registration and Cache Storage are not covered by Vitest in a browser. Shared vs personalized cache eligibility is unit-tested in `sw-cache-policy.test.ts`. The service worker deletes previous Cache Storage entries on activate so any earlier `/me` HTML cache is dropped.
