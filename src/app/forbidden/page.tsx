import Link from "next/link"

export default function ForbiddenPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Permission denied</h1>
      <p className="text-sm text-muted-foreground">
        You do not have permission to view this page.
      </p>
      <Link className="text-sm font-medium text-primary underline-offset-4 hover:underline" href="/dashboard">
        Back to dashboard
      </Link>
    </main>
  )
}
