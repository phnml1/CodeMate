import { getCollaborationPresenceScope } from "@/lib/collaboration/presence-scope"
import { createCollaborationRoomSocketToken, verifyCollaborationRoomSocketToken } from "@/lib/collaboration/socket-token"

describe("collaboration presence environment", () => {
  const env = process.env
  beforeEach(() => { process.env = { NODE_ENV: "test" } })
  afterEach(() => { process.env = env })

  it("uses local for localhost in both Next.js production builds and standalone Socket", () => {
    process.env.NEXTJS_URL = "http://localhost:3000"
    process.env = { ...process.env, NODE_ENV: "production" }
    expect(getCollaborationPresenceScope()).toBe("local")
    Reflect.deleteProperty(process.env, "NODE_ENV")
    expect(getCollaborationPresenceScope()).toBe("local")
  })

  it("defaults existing public deployments to production and allows explicit staging scopes", () => {
    process.env.NEXTJS_URL = "https://code-mate-two.vercel.app"
    expect(getCollaborationPresenceScope()).toBe("production")
    process.env.COLLABORATION_PRESENCE_SCOPE = "staging"
    expect(getCollaborationPresenceScope()).toBe("staging")
  })

  it("requires an explicit scope for previews and rejects empty or malformed scopes", () => {
    process.env.VERCEL_ENV = "preview"
    expect(getCollaborationPresenceScope).toThrow("Preview deployments require")
    process.env.COLLABORATION_PRESENCE_SCOPE = ""
    expect(getCollaborationPresenceScope).toThrow("Invalid")
    process.env.COLLABORATION_PRESENCE_SCOPE = "../production"
    expect(getCollaborationPresenceScope).toThrow("Invalid")
  })

  it("rejects a signed room token issued by another environment", () => {
    process.env.COLLABORATION_PRESENCE_SCOPE = "local"
    const { token } = createCollaborationRoomSocketToken({
      roomId: "room-1", memberId: "member-1", userId: "user-1", userName: "Alice", capacity: 8,
    }, "shared-test-secret")
    expect(verifyCollaborationRoomSocketToken(token, "shared-test-secret")).not.toBeNull()
    process.env.COLLABORATION_PRESENCE_SCOPE = "production"
    expect(verifyCollaborationRoomSocketToken(token, "shared-test-secret")).toBeNull()
  })
})
