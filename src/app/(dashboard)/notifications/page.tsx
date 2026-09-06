import { requireOrganization } from "@/lib/auth/require-organization"
import { NotificationList } from "@/modules/notifications/ui/notification-list"
import { listNotifications } from "@/modules/notifications/services/notifications"

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const membership = await requireOrganization()
  const params = await searchParams
  const page = Number.parseInt(params.page ?? "1", 10)
  const result = await listNotifications(Number.isFinite(page) ? page : 1)

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          {result.unreadCount === 0
            ? "You are up to date."
            : result.unreadCount === 1
              ? "You have 1 unread notification."
              : `You have ${result.unreadCount} unread notifications.`}
        </p>
      </div>
      <NotificationList
        notifications={result.items}
        timeZone={String(membership.organization.timezone)}
        page={result.page}
        hasPrevious={result.hasPrevious}
        hasNext={result.hasNext}
      />
    </main>
  )
}
