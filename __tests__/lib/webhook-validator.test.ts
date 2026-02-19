import { verifyWebhookSignature } from "@/lib/webhook-validator"
import crypto from "crypto"

const SECRET = "test-secret"

function makeSignature(payload: string): string {
  const hmac = crypto.createHmac("sha256", SECRET)
  hmac.update(payload)
  return "sha256=" + hmac.digest("hex")
}

describe("verifyWebhookSignature", () => {
  beforeEach(() => {
    process.env.GITHUB_WEBHOOK_SECRET = SECRET
  })

  afterEach(() => {
    delete process.env.GITHUB_WEBHOOK_SECRET
  })

  it("유효한 서명이면 true를 반환한다", async () => {
    const payload = JSON.stringify({ action: "opened" })
    const signature = makeSignature(payload)
    const result = await verifyWebhookSignature(payload, signature)
    expect(result).toBe(true)
  })

  it("잘못된 서명이면 false를 반환한다", async () => {
    const payload = JSON.stringify({ action: "opened" })
    const result = await verifyWebhookSignature(payload, "sha256=invalidsignature")
    expect(result).toBe(false)
  })

  it("sha256= 접두사가 없으면 false를 반환한다", async () => {
    const payload = JSON.stringify({ action: "opened" })
    const result = await verifyWebhookSignature(payload, "invalidsignature")
    expect(result).toBe(false)
  })

  it("GITHUB_WEBHOOK_SECRET이 없으면 false를 반환한다", async () => {
    delete process.env.GITHUB_WEBHOOK_SECRET
    const payload = JSON.stringify({ action: "opened" })
    const signature = makeSignature(payload)
    const result = await verifyWebhookSignature(payload, signature)
    expect(result).toBe(false)
  })
})
