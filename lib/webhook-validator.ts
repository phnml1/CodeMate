export async function verifyWebhookSignature(
  payload: string,
  signature: string
): Promise<boolean> {
  const secret = process.env.GITHUB_WEBHOOK_SECRET

  if (!secret) return false
  if (!signature.startsWith("sha256=")) return false

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )

  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  )

  const expected =
    "sha256=" +
    Array.from(new Uint8Array(signed))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")

  return expected === signature
}
