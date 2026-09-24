import "server-only"

import { cache } from "react"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

export const getCurrentUser = cache(async () => {
  const session = await auth()
  if (!session?.user?.id) return null

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
  }
})

export async function requireCurrentUser() {
  const user = await getCurrentUser()
  if (!user) redirect("/auth/login")
  return user
}
