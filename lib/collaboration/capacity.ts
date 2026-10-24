export const COLLABORATION_ROOM_DEFAULT_CAPACITY = 4
export const COLLABORATION_ROOM_MAX_CAPACITY = 4

export function getCollaborationRoomCapacity(capacity: number) {
  return Math.min(capacity, COLLABORATION_ROOM_MAX_CAPACITY)
}
