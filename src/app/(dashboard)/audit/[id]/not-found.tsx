export default function AuditEventNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Audit event not found</h1>
      <p className="text-sm text-muted-foreground">
        This audit event does not exist or is not in your organization.
      </p>
    </main>
  )
}
