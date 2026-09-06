import type { ReportFilterInput } from "@/modules/reports/types/filters"

export function reportFiltersFromSearchParams(
  params: Record<string, string | string[] | undefined>,
): ReportFilterInput {
  const value = (key: string) => {
    const raw = params[key]
    return typeof raw === "string" ? raw : undefined
  }

  return {
    dateFrom: value("dateFrom"),
    dateTo: value("dateTo"),
    departmentId: value("departmentId"),
    professionId: value("professionId"),
    staffId: value("staffId"),
    shiftTypeId: value("shiftTypeId"),
    rosterSeriesId: value("rosterSeriesId"),
    rosterId: value("rosterId"),
    attendanceStatus: value("attendanceStatus") as ReportFilterInput["attendanceStatus"],
    exceptionType: value("exceptionType") as ReportFilterInput["exceptionType"],
    leaveType: value("leaveType") as ReportFilterInput["leaveType"],
    leaveStatus: value("leaveStatus") as ReportFilterInput["leaveStatus"],
    schedulingSeverity: value("schedulingSeverity") as ReportFilterInput["schedulingSeverity"],
    page: value("page") ? Number(value("page")) : undefined,
  }
}

export function reportQueryString(filters: ReportFilterInput, page?: number) {
  const params = new URLSearchParams()
  const assign = (key: string, value: string | number | undefined) => {
    if (value == null || value === "") {
      return
    }

    params.set(key, String(value))
  }

  assign("dateFrom", filters.dateFrom)
  assign("dateTo", filters.dateTo)
  assign("departmentId", filters.departmentId)
  assign("professionId", filters.professionId)
  assign("staffId", filters.staffId)
  assign("shiftTypeId", filters.shiftTypeId)
  assign("rosterSeriesId", filters.rosterSeriesId)
  assign("rosterId", filters.rosterId)
  assign("attendanceStatus", filters.attendanceStatus)
  assign("exceptionType", filters.exceptionType)
  assign("leaveType", filters.leaveType)
  assign("leaveStatus", filters.leaveStatus)
  assign("schedulingSeverity", filters.schedulingSeverity)
  const nextPage = page ?? filters.page
  if (nextPage && nextPage > 1) {
    params.set("page", String(nextPage))
  }

  const query = params.toString()
  return query.length > 0 ? `?${query}` : ""
}

export function reportHref(path: string, filters: ReportFilterInput, page?: number) {
  return `${path}${reportQueryString(filters, page)}`
}

export function reportExportHref(kind: string, filters: ReportFilterInput) {
  const query = reportQueryString({ ...filters, page: undefined })
  const separator = query.length > 0 ? "&" : "?"
  return `/reports/export?kind=${kind}${query.length > 0 ? `${separator}${query.slice(1)}` : ""}`
}
