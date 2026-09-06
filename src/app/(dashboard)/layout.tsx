import type { ReactNode } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"

import { hasAdminSurfaceAccess } from "@/lib/auth/admin-surface"
import { getAuthUser } from "@/lib/auth/get-auth-user"
import { getCurrentMembership } from "@/lib/auth/get-current-membership"
import { hasPermission } from "@/lib/auth/has-permission"
import { permissions } from "@/lib/permissions/permissions"
import { ensureDefaultAttendancePolicy } from "@/modules/attendance/services/policy"
import { NotificationBell } from "@/modules/notifications/ui/notification-bell"
import { ensureDefaultRoleGrants } from "@/modules/organizations/ensure-permissions"
import { ensureDefaultSchedulingPolicy } from "@/modules/organizations/services/ensure-scheduling-policy"
import { db } from "@/prisma/db"

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }

  const membership = await getCurrentMembership()

  if (!membership) {
    redirect("/onboarding")
  }

  await ensureDefaultRoleGrants(db.orm, membership.organizationId)
  await ensureDefaultSchedulingPolicy(db.orm, membership.organizationId)
  await ensureDefaultAttendancePolicy(db.orm, membership.organizationId)

  if (!(await hasAdminSurfaceAccess(membership))) {
    redirect("/forbidden")
  }
  const [
    canManageRosters,
    canManageStaff,
    canManageShifts,
    canManageDepartments,
    canReviewLeave,
    canReviewSwaps,
    canViewSettings,
    canViewAudit,
    canViewDeliveries,
    canViewAttendance,
  ] = await Promise.all([
    Promise.all([
      hasPermission(membership, permissions.rosterCreate),
      hasPermission(membership, permissions.rosterEdit),
      hasPermission(membership, permissions.rosterReview),
      hasPermission(membership, permissions.rosterPublish),
      hasPermission(membership, permissions.rosterAmend),
    ]).then((flags) => flags.some(Boolean)),
    Promise.all([
      hasPermission(membership, permissions.staffCreate),
      hasPermission(membership, permissions.staffEdit),
      hasPermission(membership, permissions.staffDeactivate),
    ]).then((flags) => flags.some(Boolean)),
    Promise.all([
      hasPermission(membership, permissions.shiftCreate),
      hasPermission(membership, permissions.shiftEdit),
      hasPermission(membership, permissions.shiftDeactivate),
    ]).then((flags) => flags.some(Boolean)),
    Promise.all([
      hasPermission(membership, permissions.departmentCreate),
      hasPermission(membership, permissions.departmentEdit),
      hasPermission(membership, permissions.departmentDelete),
    ]).then((flags) => flags.some(Boolean)),
    Promise.all([
      hasPermission(membership, permissions.leaveApprove),
      hasPermission(membership, permissions.leaveReject),
    ]).then((flags) => flags.some(Boolean)),
    Promise.all([
      hasPermission(membership, permissions.shiftSwapApprove),
      hasPermission(membership, permissions.shiftSwapReject),
    ]).then((flags) => flags.some(Boolean)),
    hasPermission(membership, permissions.settingsView),
    hasPermission(membership, permissions.auditView),
    hasPermission(membership, permissions.notificationsView),
    hasPermission(membership, permissions.attendanceView),
  ])

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <p className="text-sm font-medium text-foreground">
            {String(membership.organization.name)}
          </p>
          <nav className="flex flex-wrap items-center gap-4 text-sm">
            <Link
              className="text-foreground underline-offset-4 hover:underline"
              href="/dashboard"
            >
              Dashboard
            </Link>
            <Link
              className="text-foreground underline-offset-4 hover:underline"
              href="/me"
            >
              My work
            </Link>
            {canManageRosters ? (
              <Link
                className="text-foreground underline-offset-4 hover:underline"
                href="/rosters"
              >
                Rosters
              </Link>
            ) : null}
            {canManageStaff ? (
              <Link
                className="text-foreground underline-offset-4 hover:underline"
                href="/staff"
              >
                Staff
              </Link>
            ) : null}
            {canManageShifts ? (
              <Link
                className="text-foreground underline-offset-4 hover:underline"
                href="/shifts"
              >
                Shifts
              </Link>
            ) : null}
            {canReviewLeave ? (
              <Link
                className="text-foreground underline-offset-4 hover:underline"
                href="/leave"
              >
                Leave
              </Link>
            ) : null}
            {canReviewSwaps ? (
              <Link
                className="text-foreground underline-offset-4 hover:underline"
                href="/shift-swaps"
              >
                Swaps
              </Link>
            ) : null}
            {canManageDepartments ? (
              <Link
                className="text-foreground underline-offset-4 hover:underline"
                href="/departments"
              >
                Departments
              </Link>
            ) : null}
            {canManageDepartments ? (
              <Link
                className="text-foreground underline-offset-4 hover:underline"
                href="/professions"
              >
                Professions
              </Link>
            ) : null}
            {canViewSettings ? (
              <Link
                className="text-foreground underline-offset-4 hover:underline"
                href="/settings"
              >
                Settings
              </Link>
            ) : null}
            {canViewDeliveries ? (
              <Link
                className="text-foreground underline-offset-4 hover:underline"
                href="/notifications/deliveries"
              >
                Deliveries
              </Link>
            ) : null}
            {canViewAttendance ? (
              <Link
                className="text-foreground underline-offset-4 hover:underline"
                href="/attendance"
              >
                Attendance
              </Link>
            ) : null}
            {canViewAudit ? (
              <Link
                className="text-foreground underline-offset-4 hover:underline"
                href="/audit"
              >
                Audit
              </Link>
            ) : null}
            <NotificationBell timeZone={String(membership.organization.timezone)} />
          </nav>
        </div>
      </header>
      {children}
    </div>
  )
}
