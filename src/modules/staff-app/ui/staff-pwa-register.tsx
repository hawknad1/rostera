"use client"

import { useEffect } from "react"

export function StaffPwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return
    }

    void navigator.serviceWorker.register("/sw.js", { scope: "/me" })
  }, [])

  return null
}
