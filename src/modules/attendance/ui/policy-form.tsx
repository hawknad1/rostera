"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import {
  updateAttendancePolicyAction,
  type AttendancePolicyActionState,
} from "@/modules/attendance/actions/update-policy"
import type { AttendancePolicyRecord } from "@/modules/attendance/types/attendance"
import { inputClassName, labelClassName, selectClassName } from "@/modules/organizations/ui/form-styles"

export function AttendancePolicyForm({
  policy,
  canEdit,
}: {
  policy: AttendancePolicyRecord
  canEdit: boolean
}) {
  const [state, action, pending] = useActionState<AttendancePolicyActionState, FormData>(
    updateAttendancePolicyAction,
    null,
  )

  return (
    <form action={action} className="flex max-w-xl flex-col gap-6">
      <div>
        <label className={labelClassName} htmlFor="attendance-enabled">
          Attendance tracking
        </label>
        <select
          className={selectClassName}
          defaultValue={policy.attendanceEnabled ? "on" : "off"}
          disabled={!canEdit}
          id="attendance-enabled"
          name="attendanceEnabled"
        >
          <option value="on">Enabled</option>
          <option value="off">Disabled</option>
        </select>
      </div>
      <div>
        <label className={labelClassName} htmlFor="allow-unscheduled">
          Unscheduled attendance
        </label>
        <select
          className={selectClassName}
          defaultValue={policy.allowUnscheduledAttendance ? "on" : "off"}
          disabled={!canEdit}
          id="allow-unscheduled"
          name="allowUnscheduledAttendance"
        >
          <option value="on">Allowed</option>
          <option value="off">Not allowed</option>
        </select>
      </div>
      <div>
        <label className={labelClassName} htmlFor="allow-early">
          Early clock-in
        </label>
        <select
          className={selectClassName}
          defaultValue={policy.allowEarlyClockIn ? "on" : "off"}
          disabled={!canEdit}
          id="allow-early"
          name="allowEarlyClockIn"
        >
          <option value="on">Allowed</option>
          <option value="off">Not allowed</option>
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClassName} htmlFor="late-threshold">
            Late threshold (minutes)
          </label>
          <input
            className={inputClassName}
            defaultValue={policy.lateThresholdMinutes}
            disabled={!canEdit}
            id="late-threshold"
            min={0}
            name="lateThresholdMinutes"
            type="number"
          />
        </div>
        <div>
          <label className={labelClassName} htmlFor="early-threshold">
            Early departure threshold (minutes)
          </label>
          <input
            className={inputClassName}
            defaultValue={policy.earlyDepartureThresholdMinutes}
            disabled={!canEdit}
            id="early-threshold"
            min={0}
            name="earlyDepartureThresholdMinutes"
            type="number"
          />
        </div>
        <div>
          <label className={labelClassName} htmlFor="overtime-threshold">
            Overtime threshold (minutes)
          </label>
          <input
            className={inputClassName}
            defaultValue={policy.overtimeThresholdMinutes}
            disabled={!canEdit}
            id="overtime-threshold"
            min={0}
            name="overtimeThresholdMinutes"
            type="number"
          />
        </div>
        <div>
          <label className={labelClassName} htmlFor="max-early">
            Maximum early clock-in (minutes)
          </label>
          <input
            className={inputClassName}
            defaultValue={policy.maximumEarlyClockInMinutes}
            disabled={!canEdit}
            id="max-early"
            min={0}
            name="maximumEarlyClockInMinutes"
            type="number"
          />
        </div>
        <div>
          <label className={labelClassName} htmlFor="max-late">
            Maximum late clock-out window (minutes)
          </label>
          <input
            className={inputClassName}
            defaultValue={policy.maximumLateClockOutMinutes}
            disabled={!canEdit}
            id="max-late"
            min={0}
            name="maximumLateClockOutMinutes"
            type="number"
          />
        </div>
      </div>
      {state && "error" in state ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {state && "ok" in state && state.ok ? (
        <p className="text-sm text-muted-foreground">Attendance policy saved.</p>
      ) : null}
      {canEdit ? (
        <Button disabled={pending} type="submit">
          {pending ? "Saving..." : "Save policy"}
        </Button>
      ) : null}
    </form>
  )
}
