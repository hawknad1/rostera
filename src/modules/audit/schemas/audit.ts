import { z } from "zod"

import { auditActions, auditEntityTypes } from "@/modules/audit/types/audit"

export const auditActionSchema = z.enum(auditActions)
export const auditEntityTypeSchema = z.enum(auditEntityTypes)

export const auditIdInputSchema = z.object({
  id: z.string().trim().min(1, "Audit event is required."),
})

export const auditListFilterSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  action: z.union([auditActionSchema, z.literal("")]).optional(),
  entityType: z.union([auditEntityTypeSchema, z.literal("")]).optional(),
  actorUserId: z.string().trim().optional(),
  entityId: z.string().trim().optional(),
  q: z.string().trim().optional(),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
})
