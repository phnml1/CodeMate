import { revalidateTag } from "next/cache"

export function invalidateDashboardForUsers(userIds: string[]) {
  for (const userId of new Set(userIds)) {
    try {
      revalidateTag(`dashboard-${userId}`, { expire: 0 })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (!message.includes("static generation store missing")) throw error
    }
  }
}
