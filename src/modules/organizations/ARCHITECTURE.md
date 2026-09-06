# Organization administration

Rostera’s administrative control plane keeps **User**, **OrganizationMember**, and **Organization** as separate records. A person can belong to several organizations. Operational data is always resolved from the **active organization**, never from the first membership row.

## Active organization

Resolution is server-side (`src/lib/auth/get-current-membership.ts`):

1. Authenticated Supabase user → Rostera `User`.
2. Load `ACTIVE` memberships (role must belong to the same organization).
3. Read `rostera_active_organization` (httpOnly, `SameSite=Lax`). The cookie is a hint only.
4. Use the cookie only when it matches an active membership.

Behavior:

| Memberships | Result |
| --- | --- |
| None | Onboarding (`/onboarding`) |
| One operational organization | Used automatically; cookie written when possible |
| Several operational organizations, valid cookie | That organization |
| Several, missing/invalid cookie | `/select-organization` — no silent guess |
| Selected organization suspended | `/organization-suspended` |
| Cookie for an inaccessible organization | Cookie cleared; fall back to the single remaining operational org, otherwise selection/onboarding |

`getCurrentMembership()` returns a membership only when the organization is **ACTIVE**. Domain services that already call it therefore cannot mutate a suspended tenant. Pages that must still work while suspended (reactivation) use `resolveMembership()` / `requireOrganization({ allowSuspended: true })`.

Organization switching is a server action that re-validates membership and rewrites the cookie. Client state is not authoritative. `localStorage` is not used.

`ACTIVE_ORGANIZATION_CHANGED` is **not** audited. Switching context is not a domain mutation and would be noisy.

## Organization lifecycle

`Organization.status` is `ACTIVE | SUSPENDED | ARCHIVED`.

- **ACTIVE** — normal operation.
- **SUSPENDED** — users can sign in; operational pages and mutations are blocked. Records are preserved. Administrators with `organization.suspend` can reactivate from `/organization-suspended`.
- Physical deletion is not implemented.

Default country `Ghana` and timezone `Africa/Accra` apply only when those fields are omitted at creation. The model is country-agnostic. Timezone values are IANA identifiers.

## Provisioning

Creating an organization is transactional:

organization → default system roles + grants → SUPER_ADMIN membership → scheduling/attendance policy defaults → `ORGANIZATION_CREATED` audit.

The creator becomes `SUPER_ADMIN`. Users may belong to more than one organization. Defaults are additive (`ensureDefaultRoleGrants`).

## Invitations

`OrganizationInvitation` stores a **SHA-256 hash** of a random token, never the raw token. Tokens are single-use, expire after seven days, and are invalidated on revoke/resend.

Acceptance requires:

- pending, unexpired token
- organization `ACTIVE`
- role in that organization and active
- authenticated email (normalized) matches the invitation
- no existing `ACTIVE` membership (suspended/removed memberships may be reactivated)

Email is sent through the existing outbox (`ORGANIZATION_INVITED`). The accept URL (including the token) is in the email payload only, not in audit metadata. In-app notification is skipped because the invitee often has no user row; the email `destination` is the invitee address and `recipientUserId` is the inviter (FK).

Resend issues a new token hash and expiry, and is rate-limited. Revoked invitations cannot be reused.

## Roles

Default roles are **system** roles (`isSystem`). They are not editable or deactivatable. Custom roles are organization-owned. Cross-organization role IDs are rejected.

An organization administrator is an active member whose role is system `SUPER_ADMIN` or has `organization.edit`. The last such member cannot be deactivated or demoted.

## User ↔ StaffProfile

`StaffProfile.userId` is unique **per organization** (`@@unique([organizationId, userId])`), not globally.

A user may have a different workforce record in each organization. Membership grants application access; the staff link is an optional org-scoped workforce identity. Unlinking clears `userId` and deletes neither the user nor the staff profile.

## Permissions

New keys: `organization.view|edit|suspend`, `roles.view|create|edit|deactivate`.

Invitations reuse `users.view` / `users.invite`. `SUPER_ADMIN` receives every registered permission. `HR` can administer users. `ROSTER_MANAGER` can view organization/roles. Department, supervisor, and staff roles do not receive organization-wide administration.

## Tenant isolation

Every mutation checks: authenticated user → active membership → current organization → permission → target `organizationId`. Client-supplied IDs are never trusted. Suspended organizations cannot perform operational mutations, including staff PWA actions that go through `getCurrentMembership()`.
