"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import {
  createStaffAction,
  type StaffActionState,
} from "@/modules/staff/actions/create-staff"
import { employmentStatusLabels, employmentTypeLabels } from "@/modules/staff/labels"
import { inputClassName, labelClassName, selectClassName } from "@/modules/staff/ui/form-styles"

type ProfessionOption = {
  id: string
  name: string
  isActive: boolean
  source: "Global" | "Hospital"
}

export function CreateStaffForm({
  departments,
  professions,
}: {
  departments: { id: string; name: string }[]
  professions: ProfessionOption[]
}) {
  const [state, action, pending] = useActionState<StaffActionState, FormData>(
    createStaffAction,
    null,
  )

  const activeProfessions = professions.filter((profession) => profession.isActive)

  return (
    <form action={action} className="flex max-w-3xl flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Personal information</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClassName} htmlFor="staff-first-name">
              First name
            </label>
            <input className={inputClassName} id="staff-first-name" name="firstName" required type="text" />
          </div>
          <div>
            <label className={labelClassName} htmlFor="staff-middle-name">
              Middle name
            </label>
            <input className={inputClassName} id="staff-middle-name" name="middleName" type="text" />
          </div>
          <div>
            <label className={labelClassName} htmlFor="staff-last-name">
              Last name
            </label>
            <input className={inputClassName} id="staff-last-name" name="lastName" required type="text" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClassName} htmlFor="staff-phone">
              Phone
            </label>
            <input className={inputClassName} id="staff-phone" name="phone" type="tel" />
          </div>
          <div>
            <label className={labelClassName} htmlFor="staff-email">
              Email
            </label>
            <input className={inputClassName} id="staff-email" name="email" type="email" />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Employment information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClassName} htmlFor="staff-number">
              Staff number
            </label>
            <input className={inputClassName} id="staff-number" name="staffNumber" required type="text" />
          </div>
          <div>
            <label className={labelClassName} htmlFor="staff-date-joined">
              Date joined
            </label>
            <input className={inputClassName} id="staff-date-joined" name="dateJoined" type="date" />
          </div>
          <div>
            <label className={labelClassName} htmlFor="staff-profession">
              Profession
            </label>
            <select className={selectClassName} id="staff-profession" name="professionId" required>
              <option value="">Select a profession</option>
              {activeProfessions.map((profession) => (
                <option key={profession.id} value={profession.id}>
                  {profession.name} ({profession.source})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClassName} htmlFor="staff-department">
              Department
            </label>
            <select className={selectClassName} id="staff-department" name="departmentId" required>
              <option value="">Select a department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClassName} htmlFor="staff-employment-type">
              Employment type
            </label>
            <select
              className={selectClassName}
              defaultValue="FULL_TIME"
              id="staff-employment-type"
              name="employmentType"
            >
              {Object.entries(employmentTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClassName} htmlFor="staff-employment-status">
              Employment status
            </label>
            <select
              className={selectClassName}
              defaultValue="ACTIVE"
              id="staff-employment-status"
              name="employmentStatus"
            >
              {Object.entries(employmentStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Profile</h2>
        <div>
          <label className={labelClassName} htmlFor="staff-photo-url">
            Photo URL
          </label>
          <input className={inputClassName} id="staff-photo-url" name="photoUrl" type="url" />
          <p className="mt-1.5 text-xs text-muted-foreground">Optional. Paste an existing image URL.</p>
        </div>
      </section>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <Button className="self-start" disabled={pending} type="submit">
        {pending ? "Creating..." : "Create staff member"}
      </Button>
    </form>
  )
}
