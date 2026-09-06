"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

export function SignOutButton() {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function signOut() {
    setPending(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <Button
      disabled={pending}
      onClick={() => void signOut()}
      size="sm"
      type="button"
      variant="ghost"
    >
      {pending ? "Signing out..." : "Sign out"}
    </Button>
  )
}
