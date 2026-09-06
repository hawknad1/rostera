import { requirePermission } from "@/lib/auth/require-permission"
import { hasPermission } from "@/lib/auth/has-permission"
import { permissions } from "@/lib/permissions/permissions"
import { listDepartments } from "@/modules/departments/services/departments"
import { CreateDepartmentForm } from "@/modules/departments/ui/create-department-form"
import { DepartmentList } from "@/modules/departments/ui/department-list"

export default async function DepartmentsPage() {
  const membership = await requirePermission(permissions.departmentView)
  const [departments, canCreate, canEdit] = await Promise.all([
    listDepartments(),
    hasPermission(membership, permissions.departmentCreate),
    hasPermission(membership, permissions.departmentEdit),
  ])

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Departments</h1>
        <p className="text-sm text-muted-foreground">
          Hospital units used for staffing, rosters, and reporting.
        </p>
      </div>

      {departments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No departments have been created yet.</p>
      ) : (
        <DepartmentList canEdit={canEdit} departments={departments} />
      )}

      {canCreate ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Create department</h2>
          <CreateDepartmentForm />
        </section>
      ) : null}
    </main>
  )
}
