import Link from "next/link"

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
  markNotificationUnreadAction,
  openNotificationAction,
} from "@/modules/notifications/actions/notifications"
import type { NotificationRecord } from "@/modules/notifications/services/notifications"
import { formatNotificationTimestamp } from "@/modules/notifications/ui/format"

export function NotificationList({
  notifications,
  timeZone,
  page,
  hasPrevious,
  hasNext,
}: {
  notifications: NotificationRecord[]
  timeZone: string
  page: number
  hasPrevious: boolean
  hasNext: boolean
}) {
  if (notifications.length === 0) {
    return <p className="text-sm text-muted-foreground">You have no notifications yet.</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <form action={markAllNotificationsReadAction}>
        <button
          type="submit"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Mark all as read
        </button>
      </form>
      <ul className="flex flex-col border-y border-border">
        {notifications.map((notification) => {
          const unread = notification.readAt == null
          return (
            <li
              key={notification.id}
              className="flex flex-col gap-2 border-b border-border py-4 last:border-b-0"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {unread ? (
                      <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    ) : null}
                    <span>{notification.title}</span>
                    {unread ? <span className="sr-only">Unread</span> : null}
                  </p>
                  <p className="text-sm text-muted-foreground">{notification.body}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatNotificationTimestamp(notification.createdAt, timeZone)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <form action={openNotificationAction}>
                    <input type="hidden" name="id" value={notification.id} />
                    <button
                      type="submit"
                      className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Open
                    </button>
                  </form>
                  {unread ? (
                    <form action={markNotificationReadAction}>
                      <input type="hidden" name="id" value={notification.id} />
                      <button
                        type="submit"
                        className="text-sm text-foreground underline-offset-4 hover:underline"
                      >
                        Mark as read
                      </button>
                    </form>
                  ) : (
                    <form action={markNotificationUnreadAction}>
                      <input type="hidden" name="id" value={notification.id} />
                      <button
                        type="submit"
                        className="text-sm text-foreground underline-offset-4 hover:underline"
                      >
                        Mark as unread
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
      {hasPrevious || hasNext ? (
        <nav className="flex gap-4 text-sm" aria-label="Notification pages">
          {hasPrevious ? (
            <Link
              className="font-medium text-primary underline-offset-4 hover:underline"
              href={page === 2 ? "/notifications" : `/notifications?page=${page - 1}`}
            >
              Previous
            </Link>
          ) : null}
          {hasNext ? (
            <Link
              className="font-medium text-primary underline-offset-4 hover:underline"
              href={`/notifications?page=${page + 1}`}
            >
              Next
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  )
}
