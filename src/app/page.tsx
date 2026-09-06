import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { resolvePostAuthHref } from "@/modules/staff-app/services/post-auth"

export default async function Home() {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }

  redirect(await resolvePostAuthHref())
}
