import Link from "next/link"
import { Bell } from "lucide-react"

import { openNotificationAction } from "@/modules/notifications/actions/notifications"
import { getNotificationCenterPreview } from "@/modules/notifications/services/notifications"
import { formatNotificationTimestamp } from "@/modules/notifications/ui/format"

export async function NotificationBell({ timeZone }: { timeZone: string }) {
  const { unreadCount, recent } = await getNotificationCenterPreview()
  const unreadLabel = unreadCount > 99 ? "99+" : String(unreadCount)

  return (
    <details className="relative">
      <summary
        className="flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1 text-sm text-foreground hover:bg-muted [&::-webkit-details-marker]:hidden"
        aria-label={
          unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
        }
      >
        <Bell className="size-4" aria-hidden="true" />
        <span className="sr-only">Notifications</span>
        {unreadCount > 0 ? (
          <span className="min-w-5 rounded-full bg-primary px-1.5 text-center text-xs font-medium text-primary-foreground">
            {unreadLabel}
          </span>
        ) : null}
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-[min(100vw-2rem,22rem)] border border-border bg-background">
        <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
          <p className="text-sm font-medium">Notifications</p>
          <Link
            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
            href="/notifications"
          >
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">No notifications yet.</p>
        ) : (
          <ul>
            {recent.map((notification) => (
              <li key={notification.id} className="border-b border-border last:border-b-0">
                <form action={openNotificationAction}>
                  <input type="hidden" name="id" value={notification.id} />
                  <button
                    type="submit"
                    className="flex w-full flex-col items-start gap-1 px-3 py-3 text-left hover:bg-muted"
                  >
                    <span className="flex w-full items-center justify-between gap-2">
                      <span className="text-sm font-medium">{notification.title}</span>
                      {notification.readAt == null ? (
                        <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-label="Unread" />
                      ) : null}
                    </span>
                    <span className="text-xs text-muted-foreground">{notification.body}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatNotificationTimestamp(notification.createdAt, timeZone)}
                    </span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  )
}
