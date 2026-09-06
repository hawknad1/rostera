import {
  eligibleAssignments,
  loadReportDataset,
  missingAssignments,
  type ReportDataset,
} from "@/modules/reports/services/dataset"
import { summarizeSchedulingExceptions } from "@/modules/reports/services/exceptions"
import { buildCoverageRows } from "@/modules/reports/services/staffing"
import {
  average,
  coverageFillRate,
  isCompletedAttendanceStatus,
  minutesToHours,
  rateValue,
  workedMinutesFromRecord,
} from "@/modules/reports/services/metrics"
import type { ReportFilterInput } from "@/modules/reports/types/filters"
import type { OperationsOverview } from "@/modules/reports/types/reports"

function completedRecords(dataset: ReportDataset) {
  return dataset.attendance.filter((record) => isCompletedAttendanceStatus(record.status))
}

export function buildOperationsOverview(
  dataset: ReportDataset,
  scheduling: { blockers: number; warnings: number; infos: number },
): OperationsOverview {
  const completed = completedRecords(dataset)
  const eligible = eligibleAssignments(dataset)
  const completedDates = new Set(
    completed.map((record) => `${record.staffId}|${record.attendanceDate}`),
  )
  const completedEligible = eligible.filter((assignment) =>
    completedDates.has(`${assignment.staffId}|${assignment.date}`),
  ).length
  const scheduledMinutes = dataset.assignments.reduce(
    (sum, assignment) => sum + assignment.scheduledMinutes,
    0,
  )
  const workedMinutes = dataset.attendance.reduce(
    (sum, record) => sum + workedMinutesFromRecord(record),
    0,
  )
  const overtimeMinutes = completed.reduce((sum, record) => sum + record.overtimeMinutes, 0)
  const coverageRows = buildCoverageRows(dataset)
  const requiredCells = coverageRows.filter((cell) => cell.requiredCount > 0)
  const filled = requiredCells.reduce(
    (sum, cell) => sum + Math.min(cell.assignedCount, cell.requiredCount),
    0,
  )
  const required = requiredCells.reduce((sum, cell) => sum + cell.requiredCount, 0)

  return {
    period: dataset.period,
    staff: {
      activeStaff: [...dataset.staff.values()].filter(
        (member) => member.employmentStatus === "ACTIVE",
      ).length,
      staffWithPublishedAssignments: new Set(dataset.assignments.map((item) => item.staffId)).size,
    },
    planned: {
      scheduledShifts: dataset.assignments.length,
      scheduledMinutes,
      scheduledHours: minutesToHours(scheduledMinutes),
    },
    attendance: {
      records: dataset.attendance.filter((record) => record.status !== "VOIDED").length,
      completedRecords: completed.length,
      workedMinutes,
      workedHours: minutesToHours(workedMinutes),
      overtimeMinutes,
      overtimeHours: minutesToHours(overtimeMinutes),
      lateArrivals: completed.filter((record) => record.lateMinutes > 0).length,
      lateMinutes: completed.reduce((sum, record) => sum + record.lateMinutes, 0),
      earlyDepartures: completed.filter((record) => record.earlyDepartureMinutes > 0).length,
      earlyDepartureMinutes: completed.reduce(
        (sum, record) => sum + record.earlyDepartureMinutes,
        0,
      ),
      missingAttendance: missingAssignments(dataset).length,
      eligibleAssignments: eligible.length,
      completion: rateValue(completedEligible, eligible.length),
      punctuality: rateValue(
        completed.filter((record) => record.lateMinutes === 0).length,
        completed.length,
      ),
      averageLatenessMinutes: average(completed.map((record) => record.lateMinutes)),
      averageWorkedHours:
        completed.length === 0 ? null : minutesToHours(workedMinutes / completed.length),
    },
    leave: {
      approvedLeaveDays: dataset.approvedLeave.reduce((sum, item) => sum + item.daysInRange, 0),
      pendingRequests: dataset.leave.filter((item) => item.status === "PENDING").length,
      approvedRequests: dataset.leave.filter((item) => item.status === "APPROVED").length,
      rejectedRequests: dataset.leave.filter((item) => item.status === "REJECTED").length,
      cancelledRequests: dataset.leave.filter((item) => item.status === "CANCELLED").length,
    },
    exceptions: {
      openAttendanceExceptions: dataset.attendance.reduce(
        (sum, record) => sum + record.openExceptionCount,
        0,
      ),
      schedulingBlockers: scheduling.blockers,
      schedulingWarnings: scheduling.warnings,
      schedulingInfos: scheduling.infos,
    },
    coverage: {
      requiredPositions: required,
      assignedRequiredPositions: filled,
      fillRate: coverageFillRate(requiredCells),
      underCovered: coverageRows.filter((cell) => cell.status === "understaffed").length,
      fullyCovered: coverageRows.filter((cell) => cell.status === "covered").length,
      overCovered: coverageRows.filter((cell) => cell.status === "overstaffed").length,
      noRequirement: coverageRows.filter((cell) => cell.status === "no_requirement").length,
    },
  }
}

export async function getOperationsOverview(
  input: ReportFilterInput = {},
): Promise<OperationsOverview> {
  const dataset = await loadReportDataset(input)
  const scheduling = await summarizeSchedulingExceptions(dataset)
  return buildOperationsOverview(dataset, scheduling)
}
