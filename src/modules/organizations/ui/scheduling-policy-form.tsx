"use client"

import { useActionState, useState } from "react"

import { Button } from "@/components/ui/button"
import type { SchedulingPolicyActionState } from "@/modules/organizations/actions/update-scheduling-policy"
import { updateSchedulingPolicyAction } from "@/modules/organizations/actions/update-scheduling-policy"
import {
  inputClassName,
  labelClassName,
  selectClassName,
} from "@/modules/organizations/ui/form-styles"
import type { SchedulingPolicyValues } from "@/modules/scheduling/types/scheduling-policy"

const SUGGESTED_VALUES = {
  minimumRestHours: 11,
  maximumWeeklyHours: 40,
  maximumConsecutiveDays: 6,
  maximumNightShiftsPerWeek: 4,
  maximumWeekendShifts: 2,
} as const

function minutesToHoursInput(minutes: number | null, fallback: number) {
  if (minutes === null) {
    return String(fallback)
  }

  return String(minutes / 60)
}

function countInput(value: number | null, fallback: number) {
  if (value === null) {
    return String(fallback)
  }

  return String(value)
}

function PolicyField({
  enabledName,
  enabled,
  onEnabledChange,
  title,
  description,
  valueName,
  value,
  onValueChange,
  unit,
  min,
  canEdit,
}: {
  enabledName: string
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
  title: string
  description: string
  valueName: string
  value: string
  onValueChange: (value: string) => void
  unit: string
  min: number
  canEdit: boolean
}) {
  const valueId = `${valueName}-input`
  const enabledId = `${enabledName}-input`

  return (
    <fieldset className="flex flex-col gap-3 border-t border-border pt-6">
      <legend className="text-sm font-medium text-foreground">{title}</legend>
      <p className="text-sm text-muted-foreground">{description}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClassName} htmlFor={enabledId}>
            Status
          </label>
          <select
            className={selectClassName}
            disabled={!canEdit}
            id={enabledId}
            name={enabledName}
            onChange={(event) => onEnabledChange(event.target.value === "true")}
            value={enabled ? "true" : "false"}
          >
            <option value="false">Disabled</option>
            <option value="true">Enabled</option>
          </select>
        </div>
        <div>
          <label className={labelClassName} htmlFor={valueId}>
            Limit
          </label>
          <div className="flex items-center gap-2">
            <input
              className={inputClassName}
              disabled={!canEdit || !enabled}
              id={valueId}
              min={min}
              name={valueName}
              onChange={(event) => onValueChange(event.target.value)}
              step="1"
              type="number"
              value={value}
            />
            <span className="text-sm text-muted-foreground">{unit}</span>
          </div>
        </div>
      </div>
    </fieldset>
  )
}

export function SchedulingPolicyForm({
  policy,
  canEdit,
}: {
  policy: SchedulingPolicyValues
  canEdit: boolean
}) {
  const [state, action, pending] = useActionState<SchedulingPolicyActionState, FormData>(
    updateSchedulingPolicyAction,
    null,
  )
  const [minimumRestEnabled, setMinimumRestEnabled] = useState(policy.minimumRestMinutes !== null)
  const [maximumWeeklyEnabled, setMaximumWeeklyEnabled] = useState(
    policy.maximumWeeklyMinutes !== null,
  )
  const [maximumConsecutiveEnabled, setMaximumConsecutiveEnabled] = useState(
    policy.maximumConsecutiveDays !== null,
  )
  const [maximumNightEnabled, setMaximumNightEnabled] = useState(
    policy.maximumNightShiftsPerWeek !== null,
  )
  const [maximumWeekendEnabled, setMaximumWeekendEnabled] = useState(
    policy.maximumWeekendShifts !== null,
  )
  const [minimumRestHours, setMinimumRestHours] = useState(
    minutesToHoursInput(policy.minimumRestMinutes, SUGGESTED_VALUES.minimumRestHours),
  )
  const [maximumWeeklyHours, setMaximumWeeklyHours] = useState(
    minutesToHoursInput(policy.maximumWeeklyMinutes, SUGGESTED_VALUES.maximumWeeklyHours),
  )
  const [maximumConsecutiveDays, setMaximumConsecutiveDays] = useState(
    countInput(policy.maximumConsecutiveDays, SUGGESTED_VALUES.maximumConsecutiveDays),
  )
  const [maximumNightShiftsPerWeek, setMaximumNightShiftsPerWeek] = useState(
    countInput(policy.maximumNightShiftsPerWeek, SUGGESTED_VALUES.maximumNightShiftsPerWeek),
  )
  const [maximumWeekendShifts, setMaximumWeekendShifts] = useState(
    countInput(policy.maximumWeekendShifts, SUGGESTED_VALUES.maximumWeekendShifts),
  )

  return (
    <form action={action} className="flex max-w-2xl flex-col gap-2">
      <PolicyField
        canEdit={canEdit}
        description="Prevents assigning a staff member to a shift before they have completed the configured rest period."
        enabled={minimumRestEnabled}
        enabledName="minimumRestEnabled"
        min={1}
        onEnabledChange={setMinimumRestEnabled}
        onValueChange={setMinimumRestHours}
        title="Minimum rest between shifts"
        unit="hours"
        value={minimumRestHours}
        valueName="minimumRestHours"
      />
      <PolicyField
        canEdit={canEdit}
        description="Limits how much working time a staff member can be scheduled in a single ISO week, counted from assignment dates."
        enabled={maximumWeeklyEnabled}
        enabledName="maximumWeeklyEnabled"
        min={1}
        onEnabledChange={setMaximumWeeklyEnabled}
        onValueChange={setMaximumWeeklyHours}
        title="Maximum weekly working time"
        unit="hours"
        value={maximumWeeklyHours}
        valueName="maximumWeeklyHours"
      />
      <PolicyField
        canEdit={canEdit}
        description="Limits how many consecutive calendar days a staff member can be assigned, using each shift's assignment date."
        enabled={maximumConsecutiveEnabled}
        enabledName="maximumConsecutiveEnabled"
        min={1}
        onEnabledChange={setMaximumConsecutiveEnabled}
        onValueChange={setMaximumConsecutiveDays}
        title="Maximum consecutive working days"
        unit="days"
        value={maximumConsecutiveDays}
        valueName="maximumConsecutiveDays"
      />
      <PolicyField
        canEdit={canEdit}
        description="Limits overnight shifts per ISO week. Night shifts are identified by the shift type's overnight setting, not by clock time."
        enabled={maximumNightEnabled}
        enabledName="maximumNightEnabled"
        min={0}
        onEnabledChange={setMaximumNightEnabled}
        onValueChange={setMaximumNightShiftsPerWeek}
        title="Maximum night shifts per week"
        unit="shifts"
        value={maximumNightShiftsPerWeek}
        valueName="maximumNightShiftsPerWeek"
      />
      <PolicyField
        canEdit={canEdit}
        description="Limits Saturday and Sunday assignments per ISO week. Public holidays are not included."
        enabled={maximumWeekendEnabled}
        enabledName="maximumWeekendEnabled"
        min={0}
        onEnabledChange={setMaximumWeekendEnabled}
        onValueChange={setMaximumWeekendShifts}
        title="Maximum weekend shifts"
        unit="shifts"
        value={maximumWeekendShifts}
        valueName="maximumWeekendShifts"
      />

      {state?.ok === false ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state?.ok === true ? (
        <p className="text-sm text-muted-foreground">Scheduling policy saved.</p>
      ) : null}

      {canEdit ? (
        <Button className="mt-4 self-start" disabled={pending} type="submit">
          {pending ? "Saving..." : "Save changes"}
        </Button>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          You can view this policy, but you do not have permission to change it.
        </p>
      )}
    </form>
  )
}
