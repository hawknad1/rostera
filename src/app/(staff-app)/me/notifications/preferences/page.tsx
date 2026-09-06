import Link from "next/link"

import { resolveStaffIdentity } from "@/modules/staff-app/services/identity"
import { UnlinkedStaffState } from "@/modules/staff-app/ui/staff-status"
import { updateStaffNotificationPreferenceAction } from "@/modules/notifications/actions/preferences"
import { getStaffNotificationPreferences } from "@/modules/notifications/services/preferences"

const CHANNEL_LABELS = {
  IN_APP: "In-app",
  EMAIL: "Email",
  SMS: "SMS",
  WHATSAPP: "WhatsApp",
} as const

export default async function StaffNotificationPreferencesPage() {
  const identity = await resolveStaffIdentity()

  if (identity.status === "UNLINKED") {
    return <UnlinkedStaffState />
  }

  const groups = await getStaffNotificationPreferences()

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm">
          <Link
            className="font-medium text-primary underline-offset-4 hover:underline"
            href="/me/notifications"
          >
            Back to notifications
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Notification preferences</h1>
        <p className="text-sm text-muted-foreground">
          In-app notifications stay on. Operational email for leave decisions, completed swaps, and
          published rosters also stays on. Other channels follow your choices when a destination is
          available.
        </p>
      </header>

      {groups.map((group) => (
        <section className="flex flex-col gap-4" key={group.id}>
          <h2 className="text-lg font-medium">{group.label}</h2>
          <ul className="flex flex-col divide-y divide-border border-y border-border">
            {group.events.map((event) => (
              <li className="flex flex-col gap-3 py-4" key={event.type}>
                <p className="text-sm font-medium">{event.label}</p>
                <ul className="flex flex-col gap-2">
                  {event.channels.map((channel) => (
                    <li
                      className="flex min-h-11 flex-wrap items-center justify-between gap-3"
                      key={`${event.type}-${channel.channel}`}
                    >
                      <p className="text-sm text-muted-foreground">
                        {CHANNEL_LABELS[channel.channel]}
                        {channel.locked ? " · Always on" : null}
                        {!channel.available ? " · Not configured" : null}
                      </p>
                      {channel.locked || !channel.available ? (
                        <p className="text-sm font-medium">{channel.enabled ? "On" : "Off"}</p>
                      ) : (
                        <form action={updateStaffNotificationPreferenceAction}>
                          <input name="eventType" type="hidden" value={event.type} />
                          <input name="channel" type="hidden" value={channel.channel} />
                          <input
                            name="enabled"
                            type="hidden"
                            value={channel.enabled ? "false" : "true"}
                          />
                          <button
                            className="min-h-11 text-sm font-medium text-primary underline-offset-4 hover:underline"
                            type="submit"
                          >
                            {channel.enabled ? "On" : "Off"}
                          </button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
