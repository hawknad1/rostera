import Link from "next/link"
import { notFound } from "next/navigation"

import { hasPermission } from "@/lib/auth/has-permission"
import { requirePermission } from "@/lib/auth/require-permission"
import { permissions } from "@/lib/permissions/permissions"
import { StaffError } from "@/modules/staff/errors"
import {
  employmentStatusLabels,
  employmentTypeLabels,
  formatDateJoined,
  formatStaffName,
} from "@/modules/staff/labels"
import { DeactivateStaffForm } from "@/modules/staff/ui/deactivate-staff-form"
import { EditStaffForm } from "@/modules/staff/ui/edit-staff-form"
import { getStaff, listStaffFormOptions } from "@/modules/staff/services/staff"

export default async function StaffDetailPage({
  params,
}: PageProps<"/staff/[id]">) {
  const { id } = await params
  const membership = await requirePermission(permissions.staffView)

  let staff
  try {
    staff = await getStaff(id)
  } catch (error) {
    if (error instanceof StaffError && error.code === "NOT_FOUND") {
      notFound()
    }
    throw error
  }

  const [canEdit, canDeactivate, options] = await Promise.all([
    hasPermission(membership, permissions.staffEdit),
    hasPermission(membership, permissions.staffDeactivate),
    canEditStaffForm(membership),
  ])

  const professions = options
    ? [
        ...options.professions.global.map((profession) => ({
          id: profession.id,
          name: profession.name,
          isActive: profession.isActive,
          source: "Global" as const,
        })),
        ...options.professions.organization.map((profession) => ({
          id: profession.id,
          name: profession.name,
          isActive: profession.isActive,
          source: "Hospital" as const,
        })),
      ]
    : []

  const dateJoined = formatDateJoined(staff.dateJoined)

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <Link className="text-sm text-muted-foreground underline-offset-4 hover:underline" href="/staff">
          Back to staff
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{formatStaffName(staff)}</h1>
        <p className="text-sm text-muted-foreground">Staff number {staff.staffNumber}</p>
      </div>

      <section className="grid gap-6 sm:grid-cols-2">
        <dl className="flex flex-col gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Profession</dt>
            <dd>{staff.professionName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Department</dt>
            <dd>
              {staff.departmentName}
              {staff.isDepartmentHead ? (
                <span className="ml-2 text-muted-foreground">
                  Head of {staff.headedDepartmentName ?? staff.departmentName}
                </span>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Employment type</dt>
            <dd>{employmentTypeLabels[staff.employmentType]}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd>{employmentStatusLabels[staff.employmentStatus]}</dd>
          </div>
        </dl>
        <dl className="flex flex-col gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Date joined</dt>
            <dd>{dateJoined ?? "Not recorded"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Phone</dt>
            <dd>{staff.phone || "Not recorded"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd>{staff.email || "Not recorded"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Rostera login</dt>
            <dd>{staff.hasRosteraLogin ? "Linked" : "Not linked"}</dd>
          </div>
        </dl>
      </section>

      {staff.photoUrl ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">Profile photo</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={`${formatStaffName(staff)} profile`}
            className="h-32 w-32 rounded-md object-cover"
            src={staff.photoUrl}
          />
        </section>
      ) : null}

      {canEdit && options ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Edit staff member</h2>
          <p className="text-sm text-muted-foreground">
            Staff number cannot be changed after creation.
          </p>
          <EditStaffForm
            departments={options.departments.map((department) => ({
              id: department.id,
              name: department.name,
            }))}
            professions={professions}
            staff={{
              id: staff.id,
              firstName: staff.firstName,
              middleName: staff.middleName,
              lastName: staff.lastName,
              phone: staff.phone,
              email: staff.email,
              professionId: staff.professionId,
              departmentId: staff.departmentId,
              employmentStatus: staff.employmentStatus,
              employmentType: staff.employmentType,
              dateJoined,
              photoUrl: staff.photoUrl,
            }}
          />
        </section>
      ) : null}

      {canDeactivate ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Deactivate</h2>
          <DeactivateStaffForm
            isTerminated={staff.employmentStatus === "TERMINATED"}
            staffId={staff.id}
          />
        </section>
      ) : null}
    </main>
  )
}

async function canEditStaffForm(membership: Awaited<ReturnType<typeof requirePermission>>) {
  const canEdit = await hasPermission(membership, permissions.staffEdit)
  if (!canEdit) {
    return null
  }

  return listStaffFormOptions()
}
