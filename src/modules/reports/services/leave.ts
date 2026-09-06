import { loadReportDataset } from "@/modules/reports/services/dataset"
import { paginateItems } from "@/modules/reports/services/metrics"
import { REPORT_PAGE_SIZE } from "@/modules/reports/types/filters"
import type { ReportFilterInput } from "@/modules/reports/types/filters"
import type { LeaveReportRow, LeaveReportSummary, ReportPage } from "@/modules/reports/types/reports"

export function buildLeaveRows(dataset: Awaited<ReturnType<typeof loadReportDataset>>): LeaveReportRow[] {
  return dataset.leave
    .map((item) => {
      const profile = dataset.staff.get(item.staffId)
      return {
        id: item.id,
        staffId: item.staffId,
        staffName: profile?.name ?? "Unknown staff",
        staffNumber: profile?.staffNumber ?? "",
        departmentName: profile?.departmentName ?? "Unknown department",
        leaveType: item.leaveType,
        startDate: item.startDate,
        endDate: item.endDate,
        days: item.durationDays,
        daysInRange: item.daysInRange,
        status: item.status,
      }
    })
    .sort((left, right) => {
      const start = left.startDate.localeCompare(right.startDate)
      if (start !== 0) {
        return start
      }

      return left.staffName.localeCompare(right.staffName)
    })
}

export function summarizeLeave(dataset: Awaited<ReturnType<typeof loadReportDataset>>): LeaveReportSummary {
  return {
    pending: dataset.leave.filter((item) => item.status === "PENDING").length,
    approved: dataset.leave.filter((item) => item.status === "APPROVED").length,
    rejected: dataset.leave.filter((item) => item.status === "REJECTED").length,
    cancelled: dataset.leave.filter((item) => item.status === "CANCELLED").length,
    approvedLeaveDays: dataset.approvedLeave.reduce((sum, item) => sum + item.daysInRange, 0),
  }
}

export async function listLeaveReport(input: ReportFilterInput = {}): Promise<{
  page: ReportPage<LeaveReportRow>
  summary: LeaveReportSummary
}> {
  const dataset = await loadReportDataset(input)
  return {
    page: {
      ...paginateItems(buildLeaveRows(dataset), dataset.filters.page, REPORT_PAGE_SIZE),
      dateFrom: dataset.period.dateFrom,
      dateTo: dataset.period.dateTo,
    },
    summary: summarizeLeave(dataset),
  }
}

export async function leaveReportRows(input: ReportFilterInput = {}) {
  const dataset = await loadReportDataset(input)
  return buildLeaveRows(dataset)
}
