export function getCollaborationRoomDisplayName(name: string, prNumber: number): string {
  return name === `PR #${prNumber} 협업방` ? `PR #${prNumber} 리뷰방` : name
}
