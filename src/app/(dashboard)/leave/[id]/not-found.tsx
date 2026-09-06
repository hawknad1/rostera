import Link from "next/link"

export default function LeaveNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Leave request not found</h1>
      <p className="text-sm text-muted-foreground">
        This leave request does not exist in your organization.
      </p>
      <Link className="text-sm font-medium text-primary underline-offset-4 hover:underline" href="/leave">
        Back to leave
      </Link>
    </main>
  )
}
