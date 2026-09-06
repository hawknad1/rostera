import { calendarDateRangesOverlap, isDateInInclusiveRange } from "@/lib/dates/calendar-date"
import { evaluateRosterValidation } from "@/modules/rosters/services/validation"
import type { SchedulingConflict } from "@/modules/scheduling/types/scheduling-conflict"
import type { ReportDataset } from "@/modules/reports/services/dataset"
import { loadReportDataset } from "@/modules/reports/services/dataset"
import { paginateItems } from "@/modules/reports/services/metrics"
import type { ReportFilterInput, SchedulingExceptionBand } from "@/modules/reports/types/filters"
import { REPORT_PAGE_SIZE } from "@/modules/reports/types/filters"
import type { ExceptionReportRow, ReportPage } from "@/modules/reports/types/reports"
import { db } from "@/prisma/db"

function exceptionBand(conflict: SchedulingConflict): SchedulingExceptionBand {
  if (conflict.blocking) {
    return "BLOCKING"
  }

  if (conflict.severity === "INFO") {
    return "INFO"
  }

  return "WARNING"
}

function conflictKey(rosterId: string, conflict: SchedulingConflict) {
  return [
    rosterId,
    conflict.code,
    conflict.staffId ?? "",
    conflict.assignmentId ?? "",
    conflict.date ?? "",
    conflict.rule,
  ].join("|")
}

export async function reconstructSchedulingExceptions(
  dataset: ReportDataset,
): Promise<ExceptionReportRow[]> {
  const rows: ExceptionReportRow[] = []
  const seen = new Set<string>()

  for (const roster of dataset.publishedRosters) {
    if (
      !calendarDateRangesOverlap(
        roster.startDate,
        roster.endDate,
        dataset.period.dateFrom,
        dataset.period.dateTo,
      )
    ) {
      continue
    }

    if (dataset.filters.departmentId && roster.departmentId !== dataset.filters.departmentId) {
      continue
    }

    const result = await evaluateRosterValidation(db.orm, {
      organizationId: dataset.organizationId,
      timeZone: dataset.period.timeZone,
      roster: {
        id: roster.id,
        organizationId: dataset.organizationId,
        departmentId: roster.departmentId,
        startDate: roster.startDate,
        endDate: roster.endDate,
        seriesId: roster.seriesId,
      },
    })

    const conflicts = [...result.blockers, ...result.warnings, ...result.infos]
    for (const conflict of conflicts) {
      if (conflict.date && !isDateInInclusiveRange(conflict.date, dataset.period.dateFrom, dataset.period.dateTo)) {
        continue
      }

      if (dataset.filters.staffId && conflict.staffId !== dataset.filters.staffId) {
        continue
      }

      if (conflict.staffId) {
        const profile = dataset.staff.get(conflict.staffId)
        if (dataset.filters.departmentId && profile && profile.departmentId !== dataset.filters.departmentId) {
          continue
        }

        if (dataset.filters.professionId && profile && profile.professionId !== dataset.filters.professionId) {
          continue
        }
      }

      const band = exceptionBand(conflict)
      if (dataset.filters.schedulingSeverity && band !== dataset.filters.schedulingSeverity) {
        continue
      }

      const key = conflictKey(roster.id, conflict)
      if (seen.has(key)) {
        continue
      }

      seen.add(key)
      rows.push({
        band,
        code: conflict.code,
        message: conflict.message,
        rule: conflict.rule,
        date: conflict.date ?? null,
        staffName: conflict.staffId
          ? dataset.staff.get(conflict.staffId)?.name ?? result.staffNames[conflict.staffId] ?? null
          : null,
        rosterName: roster.name,
        rosterId: roster.id,
      })
    }
  }

  const order: Record<SchedulingExceptionBand, number> = {
    BLOCKING: 0,
    WARNING: 1,
    INFO: 2,
  }

  return rows.sort((left, right) => {
    const band = order[left.band] - order[right.band]
    if (band !== 0) {
      return band
    }

    const date = (left.date ?? "").localeCompare(right.date ?? "")
    if (date !== 0) {
      return date
    }

    return left.message.localeCompare(right.message)
  })
}

export async function summarizeSchedulingExceptions(dataset: ReportDataset) {
  const rows = await reconstructSchedulingExceptions(dataset)
  return {
    blockers: rows.filter((row) => row.band === "BLOCKING").length,
    warnings: rows.filter((row) => row.band === "WARNING").length,
    infos: rows.filter((row) => row.band === "INFO").length,
  }
}

export async function listExceptionReport(
  input: ReportFilterInput = {},
): Promise<ReportPage<ExceptionReportRow>> {
  const dataset = await loadReportDataset(input)
  const rows = await reconstructSchedulingExceptions(dataset)
  return {
    ...paginateItems(rows, dataset.filters.page, REPORT_PAGE_SIZE),
    dateFrom: dataset.period.dateFrom,
    dateTo: dataset.period.dateTo,
  }
}
