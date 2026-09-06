import { getStaffAttendanceToday } from "@/modules/attendance/services/records"
import { StaffAttendanceToday } from "@/modules/attendance/ui/staff-attendance-today"
import { resolveStaffIdentity } from "@/modules/staff-app/services/identity"
import { UnlinkedStaffState } from "@/modules/staff-app/ui/staff-status"

export default async function StaffAttendancePage() {
  const identity = await resolveStaffIdentity()

  if (identity.status === "UNLINKED") {
    return <UnlinkedStaffState />
  }

  const today = await getStaffAttendanceToday()

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
        <p className="text-sm text-muted-foreground">Clock in and out for your shift. This requires a live connection.</p>
      </header>
      <StaffAttendanceToday
        canMutate={identity.canMutate}
        timeZone={identity.timeZone}
        today={today}
      />
    </div>
  )
}
