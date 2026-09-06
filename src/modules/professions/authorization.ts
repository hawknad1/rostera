import { permissions } from "@/lib/permissions/permissions"

export const professionAuthorization = {
  view: permissions.departmentView,
  create: permissions.departmentCreate,
  edit: permissions.departmentEdit,
  deactivate: permissions.departmentEdit,
} as const
