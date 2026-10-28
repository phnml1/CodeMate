import { assignParticipantColors } from "@/lib/collaboration/participant-colors"

describe("review room participant colors", () => {
  it("assigns four distinct colors independent of presence order", () => {
    const users = ["user-4", "user-2", "user-1", "user-3"]
    const colors = assignParticipantColors(users)

    expect(new Set(Object.values(colors).map((color) => color.solid)).size).toBe(4)
    expect(assignParticipantColors([...users].reverse())).toEqual(colors)
    expect(assignParticipantColors([...users, "user-2"])).toEqual(colors)
  })
})
