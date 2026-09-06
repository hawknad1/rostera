"use client"

import { useMemo, useState } from "react"
import Link from "next/link"

import { swapStatusLabels, type SwapStatus } from "@/modules/shift-swaps/labels"
import type { SwapListItem } from "@/modules/shift-swaps/services/swaps"
import { inputClassName, labelClassName, selectClassName } from "@/modules/shift-swaps/ui/form-styles"

function formatCreatedAt(value: unknown) {
  if (!value) {
    return "Unknown"
  }

  const raw = String(value)
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  return match?.[1] ?? raw.slice(0, 10)
}

export function SwapList({
  swaps,
  departments,
}: {
  swaps: SwapListItem[]
  departments: { id: string; name: string }[]
}) {
  const [status, setStatus] = useState("")
  const [departmentId, setDepartmentId] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  const filtered = useMemo(() => {
    return swaps.filter((row) => {
      if (status && row.status !== status) {
        return false
      }

      if (departmentId && row.departmentId !== departmentId) {
        return false
      }

      const dates = [row.sourceDate, row.targetDate].filter(Boolean)
      if (fromDate && dates.every((date) => date < fromDate)) {
        return false
      }

      if (toDate && dates.every((date) => date > toDate)) {
        return false
      }

      return true
    })
  }, [departmentId, fromDate, status, swaps, toDate])

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className={labelClassName} htmlFor="swap-filter-status">
            Status
          </label>
          <select
            className={selectClassName}
            id="swap-filter-status"
            onChange={(event) => setStatus(event.target.value)}
            value={status}
          >
            <option value="">All statuses</option>
            {(Object.entries(swapStatusLabels) as Array<[SwapStatus, string]>).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </select>
        </div>
        {departments.length > 1 ? (
          <div>
            <label className={labelClassName} htmlFor="swap-filter-department">
              Department
            </label>
            <select
              className={selectClassName}
              id="swap-filter-department"
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
        ) : null}
        <div>
          <label className={labelClassName} htmlFor="swap-filter-from">
            From
          </label>
          <input
            className={inputClassName}
            id="swap-filter-from"
            onChange={(event) => setFromDate(event.target.value)}
            type="date"
            value={fromDate}
          />
        </div>
        <div>
          <label className={labelClassName} htmlFor="swap-filter-to">
            To
          </label>
          <input
            className={inputClassName}
            id="swap-filter-to"
            onChange={(event) => setToDate(event.target.value)}
            type="date"
            value={toDate}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No swap requests match these filters.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Requester</th>
                <th className="py-2 pr-4 font-medium">Target staff</th>
                <th className="py-2 pr-4 font-medium">Source shift</th>
                <th className="py-2 pr-4 font-medium">Target shift</th>
                <th className="py-2 pr-4 font-medium">Roster</th>
                <th className="py-2 pr-4 font-medium">Created</th>
                <th className="py-2 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr className="border-b border-border" key={row.id}>
                  <td className="py-3 pr-4">{swapStatusLabels[row.status]}</td>
                  <td className="py-3 pr-4">
                    <Link
                      className="font-medium text-primary underline-offset-4 hover:underline"
                      href={`/shift-swaps/${row.id}`}
                    >
                      {row.requesterName}
                    </Link>
                  </td>
                  <td className="py-3 pr-4">{row.targetStaffName}</td>
                  <td className="py-3 pr-4">
                    {row.sourceDateLabel}
                    <p className="text-xs text-muted-foreground">
                      {row.sourceShiftName} · {row.sourceTimeLabel}
                    </p>
                  </td>
                  <td className="py-3 pr-4">
                    {row.targetDateLabel}
                    <p className="text-xs text-muted-foreground">
                      {row.targetShiftName} · {row.targetTimeLabel}
                    </p>
                  </td>
                  <td className="py-3 pr-4">{row.rosterName}</td>
                  <td className="py-3 pr-4">{formatCreatedAt(row.createdAt)}</td>
                  <td className="py-3">{formatCreatedAt(row.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
