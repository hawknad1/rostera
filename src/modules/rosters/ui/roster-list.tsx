"use client"

import { useMemo, useState } from "react"
import Link from "next/link"

import { rosterStatusLabels, type RosterStatus } from "@/modules/rosters/labels"
import { inputClassName, labelClassName, selectClassName } from "@/modules/rosters/ui/form-styles"

export type RosterListItem = {
  id: string
  name: string
  departmentId: string
  departmentName: string
  startDate: string
  endDate: string
  dateRangeLabel: string
  status: RosterStatus
  assignmentCount: number
  coverageLabel: string
}

export function RosterList({
  rosters,
  departments,
  canEdit,
}: {
  rosters: RosterListItem[]
  departments: { id: string; name: string }[]
  canEdit: boolean
}) {
  const [query, setQuery] = useState("")
  const [departmentId, setDepartmentId] = useState("")
  const [status, setStatus] = useState("")

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()

    return rosters.filter((roster) => {
      if (departmentId && roster.departmentId !== departmentId) {
        return false
      }

      if (status && roster.status !== status) {
        return false
      }

      if (!normalized) {
        return true
      }

      return `${roster.name} ${roster.departmentName}`.toLowerCase().includes(normalized)
    })
  }, [departmentId, query, rosters, status])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid max-w-3xl gap-4 sm:grid-cols-3">
        <div>
          <label className={labelClassName} htmlFor="roster-search">
            Search
          </label>
          <input
            className={inputClassName}
            id="roster-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by name"
            type="search"
            value={query}
          />
        </div>
        <div>
          <label className={labelClassName} htmlFor="roster-department-filter">
            Department
          </label>
          <select
            className={selectClassName}
            id="roster-department-filter"
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
          <label className={labelClassName} htmlFor="roster-status-filter">
            Status
          </label>
          <select
            className={selectClassName}
            id="roster-status-filter"
            onChange={(event) => setStatus(event.target.value)}
            value={status}
          >
            <option value="">All statuses</option>
            {Object.entries(rosterStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No rosters match this filter.</p>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {filtered.map((roster) => (
            <li className="flex flex-wrap items-baseline justify-between gap-4 py-3" key={roster.id}>
              <div className="min-w-0">
                <p className="font-medium">{roster.name}</p>
                <p className="text-sm text-muted-foreground">
                  {roster.departmentName} · {roster.dateRangeLabel} ·{" "}
                  {rosterStatusLabels[roster.status]} · {roster.assignmentCount}{" "}
                  {roster.assignmentCount === 1 ? "assignment" : "assignments"} ·{" "}
                  {roster.coverageLabel}
                </p>
              </div>
              <Link
                className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline"
                href={`/rosters/${roster.id}`}
              >
                {canEdit && roster.status === "DRAFT" ? "Edit" : "View"}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
