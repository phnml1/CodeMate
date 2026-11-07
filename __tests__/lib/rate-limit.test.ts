import {
  checkRateLimit,
  enforceUserRateLimit,
  RATE_LIMIT_POLICIES,
  resetRateLimitStateForTests,
} from "@/lib/rate-limit"

const originalEnvironment = { ...process.env }

beforeEach(() => {
  process.env = {
    ...originalEnvironment,
    NODE_ENV: "test",
    RATE_LIMIT_TEST_MODE: "1",
  }
  delete process.env.REDIS_URL
  resetRateLimitStateForTests()
})

afterEach(() => {
  process.env = { ...originalEnvironment }
})

it("allows requests inside the fixed window and rejects the excess request", async () => {
  const policy = { scope: "test", limit: 2, windowMs: 60_000 }

  await expect(checkRateLimit(policy, "user-1")).resolves.toMatchObject({
    allowed: true,
    remaining: 1,
  })
  await expect(checkRateLimit(policy, "user-1")).resolves.toMatchObject({
    allowed: true,
    remaining: 0,
  })
  await expect(checkRateLimit(policy, "user-1")).resolves.toMatchObject({
    allowed: false,
    remaining: 0,
  })
})

it("isolates counters by user and scope", async () => {
  const policy = { scope: "test", limit: 1, windowMs: 60_000 }

  await checkRateLimit(policy, "user-1")

  await expect(checkRateLimit(policy, "user-2")).resolves.toMatchObject({ allowed: true })
  await expect(
    checkRateLimit({ ...policy, scope: "another-test" }, "user-1")
  ).resolves.toMatchObject({ allowed: true })
})

it("returns 429 with retry headers when the limit is exceeded", async () => {
  const policy = { scope: "response-test", limit: 1, windowMs: 60_000 }
  await enforceUserRateLimit(policy, "user-1")

  const response = await enforceUserRateLimit(policy, "user-1")

  expect(response?.status).toBe(429)
  expect(response?.headers.get("Retry-After")).toBeTruthy()
  expect(response?.headers.get("X-RateLimit-Limit")).toBe("1")
})

it("fails closed when production Redis is not configured", async () => {
  ;(process.env as Record<string, string | undefined>).NODE_ENV = "production"
  delete process.env.REDIS_URL

  const response = await enforceUserRateLimit(
    RATE_LIMIT_POLICIES.repositoryConnect,
    "user-1"
  )

  expect(response?.status).toBe(503)
  expect(response?.headers.get("Retry-After")).toBe("5")
})

it("keeps the documented policies positive and bounded", () => {
  for (const policy of Object.values(RATE_LIMIT_POLICIES)) {
    expect(policy.limit).toBeGreaterThan(0)
    expect(policy.windowMs).toBeGreaterThan(0)
    expect(policy.windowMs).toBeLessThanOrEqual(10 * 60_000)
  }
})
