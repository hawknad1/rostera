import { calculateCoverage } from "@/modules/scheduling/engine/calculateCoverage"
import type { ReportDataset } from "@/modules/reports/services/dataset"
import { loadReportDataset } from "@/modules/reports/services/dataset"
import { cellCoveragePercent, paginateItems } from "@/modules/reports/services/metrics"
import { REPORT_PAGE_SIZE } from "@/modules/reports/types/filters"
import type { ReportFilterInput } from "@/modules/reports/types/filters"
import type { ReportPage, StaffingReportRow } from "@/modules/reports/types/reports"

export function buildCoverageRows(dataset: ReportDataset): StaffingReportRow[] {
  const departments = [...new Set([
    ...dataset.requirements.map((item) => item.departmentId),
    ...dataset.assignments.map((item) => item.departmentId),
  ])].sort()

  const rows: StaffingReportRow[] = []

  for (const departmentId of departments) {
    const requirements = dataset.requirements.filter(
      (item) => item.departmentId === departmentId,
    )
    const assignments = dataset.assignments.filter(
      (item) => item.departmentId === departmentId,
    )
    const cells = calculateCoverage({
      startDate: dataset.period.dateFrom,
      endDate: dataset.period.dateTo,
      requirements,
      assignments,
    })

    for (const cell of cells) {
      const status = cell.requiredCount <= 0 ? "no_requirement" : cell.status
      rows.push({
        date: cell.date,
        departmentId,
        departmentName: dataset.departments.get(departmentId) ?? "Unknown department",
        professionName: dataset.professions.get(cell.professionId) ?? "Unknown profession",
        shiftTypeName: dataset.shiftTypes.get(cell.shiftTypeId) ?? "Unknown shift",
        requiredCount: cell.requiredCount,
        assignedCount: cell.assignedCount,
        coveragePercent: cellCoveragePercent(cell.requiredCount, cell.assignedCount),
        status,
      })
    }
  }

  return rows.sort((left, right) => {
    const date = left.date.localeCompare(right.date)
    if (date !== 0) {
      return date
    }

    const department = left.departmentName.localeCompare(right.departmentName)
    if (department !== 0) {
      return department
    }

    const shift = left.shiftTypeName.localeCompare(right.shiftTypeName)
    if (shift !== 0) {
      return shift
    }

    return left.professionName.localeCompare(right.professionName)
  })
}

export async function listStaffingReport(
  input: ReportFilterInput = {},
): Promise<ReportPage<StaffingReportRow>> {
  const dataset = await loadReportDataset(input)
  return {
    ...paginateItems(buildCoverageRows(dataset), dataset.filters.page, REPORT_PAGE_SIZE),
    dateFrom: dataset.period.dateFrom,
    dateTo: dataset.period.dateTo,
  }
}

export async function staffingReportRows(input: ReportFilterInput = {}) {
  const dataset = await loadReportDataset(input)
  return buildCoverageRows(dataset)
}
