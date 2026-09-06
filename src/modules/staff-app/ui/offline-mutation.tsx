"use client"

import { useOnlineStatus } from "@/modules/staff-app/ui/staff-cache-sync"
import { OFFLINE_MUTATION_MESSAGE } from "@/modules/staff-app/format"

export function OfflineMutationNotice() {
  const online = useOnlineStatus()

  if (online) {
    return null
  }

  return (
    <p className="text-sm text-foreground" role="status">
      {OFFLINE_MUTATION_MESSAGE}
    </p>
  )
}

export function useOfflineSubmitGuard() {
  const online = useOnlineStatus()

  return {
    online,
    message: online ? null : OFFLINE_MUTATION_MESSAGE,
  }
}
