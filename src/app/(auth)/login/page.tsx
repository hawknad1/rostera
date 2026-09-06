"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"

import { safeInternalPath } from "@/lib/http/safe-path"

function safeNextPath() {
  if (typeof window === "undefined") {
    return "/"
  }

  const params = new URLSearchParams(window.location.search)
  return safeInternalPath(params.get("next")) ?? safeInternalPath(params.get("redirectTo")) ?? "/"
}

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setError(null)
    setLoading(true)

    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError("Invalid email or password.")
      setLoading(false)
      return
    }

    router.push(safeNextPath())
    router.refresh()
  }

  return (
    <main>
      <h1>Sign in to Rostera</h1>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email</label>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="password">Password</label>

          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        {error && <p>{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  )
}
