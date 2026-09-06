"use client"

import { useMemo, useState } from "react"
import Link from "next/link"

import { inputClassName, labelClassName, selectClassName } from "@/modules/shifts/ui/form-styles"

export type ShiftTypeListItem = {
  id: string
  name: string
  description: string | null
  startTime: string
  endTime: string
  durationLabel: string
  isOvernight: boolean
  isActive: boolean
}

export function ShiftTypeList({
  shiftTypes,
  canEdit,
}: {
  shiftTypes: ShiftTypeListItem[]
  canEdit: boolean
}) {
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("active")

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()

    return shiftTypes.filter((shiftType) => {
      if (status === "active" && !shiftType.isActive) {
        return false
      }

      if (status === "inactive" && shiftType.isActive) {
        return false
      }

      if (!normalized) {
        return true
      }

      return shiftType.name.toLowerCase().includes(normalized)
    })
  }, [query, shiftTypes, status])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid max-w-xl gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClassName} htmlFor="shift-search">
            Search
          </label>
          <input
            className={inputClassName}
            id="shift-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by name"
            type="search"
            value={query}
          />
        </div>
        <div>
          <label className={labelClassName} htmlFor="shift-status">
            Status
          </label>
          <select
            className={selectClassName}
            id="shift-status"
            onChange={(event) => setStatus(event.target.value)}
            value={status}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No shifts match this filter.</p>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {filtered.map((shiftType) => (
            <li className="flex flex-wrap items-baseline justify-between gap-4 py-3" key={shiftType.id}>
              <div className="min-w-0">
                <p className="font-medium">{shiftType.name}</p>
                <p className="text-sm text-muted-foreground">
                  {shiftType.startTime} → {shiftType.endTime} · {shiftType.durationLabel}
                  {shiftType.isOvernight ? " · Overnight" : ""} ·{" "}
                  {shiftType.isActive ? "Active" : "Inactive"}
                </p>
                {shiftType.description ? (
                  <p className="text-sm text-muted-foreground">{shiftType.description}</p>
                ) : null}
              </div>
              <Link
                className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline"
                href={`/shifts/${shiftType.id}`}
              >
                {canEdit ? "Edit" : "View"}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
