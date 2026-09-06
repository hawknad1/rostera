import { requirePermission } from "@/lib/auth/require-permission"
import { permissions } from "@/lib/permissions/permissions"
import {
  getNotificationDeliveryCounts,
  listNotificationDeliveries,
} from "@/modules/notifications/services/delivery-history"
import { DeliveryHistoryTable } from "@/modules/notifications/ui/delivery-history-table"
import {
  notificationChannels,
  notificationDeliveryStatuses,
  type NotificationChannel,
  type NotificationDeliveryStatus,
} from "@/modules/notifications/types/notification"

export default async function NotificationDeliveriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const membership = await requirePermission(permissions.notificationsView)
  const params = await searchParams
  const status =
    typeof params.status === "string" &&
    notificationDeliveryStatuses.includes(params.status as NotificationDeliveryStatus)
      ? (params.status as NotificationDeliveryStatus)
      : undefined
  const channel =
    typeof params.channel === "string" &&
    notificationChannels.includes(params.channel as NotificationChannel)
      ? (params.channel as NotificationChannel)
      : undefined
  const page = Number.parseInt(typeof params.page === "string" ? params.page : "1", 10)
  const filters = {
    page: Number.isFinite(page) ? page : 1,
    status,
    channel,
  }
  const [result, counts] = await Promise.all([
    listNotificationDeliveries(filters),
    getNotificationDeliveryCounts(),
  ])

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Notification deliveries</h1>
        <p className="text-sm text-muted-foreground">
          Operational history for in-app and external notification channels. Destinations are masked.
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">Pending</dt>
          <dd className="font-medium">{counts.pending}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Processing</dt>
          <dd className="font-medium">{counts.processing}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Sent</dt>
          <dd className="font-medium">{counts.sent}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Delivered</dt>
          <dd className="font-medium">{counts.delivered}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Failed</dt>
          <dd className="font-medium">{counts.failed}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Retries queued</dt>
          <dd className="font-medium">{counts.retry}</dd>
        </div>
      </dl>
      <DeliveryHistoryTable
        deliveries={result.items}
        filters={filters}
        hasNext={result.hasNext}
        hasPrevious={result.hasPrevious}
        page={result.page}
        timeZone={String(membership.organization.timezone)}
        total={result.total}
      />
    </main>
  )
}
