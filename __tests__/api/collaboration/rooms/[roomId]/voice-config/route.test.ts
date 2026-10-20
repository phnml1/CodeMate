import { createHmac } from "crypto"
import { GET } from "@/app/api/collaboration/rooms/[roomId]/voice-config/route"
import { auth } from "@/lib/auth"
import { findAccessibleCollaborationRoom } from "@/lib/collaboration/rooms"
import { prisma } from "@/lib/prisma"

jest.mock("@/lib/auth", () => ({ auth: jest.fn() }))
jest.mock("@/lib/collaboration/rooms", () => ({ findAccessibleCollaborationRoom: jest.fn() }))
jest.mock("@/lib/prisma", () => ({ prisma: { collaborationRoomMember: { findUnique: jest.fn() } } }))

const mockedAuth = auth as jest.Mock
const mockedRoom = findAccessibleCollaborationRoom as jest.Mock
const mockedMember = prisma.collaborationRoomMember.findUnique as jest.Mock
const context = { params: Promise.resolve({ roomId: "room-1" }) }
const request = new Request("http://localhost/api/collaboration/rooms/room-1/voice-config")
const original = {
  enabled: process.env.COLLABORATION_VOICE_ENABLED,
  turnUrls: process.env.COLLABORATION_TURN_URLS,
  turnSecret: process.env.COLLABORATION_TURN_SECRET,
  stunUrls: process.env.COLLABORATION_VOICE_STUN_URLS,
}

beforeEach(() => {
  process.env.COLLABORATION_VOICE_ENABLED = "1"
  delete process.env.COLLABORATION_TURN_URLS
  delete process.env.COLLABORATION_TURN_SECRET
  delete process.env.COLLABORATION_VOICE_STUN_URLS
  mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
  mockedRoom.mockResolvedValue({ id: "room-1", status: "ACTIVE" })
  mockedMember.mockResolvedValue({ leftAt: null })
})

afterEach(() => {
  for (const [name, value] of Object.entries({
    COLLABORATION_VOICE_ENABLED: original.enabled,
    COLLABORATION_TURN_URLS: original.turnUrls,
    COLLABORATION_TURN_SECRET: original.turnSecret,
    COLLABORATION_VOICE_STUN_URLS: original.stunUrls,
  })) {
    if (value === undefined) delete process.env[name]
    else process.env[name] = value
  }
  jest.clearAllMocks()
})

it("hides voice when the feature flag is off", async () => {
  process.env.COLLABORATION_VOICE_ENABLED = "0"
  expect((await GET(request, context)).status).toBe(404)
  expect(mockedAuth).not.toHaveBeenCalled()
})

it("requires authentication and active room membership", async () => {
  mockedAuth.mockResolvedValueOnce(null)
  expect((await GET(request, context)).status).toBe(401)
  mockedMember.mockResolvedValueOnce({ leftAt: new Date() })
  expect((await GET(request, context)).status).toBe(403)
  mockedRoom.mockResolvedValueOnce({ id: "room-1", status: "ENDED" })
  expect((await GET(request, context)).status).toBe(409)
})

it("issues short-lived coturn credentials without exposing the secret", async () => {
  process.env.COLLABORATION_TURN_URLS = "turn:turn.example.com:3478"
  process.env.COLLABORATION_TURN_SECRET = "private-shared-secret"
  const response = await GET(request, context)
  const body = await response.json()
  expect(response.status).toBe(200)
  expect(response.headers.get("Cache-Control")).toBe("no-store")
  const turn = body.iceServers[1]
  expect(turn.urls).toEqual(["turn:turn.example.com:3478"])
  expect(turn.username).toMatch(/^\d+:user-1$/)
  expect(turn.credential).toBe(createHmac("sha1", process.env.COLLABORATION_TURN_SECRET).update(turn.username).digest("base64"))
  expect(JSON.stringify(body)).not.toContain("private-shared-secret")
})

it("fails closed when TURN URLs are set without the shared secret", async () => {
  process.env.COLLABORATION_TURN_URLS = "turn:turn.example.com:3478"
  expect((await GET(request, context)).status).toBe(503)
})
