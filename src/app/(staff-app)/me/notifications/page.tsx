import { Temporal } from "temporal-polyfill"

import { listNotifications } from "@/modules/notifications/services/notifications"
import { formatNotificationTimestamp } from "@/modules/notifications/ui/format"
import {
  markAllStaffNotificationsReadAction,
  markStaffNotificationReadAction,
  markStaffNotificationUnreadAction,
  openStaffNotificationAction,
} from "@/modules/staff-app/actions/notifications"
import { resolveStaffIdentity } from "@/modules/staff-app/services/identity"
import { StaffCacheSync } from "@/modules/staff-app/ui/staff-cache-sync"
import { UnlinkedStaffState } from "@/modules/staff-app/ui/staff-status"

export default async function StaffNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const identity = await resolveStaffIdentity()

  if (identity.status === "UNLINKED") {
    return <UnlinkedStaffState />
  }

  const params = await searchParams
  const page = Number.parseInt(params.page ?? "1", 10)
  const result = await listNotifications(Number.isFinite(page) ? page : 1)

  return (
    <div className="flex flex-col gap-6">
      <StaffCacheSync
        organizationId={identity.staff.organizationId}
        patch={{
          cachedAt: Temporal.Now.instant().toString(),
          notifications: {
            unreadCount: result.unreadCount,
            items: result.items.map((notification) => ({
              id: notification.id,
              title: notification.title,
              body: notification.body,
              entityType: notification.entityType,
              entityId: notification.entityId,
              readAt: notification.readAt,
              createdAt: notification.createdAt,
            })),
          },
        }}
        userId={identity.user.id}
      />

      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          {result.unreadCount === 0
            ? "You are up to date."
            : result.unreadCount === 1
              ? "You have 1 unread notification."
              : `You have ${result.unreadCount} unread notifications.`}
        </p>
      </header>

      {result.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">You have no notifications yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          <form action={markAllStaffNotificationsReadAction}>
            <button
              className="min-h-11 text-sm font-medium text-primary underline-offset-4 hover:underline"
              type="submit"
            >
              Mark all as read
            </button>
          </form>
          <ul className="flex flex-col">
            {result.items.map((notification) => {
              const unread = notification.readAt == null
              return (
                <li className="flex flex-col gap-2 border-b border-border py-4 last:border-b-0" key={notification.id}>
                  <p className="text-sm font-medium">
                    {unread ? <span className="sr-only">Unread. </span> : null}
                    {notification.title}
                  </p>
                  <p className="text-sm text-muted-foreground">{notification.body}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatNotificationTimestamp(notification.createdAt, identity.timeZone)}
                    {unread ? " · Unread" : " · Read"}
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <form action={openStaffNotificationAction}>
                      <input name="id" type="hidden" value={notification.id} />
                      <button
                        className="min-h-11 text-sm font-medium text-primary underline-offset-4 hover:underline"
                        type="submit"
                      >
                        Open
                      </button>
                    </form>
                    {unread ? (
                      <form action={markStaffNotificationReadAction}>
                        <input name="id" type="hidden" value={notification.id} />
                        <button
                          className="min-h-11 text-sm underline-offset-4 hover:underline"
                          type="submit"
                        >
                          Mark as read
                        </button>
                      </form>
                    ) : (
                      <form action={markStaffNotificationUnreadAction}>
                        <input name="id" type="hidden" value={notification.id} />
                        <button
                          className="min-h-11 text-sm underline-offset-4 hover:underline"
                          type="submit"
                        >
                          Mark as unread
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
