export const PARTICIPANT_COLORS = [
  { solid: "#1d4ed8", fill: "rgba(37, 99, 235, 0.28)", textFill: "rgba(37, 99, 235, 0.42)" },
  { solid: "#9a3412", fill: "rgba(234, 88, 12, 0.28)", textFill: "rgba(234, 88, 12, 0.42)" },
  { solid: "#86198f", fill: "rgba(192, 38, 211, 0.28)", textFill: "rgba(192, 38, 211, 0.42)" },
  { solid: "#0f766e", fill: "rgba(13, 148, 136, 0.28)", textFill: "rgba(13, 148, 136, 0.42)" },
] as const

export type ParticipantColor = (typeof PARTICIPANT_COLORS)[number]

function colorStart(userId: string) {
  let hash = 0
  for (let index = 0; index < userId.length; index++) {
    hash = (hash * 31 + userId.charCodeAt(index)) >>> 0
  }
  return hash % PARTICIPANT_COLORS.length
}

export function assignParticipantColors(userIds: string[]): Record<string, ParticipantColor> {
  const colors: Record<string, ParticipantColor> = {}
  const used = new Set<number>()

  for (const userId of [...new Set(userIds)].sort()) {
    let index = colorStart(userId)
    if (used.size < PARTICIPANT_COLORS.length) {
      while (used.has(index)) index = (index + 1) % PARTICIPANT_COLORS.length
      used.add(index)
    }
    colors[userId] = PARTICIPANT_COLORS[index]
  }

  return colors
}
