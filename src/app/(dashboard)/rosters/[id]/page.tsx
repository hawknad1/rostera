import Link from "next/link"
import { notFound } from "next/navigation"

import { hasPermission } from "@/lib/auth/has-permission"
import { requirePermission } from "@/lib/auth/require-permission"
import { permissions } from "@/lib/permissions/permissions"
import { serializeRosterValidation } from "@/modules/rosters/actions/lifecycle-state"
import { RosterError } from "@/modules/rosters/errors"
import { rosterStatusLabels, type RosterStatus } from "@/modules/rosters/labels"
import { listAssignmentFormOptions } from "@/modules/rosters/services/assignments"
import { getRoster } from "@/modules/rosters/services/rosters"
import { validateRoster } from "@/modules/rosters/services/validation"
import { AddAssignmentForm } from "@/modules/rosters/ui/add-assignment-form"
import { EditRosterForm } from "@/modules/rosters/ui/edit-roster-form"
import { RosterLifecycleActions } from "@/modules/rosters/ui/roster-lifecycle-actions"
import { RosterSchedule } from "@/modules/rosters/ui/roster-schedule"
import { RosterValidationSummary } from "@/modules/rosters/ui/roster-validation-summary"

export default async function RosterDetailPage({
  params,
}: PageProps<"/rosters/[id]">) {
  const { id } = await params
  const membership = await requirePermission(permissions.rosterView)

  let roster
  try {
    roster = await getRoster(id)
  } catch (error) {
    if (error instanceof RosterError && error.code === "ROSTER_NOT_FOUND") {
      notFound()
    }
    throw error
  }

  const [canEdit, canReview, canPublish] = await Promise.all([
    hasPermission(membership, permissions.rosterEdit),
    hasPermission(membership, permissions.rosterReview),
    hasPermission(membership, permissions.rosterPublish),
  ])
  const isDraft = roster.status === "DRAFT"
  const isPublished = roster.status === "PUBLISHED"
  const assignmentOptions =
    canEdit && isDraft ? await listAssignmentFormOptions(roster.id) : null

  let validation
  try {
    validation = serializeRosterValidation(await validateRoster(roster.id))
  } catch {
    validation = null
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <Link
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          href="/rosters"
        >
          Back to rosters
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{roster.name}</h1>
        <p className="text-sm text-muted-foreground">
          {roster.departmentName} · {roster.dateRangeLabel} · {rosterStatusLabels[roster.status]} ·{" "}
          {roster.assignmentCount} {roster.assignmentCount === 1 ? "assignment" : "assignments"} ·{" "}
          {roster.coverageLabel}
        </p>
        {validation ? (
          <p className="text-sm text-muted-foreground">
            {validation.summary.blockerCount}{" "}
            {validation.summary.blockerCount === 1 ? "blocker" : "blockers"} ·{" "}
            {validation.summary.warningCount}{" "}
            {validation.summary.warningCount === 1 ? "warning" : "warnings"} · Coverage{" "}
            {validation.coverage.satisfiedCount}/{validation.coverage.requirementCount}
          </p>
        ) : null}
      </div>

      <RosterLifecycleActions
        canEdit={canEdit}
        canPublish={canPublish}
        canReview={canReview}
        rosterId={roster.id}
        status={roster.status as RosterStatus}
      />

      {validation ? (
        <RosterValidationSummary
          showPublishBlockMessage={!isPublished}
          validation={validation}
        />
      ) : null}

      {canEdit && isDraft && assignmentOptions ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Add assignment</h2>
          <AddAssignmentForm
            maxDate={roster.endDate}
            minDate={roster.startDate}
            rosterId={roster.id}
            shiftTypes={assignmentOptions.shiftTypes.map((shiftType) => ({
              id: shiftType.id,
              name: shiftType.name,
              startTime: shiftType.startTime,
              endTime: shiftType.endTime,
            }))}
            staff={assignmentOptions.staff}
          />
        </section>
      ) : null}

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Schedule</h2>
        {isPublished ? (
          <p className="text-sm text-muted-foreground">This published roster is read-only.</p>
        ) : null}
        <RosterSchedule
          assignmentCount={roster.assignmentCount}
          canEdit={canEdit}
          days={roster.days}
          isDraft={isDraft}
        />
      </section>

      {canEdit && isDraft ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Edit roster</h2>
          <EditRosterForm
            roster={{
              id: roster.id,
              name: roster.name,
              startDate: roster.startDate,
              endDate: roster.endDate,
            }}
          />
        </section>
      ) : null}
    </main>
  )
}
