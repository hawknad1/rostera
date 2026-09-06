"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import type { StaffActionState } from "@/modules/staff/actions/create-staff"
import { updateStaffAction } from "@/modules/staff/actions/update-staff"
import { employmentStatusLabels, employmentTypeLabels } from "@/modules/staff/labels"
import type { EmploymentStatus, EmploymentType } from "@/modules/staff/schemas/staff"
import { inputClassName, labelClassName, selectClassName } from "@/modules/staff/ui/form-styles"

type ProfessionOption = {
  id: string
  name: string
  isActive: boolean
  source: "Global" | "Hospital"
}

export function EditStaffForm({
  staff,
  departments,
  professions,
}: {
  staff: {
    id: string
    firstName: string
    middleName: string | null
    lastName: string
    phone: string | null
    email: string | null
    professionId: string
    departmentId: string
    employmentStatus: EmploymentStatus
    employmentType: EmploymentType
    dateJoined: string | null
    photoUrl: string | null
  }
  departments: { id: string; name: string }[]
  professions: ProfessionOption[]
}) {
  const [state, action, pending] = useActionState<StaffActionState, FormData>(
    updateStaffAction,
    null,
  )

  const selectableProfessions = professions.filter(
    (profession) => profession.isActive || profession.id === staff.professionId,
  )

  return (
    <form action={action} className="flex max-w-3xl flex-col gap-8">
      <input name="id" type="hidden" value={staff.id} />

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Personal information</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClassName} htmlFor="edit-staff-first-name">
              First name
            </label>
            <input
              className={inputClassName}
              defaultValue={staff.firstName}
              id="edit-staff-first-name"
              name="firstName"
              required
              type="text"
            />
          </div>
          <div>
            <label className={labelClassName} htmlFor="edit-staff-middle-name">
              Middle name
            </label>
            <input
              className={inputClassName}
              defaultValue={staff.middleName ?? ""}
              id="edit-staff-middle-name"
              name="middleName"
              type="text"
            />
          </div>
          <div>
            <label className={labelClassName} htmlFor="edit-staff-last-name">
              Last name
            </label>
            <input
              className={inputClassName}
              defaultValue={staff.lastName}
              id="edit-staff-last-name"
              name="lastName"
              required
              type="text"
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClassName} htmlFor="edit-staff-phone">
              Phone
            </label>
            <input
              className={inputClassName}
              defaultValue={staff.phone ?? ""}
              id="edit-staff-phone"
              name="phone"
              type="tel"
            />
          </div>
          <div>
            <label className={labelClassName} htmlFor="edit-staff-email">
              Email
            </label>
            <input
              className={inputClassName}
              defaultValue={staff.email ?? ""}
              id="edit-staff-email"
              name="email"
              type="email"
            />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Employment information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClassName} htmlFor="edit-staff-profession">
              Profession
            </label>
            <select
              className={selectClassName}
              defaultValue={staff.professionId}
              id="edit-staff-profession"
              name="professionId"
              required
            >
              {selectableProfessions.map((profession) => (
                <option key={profession.id} value={profession.id}>
                  {profession.name} ({profession.source}
                  {profession.isActive ? "" : ", inactive"})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClassName} htmlFor="edit-staff-department">
              Department
            </label>
            <select
              className={selectClassName}
              defaultValue={staff.departmentId}
              id="edit-staff-department"
              name="departmentId"
              required
            >
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClassName} htmlFor="edit-staff-employment-type">
              Employment type
            </label>
            <select
              className={selectClassName}
              defaultValue={staff.employmentType}
              id="edit-staff-employment-type"
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
            <label className={labelClassName} htmlFor="edit-staff-employment-status">
              Employment status
            </label>
            <select
              className={selectClassName}
              defaultValue={staff.employmentStatus}
              id="edit-staff-employment-status"
              name="employmentStatus"
            >
              {Object.entries(employmentStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClassName} htmlFor="edit-staff-date-joined">
              Date joined
            </label>
            <input
              className={inputClassName}
              defaultValue={staff.dateJoined ?? ""}
              id="edit-staff-date-joined"
              name="dateJoined"
              type="date"
            />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Profile</h2>
        <div>
          <label className={labelClassName} htmlFor="edit-staff-photo-url">
            Photo URL
          </label>
          <input
            className={inputClassName}
            defaultValue={staff.photoUrl ?? ""}
            id="edit-staff-photo-url"
            name="photoUrl"
            type="url"
          />
        </div>
      </section>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <Button className="self-start" disabled={pending} type="submit">
        {pending ? "Saving..." : "Save changes"}
      </Button>
    </form>
  )
}
