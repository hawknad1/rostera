import { z } from "zod"

import { reportFilterSchema } from "@/modules/reports/schemas/reports"

export const reportExportKinds = ["attendance", "staffing", "leave", "staff"] as const

export type ReportExportKind = (typeof reportExportKinds)[number]

export const reportExportKindSchema = z.enum(reportExportKinds)

export const reportExportFilterSchema = reportFilterSchema
