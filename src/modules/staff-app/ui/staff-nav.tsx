"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ArrowLeftRight,
  Bell,
  CalendarDays,
  Clock3,
  House,
  Palmtree,
} from "lucide-react"

const items = [
  { href: "/me", label: "Home", icon: House, exact: true },
  { href: "/me/roster", label: "Roster", icon: CalendarDays },
  { href: "/me/shifts", label: "Shifts", icon: Clock3 },
  { href: "/me/leave", label: "Leave", icon: Palmtree },
  { href: "/me/swaps", label: "Swaps", icon: ArrowLeftRight },
  { href: "/me/notifications", label: "Notifications", icon: Bell },
] as const

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) {
    return pathname === href
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

export function StaffNav({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Staff"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background md:static md:border-t-0 md:border-b"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-1 md:max-w-3xl">
        {items.map((item) => {
          const active = isActive(pathname, item.href, "exact" in item ? item.exact : false)
          const Icon = item.icon
          return (
            <li className="flex-1" key={item.href}>
              <Link
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-11 md:flex-row md:gap-2 md:text-sm ${
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                href={item.href}
              >
                <span className="relative">
                  <Icon aria-hidden="true" className="size-5" />
                  {item.href === "/me/notifications" && unreadCount > 0 ? (
                    <span className="sr-only">{unreadCount} unread</span>
                  ) : null}
                  {item.href === "/me/notifications" && unreadCount > 0 ? (
                    <span
                      aria-hidden="true"
                      className="absolute -right-1 -top-1 size-1.5 rounded-full bg-foreground"
                    />
                  ) : null}
                </span>
                <span>{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
