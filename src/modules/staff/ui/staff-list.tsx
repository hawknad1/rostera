"use client"

import { useMemo, useState } from "react"
import Link from "next/link"

import { employmentStatusLabels, employmentTypeLabels, formatStaffName } from "@/modules/staff/labels"
import type { EmploymentStatus, EmploymentType } from "@/modules/staff/schemas/staff"
import { inputClassName, labelClassName, selectClassName } from "@/modules/staff/ui/form-styles"

export type StaffListItem = {
  id: string
  staffNumber: string
  firstName: string
  middleName: string | null
  lastName: string
  phone: string | null
  email: string | null
  employmentStatus: EmploymentStatus
  employmentType: EmploymentType
  departmentId: string
  professionId: string
  departmentName: string
  professionName: string
  isDepartmentHead: boolean
}

export function StaffList({
  staff,
  departments,
  professions,
  canEdit,
}: {
  staff: StaffListItem[]
  departments: { id: string; name: string }[]
  professions: { id: string; name: string }[]
  canEdit: boolean
}) {
  const [query, setQuery] = useState("")
  const [departmentId, setDepartmentId] = useState("")
  const [professionId, setProfessionId] = useState("")
  const [status, setStatus] = useState("")
  const [employmentType, setEmploymentType] = useState("")

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()

    return staff.filter((member) => {
      if (departmentId && member.departmentId !== departmentId) {
        return false
      }

      if (professionId && member.professionId !== professionId) {
        return false
      }

      if (status && member.employmentStatus !== status) {
        return false
      }

      if (employmentType && member.employmentType !== employmentType) {
        return false
      }

      if (!normalized) {
        return true
      }

      const haystack = [
        member.staffNumber,
        formatStaffName(member),
        member.phone ?? "",
        member.email ?? "",
      ]
        .join(" ")
        .toLowerCase()

      return haystack.includes(normalized)
    })
  }, [departmentId, employmentType, professionId, query, staff, status])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className={labelClassName} htmlFor="staff-search">
            Search
          </label>
          <input
            className={inputClassName}
            id="staff-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name or staff number"
            type="search"
            value={query}
          />
        </div>
        <div>
          <label className={labelClassName} htmlFor="staff-department-filter">
            Department
          </label>
          <select
            className={selectClassName}
            id="staff-department-filter"
            onChange={(event) => setDepartmentId(event.target.value)}
            value={departmentId}
          >
            <option value="">All departments</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClassName} htmlFor="staff-profession-filter">
            Profession
          </label>
          <select
            className={selectClassName}
            id="staff-profession-filter"
            onChange={(event) => setProfessionId(event.target.value)}
            value={professionId}
          >
            <option value="">All professions</option>
            {professions.map((profession) => (
              <option key={profession.id} value={profession.id}>
                {profession.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClassName} htmlFor="staff-status-filter">
            Status
          </label>
          <select
            className={selectClassName}
            id="staff-status-filter"
            onChange={(event) => setStatus(event.target.value)}
            value={status}
          >
            <option value="">All statuses</option>
            {Object.entries(employmentStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClassName} htmlFor="staff-type-filter">
            Employment type
          </label>
          <select
            className={selectClassName}
            id="staff-type-filter"
            onChange={(event) => setEmploymentType(event.target.value)}
            value={employmentType}
          >
            <option value="">All types</option>
            {Object.entries(employmentTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No staff members match these filters.</p>
      ) : (
        <div className="overflow-x-auto border-y border-border">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Staff number</th>
                <th className="py-2 pr-3 font-medium">Name</th>
                <th className="py-2 pr-3 font-medium">Profession</th>
                <th className="py-2 pr-3 font-medium">Department</th>
                <th className="py-2 pr-3 font-medium">Type</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 font-medium">Contact</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((member) => (
                <tr className="border-b border-border last:border-b-0" key={member.id}>
                  <td className="py-3 pr-3 align-top font-medium">{member.staffNumber}</td>
                  <td className="py-3 pr-3 align-top">
                    <Link
                      className="font-medium text-primary underline-offset-4 hover:underline"
                      href={`/staff/${member.id}`}
                    >
                      {formatStaffName(member)}
                    </Link>
                    {member.isDepartmentHead ? (
                      <p className="text-xs text-muted-foreground">Department head</p>
                    ) : null}
                  </td>
                  <td className="py-3 pr-3 align-top">{member.professionName}</td>
                  <td className="py-3 pr-3 align-top">{member.departmentName}</td>
                  <td className="py-3 pr-3 align-top">
                    {employmentTypeLabels[member.employmentType]}
                  </td>
                  <td className="py-3 pr-3 align-top">
                    {employmentStatusLabels[member.employmentStatus]}
                  </td>
                  <td className="py-3 align-top text-muted-foreground">
                    <p>{member.phone || "—"}</p>
                    <p>{member.email || "—"}</p>
                    <Link
                      className="mt-1 inline-block text-primary underline-offset-4 hover:underline"
                      href={`/staff/${member.id}`}
                    >
                      {canEdit ? "Edit" : "View"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
