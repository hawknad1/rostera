import type { EmploymentStatus, EmploymentType } from "@/modules/staff/schemas/staff"

export const employmentStatusLabels: Record<EmploymentStatus, string> = {
  ACTIVE: "Active",
  ON_LEAVE: "On leave",
  SUSPENDED: "Suspended",
  TERMINATED: "Terminated",
}

export const employmentTypeLabels: Record<EmploymentType, string> = {
  FULL_TIME: "Full time",
  PART_TIME: "Part time",
  CONTRACT: "Contract",
  LOCUM: "Locum",
  CASUAL: "Casual",
}

export function formatStaffName(staff: {
  firstName: string
  middleName?: string | null
  lastName: string
}) {
  return [staff.firstName, staff.middleName, staff.lastName].filter(Boolean).join(" ")
}

export function formatDateJoined(value: unknown) {
  if (!value) {
    return null
  }

  const raw = String(value)
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  return match?.[1] ?? raw.slice(0, 10)
}
