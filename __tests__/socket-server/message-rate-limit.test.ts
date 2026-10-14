import Redis from "ioredis"
import { MemoryMessageRateLimiter, MESSAGE_RATE_LIMIT_MAX, MESSAGE_RATE_LIMIT_WINDOW_MS, RedisMessageRateLimiter } from "@/socket-server/message-rate-limit"

describe("collaboration message rate limiting", () => {
  it("limits a user across rooms without charging a duplicate client message ID", () => {
    const limiter = new MemoryMessageRateLimiter()
    for (let index = 0; index < MESSAGE_RATE_LIMIT_MAX; index++) {
      expect(limiter.check("test", index % 2 ? "room-b" : "room-a", "alice", `message-${index}`).allowed).toBe(true)
    }
    expect(limiter.check("test", "room-a", "alice", "message-0").allowed).toBe(true)
    expect(limiter.check("test", "room-a", "alice", "message-new").allowed).toBe(false)
    expect(limiter.check("test", "room-a", "bob", "message-new").allowed).toBe(true)
  })

  it("allows sending again after the sliding window expires", () => {
    const now = jest.spyOn(Date, "now").mockReturnValue(1_000_000)
    try {
      const limiter = new MemoryMessageRateLimiter()
      for (let index = 0; index < MESSAGE_RATE_LIMIT_MAX; index++) {
        expect(limiter.check("test", "room-a", "alice", `message-${index}`).allowed).toBe(true)
      }
      now.mockReturnValue(1_000_000 + MESSAGE_RATE_LIMIT_WINDOW_MS)
      expect(limiter.check("test", "room-a", "alice", "message-new").allowed).toBe(true)
    } finally {
      now.mockRestore()
    }
  })
})

const describeWithRedis = process.env.REDIS_URL ? describe : describe.skip

describeWithRedis("Redis collaboration message rate limiting", () => {
  let first: Redis
  let second: Redis

  beforeAll(async () => {
    first = new Redis(process.env.REDIS_URL!, { lazyConnect: true, maxRetriesPerRequest: 1 })
    second = new Redis(process.env.REDIS_URL!, { lazyConnect: true, maxRetriesPerRequest: 1 })
    await Promise.all([first.connect(), second.connect()])
  })

  afterAll(() => {
    first?.disconnect()
    second?.disconnect()
  })

  it("enforces the same atomic limit across two Socket replicas", async () => {
    const scope = `rate-test-${Date.now()}`
    const alice = new RedisMessageRateLimiter(first)
    const otherReplica = new RedisMessageRateLimiter(second)
    const attempts = await Promise.all(Array.from({ length: MESSAGE_RATE_LIMIT_MAX + 1 }, (_, index) =>
      (index % 2 ? alice : otherReplica).check(scope, "room-a", "alice", `message-${index}`)
    ))

    expect(attempts.filter((result) => result.allowed)).toHaveLength(MESSAGE_RATE_LIMIT_MAX)
    expect(attempts.filter((result) => !result.allowed)).toHaveLength(1)
    expect((await otherReplica.check(scope, "room-a", "alice", "message-0")).allowed).toBe(true)
    expect((await otherReplica.check(scope, "room-a", "bob", "message-11")).allowed).toBe(true)
  })
})
