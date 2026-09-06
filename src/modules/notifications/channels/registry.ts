import {
  notificationTypes,
  type NotificationChannel,
  type NotificationPriority,
  type NotificationType,
} from "@/modules/notifications/types/notification"

export type EventChannelPolicy = {
  type: NotificationType
  label: string
  group: "Leave" | "Shift swaps" | "Rosters" | "Attendance" | "Organization"
  priority: NotificationPriority
  allowedChannels: readonly NotificationChannel[]
  defaultChannels: readonly NotificationChannel[]
}

const ALL_CHANNELS = ["IN_APP", "EMAIL", "SMS", "WHATSAPP"] as const satisfies readonly NotificationChannel[]

function policy(
  type: NotificationType,
  label: string,
  group: EventChannelPolicy["group"],
  priority: NotificationPriority,
  defaultChannels: readonly NotificationChannel[],
  allowedChannels: readonly NotificationChannel[] = ALL_CHANNELS,
): EventChannelPolicy {
  return { type, label, group, priority, allowedChannels, defaultChannels }
}

export const NOTIFICATION_EVENT_REGISTRY: readonly EventChannelPolicy[] = [
  policy("LEAVE_REQUESTED", "Leave requested", "Leave", "optional", ["IN_APP", "EMAIL"]),
  policy("LEAVE_APPROVED", "Leave approved", "Leave", "operational", ["IN_APP", "EMAIL", "SMS"]),
  policy("LEAVE_REJECTED", "Leave rejected", "Leave", "operational", ["IN_APP", "EMAIL"]),
  policy("LEAVE_CANCELLED", "Leave cancelled", "Leave", "optional", ["IN_APP", "EMAIL"]),
  policy("SHIFT_SWAP_REQUESTED", "Shift swap requested", "Shift swaps", "optional", ["IN_APP", "EMAIL"]),
  policy("SHIFT_SWAP_COMPLETED", "Shift swap completed", "Shift swaps", "operational", [
    "IN_APP",
    "EMAIL",
    "SMS",
  ]),
  policy("SHIFT_SWAP_REJECTED", "Shift swap rejected", "Shift swaps", "optional", ["IN_APP", "EMAIL"]),
  policy("SHIFT_SWAP_CANCELLED", "Shift swap cancelled", "Shift swaps", "optional", ["IN_APP", "EMAIL"]),
  policy("ROSTER_SUBMITTED_FOR_REVIEW", "Roster submitted for review", "Rosters", "optional", [
    "IN_APP",
    "EMAIL",
  ]),
  policy("ROSTER_PUBLISHED", "Roster published", "Rosters", "operational", [
    "IN_APP",
    "EMAIL",
    "SMS",
    "WHATSAPP",
  ]),
  policy("ROSTER_RETURNED_TO_DRAFT", "Roster returned to draft", "Rosters", "optional", [
    "IN_APP",
    "EMAIL",
  ]),
  policy("ROSTER_AMENDMENT_CREATED", "Roster amendment created", "Rosters", "optional", [
    "IN_APP",
    "EMAIL",
  ]),
  policy("ATTENDANCE_CORRECTED", "Attendance corrected", "Attendance", "optional", [
    "IN_APP",
    "EMAIL",
  ]),
  policy("ATTENDANCE_APPROVED", "Attendance correction approved", "Attendance", "optional", [
    "IN_APP",
    "EMAIL",
  ]),
  policy("ATTENDANCE_REJECTED", "Attendance correction rejected", "Attendance", "optional", [
    "IN_APP",
    "EMAIL",
  ]),
  policy("ORGANIZATION_INVITED", "Organization invitation", "Organization", "operational", ["EMAIL"], [
    "EMAIL",
  ]),
]

const BY_TYPE = new Map(NOTIFICATION_EVENT_REGISTRY.map((entry) => [entry.type, entry]))

export function getEventChannelPolicy(type: NotificationType): EventChannelPolicy {
  const policyEntry = BY_TYPE.get(type)
  if (!policyEntry) {
    throw new Error(`Unknown notification event type: ${type}`)
  }
  return policyEntry
}

export function isOperationalEvent(type: NotificationType) {
  return getEventChannelPolicy(type).priority === "operational"
}

export function isPreferenceLocked(type: NotificationType, channel: NotificationChannel) {
  if (channel === "IN_APP") {
    return true
  }

  return isOperationalEvent(type) && channel === "EMAIL"
}

export function defaultChannelEnabled(type: NotificationType, channel: NotificationChannel) {
  const policyEntry = getEventChannelPolicy(type)
  if (!policyEntry.allowedChannels.includes(channel)) {
    return false
  }

  if (channel === "IN_APP") {
    return true
  }

  return policyEntry.defaultChannels.includes(channel)
}

export function preferenceGroups() {
  const groups: Array<{
    id: EventChannelPolicy["group"]
    label: string
    events: EventChannelPolicy[]
  }> = [
    { id: "Rosters", label: "Rosters", events: [] },
    { id: "Leave", label: "Leave", events: [] },
    { id: "Shift swaps", label: "Shift swaps", events: [] },
    { id: "Attendance", label: "Attendance", events: [] },
    { id: "Organization", label: "Organization", events: [] },
  ]

  for (const event of NOTIFICATION_EVENT_REGISTRY) {
    const group = groups.find((candidate) => candidate.id === event.group)
    group?.events.push(event)
  }

  return groups
}

export function assertKnownEventTypes() {
  for (const type of notificationTypes) {
    getEventChannelPolicy(type)
  }
}
