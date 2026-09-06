export function UnlinkedStaffState() {
  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-xl font-semibold tracking-tight">Account not linked</h1>
      <p className="text-sm text-muted-foreground">
        Your account is not yet linked to a staff profile.
      </p>
      <p className="text-sm text-muted-foreground">Please contact your Rostera administrator.</p>
      <p className="text-sm">
        <a className="font-medium text-primary underline-offset-4 hover:underline" href="/me/account">
          Account settings
        </a>
      </p>
    </section>
  )
}

export function TerminatedStaffNotice() {
  return (
    <p className="text-sm text-muted-foreground" role="status">
      This staff profile is terminated. You can view historical information, but you cannot submit
      new leave or swap requests.
    </p>
  )
}
