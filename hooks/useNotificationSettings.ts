"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { NotificationSetting } from "@/types/notification"

const DEFAULT_SETTINGS: NotificationSetting = {
  mentionEnabled: true,
  newReviewEnabled: true,
  prMergedEnabled: true,
  commentReplyEnabled: true,
}

async function fetchSettings(): Promise<NotificationSetting> {
  const res = await fetch("/api/notifications/settings")
  if (!res.ok) return DEFAULT_SETTINGS
  const data = await res.json()
  return data.settings ?? DEFAULT_SETTINGS
}

async function updateSettings(settings: NotificationSetting): Promise<NotificationSetting> {
  const res = await fetch("/api/notifications/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  })
  const data = await res.json()
  return data.settings
}

export function useNotificationSettings() {
  const queryClient = useQueryClient()

  const { data: settings = DEFAULT_SETTINGS, isLoading } = useQuery({
    queryKey: ["notification-settings"],
    queryFn: fetchSettings,
  })

  const { mutate: saveSettings } = useMutation({
    mutationFn: updateSettings,
    onMutate: async (newSettings) => {
      await queryClient.cancelQueries({ queryKey: ["notification-settings"] })
      queryClient.setQueryData(["notification-settings"], newSettings)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-settings"] })
    },
  })

  return { settings, isLoading, saveSettings }
}
