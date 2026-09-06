"use client"

import { useMemo, useState } from "react"
import Link from "next/link"

import { formatDateRange } from "@/lib/dates/calendar-date"
import { formatLeaveDuration, leaveStatusLabels, leaveTypeLabels } from "@/modules/leave/labels"
import type { LeaveStatus } from "@/modules/scheduling/types/leave"
import type { LeaveType } from "@/modules/leave/schemas/leave"
import { inputClassName, labelClassName, selectClassName } from "@/modules/leave/ui/form-styles"

export type LeaveListItem = {
  id: string
  staffId: string
  staffName: string
  staffNumber: string
  leaveType: LeaveType
  startDate: string
  endDate: string
  durationDays: number
  status: LeaveStatus
  requestedByLabel: string
  reviewedByLabel: string | null
  createdAt: unknown
}

function formatCreatedAt(value: unknown) {
  if (!value) {
    return "Unknown"
  }

  const raw = String(value)
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  return match?.[1] ?? raw.slice(0, 10)
}

export function LeaveList({
  leave,
  staff,
  hideStaffFilter,
}: {
  leave: LeaveListItem[]
  staff: { id: string; name: string }[]
  hideStaffFilter?: boolean
}) {
  const [status, setStatus] = useState("")
  const [staffId, setStaffId] = useState("")
  const [leaveType, setLeaveType] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  const filtered = useMemo(() => {
    return leave.filter((row) => {
      if (status && row.status !== status) {
        return false
      }

      if (staffId && row.staffId !== staffId) {
        return false
      }

      if (leaveType && row.leaveType !== leaveType) {
        return false
      }

      if (fromDate && row.endDate < fromDate) {
        return false
      }

      if (toDate && row.startDate > toDate) {
        return false
      }

      return true
    })
  }, [fromDate, leave, leaveType, staffId, status, toDate])

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className={labelClassName} htmlFor="leave-filter-status">
            Status
          </label>
          <select
            className={selectClassName}
            id="leave-filter-status"
            onChange={(event) => setStatus(event.target.value)}
            value={status}
          >
            <option value="">All statuses</option>
            {Object.entries(leaveStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {hideStaffFilter ? null : (
          <div>
            <label className={labelClassName} htmlFor="leave-filter-staff">
              Staff
            </label>
            <select
              className={selectClassName}
              id="leave-filter-staff"
              onChange={(event) => setStaffId(event.target.value)}
              value={staffId}
            >
              <option value="">All staff</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className={labelClassName} htmlFor="leave-filter-type">
            Leave type
          </label>
          <select
            className={selectClassName}
            id="leave-filter-type"
            onChange={(event) => setLeaveType(event.target.value)}
            value={leaveType}
          >
            <option value="">All types</option>
            {Object.entries(leaveTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClassName} htmlFor="leave-filter-from">
            From
          </label>
          <input
            className={inputClassName}
            id="leave-filter-from"
            onChange={(event) => setFromDate(event.target.value)}
            type="date"
            value={fromDate}
          />
        </div>
        <div>
          <label className={labelClassName} htmlFor="leave-filter-to">
            To
          </label>
          <input
            className={inputClassName}
            id="leave-filter-to"
            onChange={(event) => setToDate(event.target.value)}
            type="date"
            value={toDate}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No leave requests match these filters.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="py-2 pr-4 font-medium">Staff</th>
                <th className="py-2 pr-4 font-medium">Type</th>
                <th className="py-2 pr-4 font-medium">Dates</th>
                <th className="py-2 pr-4 font-medium">Duration</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Requested by</th>
                <th className="py-2 pr-4 font-medium">Reviewed by</th>
                <th className="py-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr className="border-b border-border" key={row.id}>
                  <td className="py-3 pr-4">
                    <Link
                      className="font-medium text-primary underline-offset-4 hover:underline"
                      href={`/leave/${row.id}`}
                    >
                      {row.staffName}
                    </Link>
                    {row.staffNumber ? (
                      <p className="text-xs text-muted-foreground">{row.staffNumber}</p>
                    ) : null}
                  </td>
                  <td className="py-3 pr-4">{leaveTypeLabels[row.leaveType]}</td>
                  <td className="py-3 pr-4">{formatDateRange(row.startDate, row.endDate)}</td>
                  <td className="py-3 pr-4">{formatLeaveDuration(row.durationDays)}</td>
                  <td className="py-3 pr-4">{leaveStatusLabels[row.status]}</td>
                  <td className="py-3 pr-4">{row.requestedByLabel}</td>
                  <td className="py-3 pr-4">{row.reviewedByLabel ?? "—"}</td>
                  <td className="py-3">{formatCreatedAt(row.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
