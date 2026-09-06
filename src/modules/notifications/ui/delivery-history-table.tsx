import { getEventChannelPolicy } from "@/modules/notifications/channels/registry"
import type { DeliveryHistoryRecord, DeliveryListFilters } from "@/modules/notifications/services/delivery-history"
import { formatNotificationTimestamp } from "@/modules/notifications/ui/format"

const CHANNEL_LABELS = {
  IN_APP: "In-app",
  EMAIL: "Email",
  SMS: "SMS",
  WHATSAPP: "WhatsApp",
} as const

const STATUS_LABELS = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  SENT: "Sent",
  DELIVERED: "Delivered",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
} as const

export function DeliveryHistoryTable({
  deliveries,
  timeZone,
  page,
  hasPrevious,
  hasNext,
  total,
  filters,
}: {
  deliveries: DeliveryHistoryRecord[]
  timeZone: string
  page: number
  hasPrevious: boolean
  hasNext: boolean
  total: number
  filters: DeliveryListFilters
}) {
  if (deliveries.length === 0) {
    return <p className="text-sm text-muted-foreground">No notification deliveries match these filters.</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="border-b border-border text-muted-foreground">
            <tr>
              <th className="py-2 pr-4 font-medium">When</th>
              <th className="py-2 pr-4 font-medium">Event</th>
              <th className="py-2 pr-4 font-medium">Recipient</th>
              <th className="py-2 pr-4 font-medium">Channel</th>
              <th className="py-2 pr-4 font-medium">Status</th>
              <th className="py-2 font-medium">Attempts</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.map((delivery) => (
              <tr className="border-b border-border align-top" key={delivery.id}>
                <td className="py-3 pr-4 whitespace-nowrap text-muted-foreground">
                  {formatNotificationTimestamp(delivery.createdAt, timeZone)}
                </td>
                <td className="py-3 pr-4">
                  <p className="font-medium">{getEventChannelPolicy(delivery.eventType).label}</p>
                  <p className="text-xs text-muted-foreground">{delivery.provider}</p>
                </td>
                <td className="py-3 pr-4">
                  <p>{delivery.recipientLabel}</p>
                  <p className="text-xs text-muted-foreground">{delivery.destination}</p>
                </td>
                <td className="py-3 pr-4">{CHANNEL_LABELS[delivery.channel]}</td>
                <td className="py-3 pr-4">
                  <p>{STATUS_LABELS[delivery.status]}</p>
                  {delivery.lastError ? (
                    <p className="text-xs text-muted-foreground">{delivery.lastError}</p>
                  ) : null}
                  {delivery.providerMessageId ? (
                    <p className="text-xs text-muted-foreground">{delivery.providerMessageId}</p>
                  ) : null}
                </td>
                <td className="py-3">{delivery.attemptCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-muted-foreground">
          Page {page} · {total} {total === 1 ? "delivery" : "deliveries"}
        </p>
        <div className="flex items-center gap-4">
          {hasPrevious ? (
            <a
              className="font-medium text-primary underline-offset-4 hover:underline"
              href={deliveryHref(filters, page - 1)}
            >
              Previous
            </a>
          ) : (
            <span className="text-muted-foreground">Previous</span>
          )}
          {hasNext ? (
            <a
              className="font-medium text-primary underline-offset-4 hover:underline"
              href={deliveryHref(filters, page + 1)}
            >
              Next
            </a>
          ) : (
            <span className="text-muted-foreground">Next</span>
          )}
        </div>
      </div>
    </div>
  )
}

function deliveryHref(filters: DeliveryListFilters, page: number) {
  const params = new URLSearchParams()
  if (page > 1) {
    params.set("page", String(page))
  }
  if (filters.status) {
    params.set("status", filters.status)
  }
  if (filters.channel) {
    params.set("channel", filters.channel)
  }
  const query = params.toString()
  return query ? `/notifications/deliveries?${query}` : "/notifications/deliveries"
}
