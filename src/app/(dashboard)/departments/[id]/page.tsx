import Link from "next/link"
import { notFound } from "next/navigation"

import { hasPermission } from "@/lib/auth/has-permission"
import { requirePermission } from "@/lib/auth/require-permission"
import { permissions } from "@/lib/permissions/permissions"
import { DepartmentError } from "@/modules/departments/errors"
import { getDepartment } from "@/modules/departments/services/departments"
import { DeleteDepartmentForm } from "@/modules/departments/ui/delete-department-form"
import { EditDepartmentForm } from "@/modules/departments/ui/edit-department-form"
import { formatStaffName } from "@/modules/staff/labels"
import { AssignDepartmentHeadForm } from "@/modules/staff/ui/assign-department-head-form"
import { getStaff, listAssignableDepartmentHeads } from "@/modules/staff/services/staff"
import { StaffError } from "@/modules/staff/errors"
import { ShiftError } from "@/modules/shifts/errors"
import { listDepartmentStaffingRequirements } from "@/modules/shifts/services/staffing-requirements"

export default async function DepartmentDetailPage({
  params,
}: PageProps<"/departments/[id]">) {
  const { id } = await params
  const membership = await requirePermission(permissions.departmentView)

  let department
  try {
    department = await getDepartment(id)
  } catch (error) {
    if (error instanceof DepartmentError && error.code === "NOT_FOUND") {
      notFound()
    }
    throw error
  }

  const [canEdit, canDelete, canAssignHead, canViewStaff, canViewShifts] = await Promise.all([
    hasPermission(membership, permissions.departmentEdit),
    hasPermission(membership, permissions.departmentDelete),
    hasPermission(membership, permissions.staffEdit),
    hasPermission(membership, permissions.staffView),
    hasPermission(membership, permissions.shiftView),
  ])

  const [headStaff, headCandidates, staffingRequirements] = await Promise.all([
    canViewStaff && department.headStaffId
      ? loadHeadStaff(department.headStaffId)
      : Promise.resolve(null),
    canAssignHead ? listAssignableDepartmentHeads(department.id) : Promise.resolve([]),
    canViewShifts ? loadDepartmentRequirements(department.id) : Promise.resolve([]),
  ])

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <Link className="text-sm text-muted-foreground underline-offset-4 hover:underline" href="/departments">
          Back to departments
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{department.name}</h1>
        {department.description ? (
          <p className="text-sm text-muted-foreground">{department.description}</p>
        ) : null}
        <p className="text-sm text-muted-foreground">
          Department head:{" "}
          {headStaff ? (
            <Link
              className="text-foreground underline-offset-4 hover:underline"
              href={`/staff/${headStaff.id}`}
            >
              {formatStaffName(headStaff)}
            </Link>
          ) : department.headStaffId ? (
            "Assigned"
          ) : (
            "Not assigned"
          )}
        </p>
      </div>

      {canAssignHead ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Department head</h2>
          <AssignDepartmentHeadForm
            candidates={headCandidates}
            currentHeadId={department.headStaffId}
            departmentId={department.id}
          />
        </section>
      ) : null}

      {canViewShifts ? (
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-medium">Staffing requirements</h2>
            <Link
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              href="/shifts/requirements"
            >
              Manage requirements
            </Link>
          </div>
          {staffingRequirements.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No staffing requirements are configured for this department.
            </p>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {staffingRequirements.map((requirement) => (
                <li className="flex flex-wrap items-baseline justify-between gap-2 py-3" key={requirement.id}>
                  <p className="text-sm">
                    {requirement.shiftTypeName} · {requirement.professionName}
                  </p>
                  <p className="text-sm text-muted-foreground">Required: {requirement.requiredCount}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {canEdit ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Edit department</h2>
          <EditDepartmentForm department={department} />
        </section>
      ) : null}

      {canDelete ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Delete department</h2>
          <p className="text-sm text-muted-foreground">
            This permanently removes the department if it is not assigned to staff or staffing
            requirements.
          </p>
          <DeleteDepartmentForm departmentId={department.id} />
        </section>
      ) : null}
    </main>
  )
}

async function loadDepartmentRequirements(departmentId: string) {
  try {
    return await listDepartmentStaffingRequirements(departmentId)
  } catch (error) {
    if (error instanceof ShiftError && (error.code === "NOT_FOUND" || error.code === "FORBIDDEN")) {
      return []
    }
    throw error
  }
}

async function loadHeadStaff(staffId: string) {
  try {
    return await getStaff(staffId)
  } catch (error) {
    if (error instanceof StaffError && error.code === "NOT_FOUND") {
      return null
    }
    throw error
  }
}
