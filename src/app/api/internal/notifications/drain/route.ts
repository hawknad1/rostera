import { NextResponse } from "next/server"

import { authorizeNotificationWorker } from "@/modules/notifications/services/webhooks"
import { drainNotificationWork } from "@/modules/notifications/services/worker"

export async function POST(request: Request) {
  if (!authorizeNotificationWorker(request)) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const result = await drainNotificationWork()
  return NextResponse.json({
    ok: true,
    reclaimedOutbox: result.reclaimedOutbox,
    reclaimedDeliveries: result.reclaimedDeliveries,
    outboxProcessed: result.outboxProcessed,
    deliveries: result.deliveries,
  })
}

export function GET() {
  return new NextResponse("Method Not Allowed", { status: 405 })
}
