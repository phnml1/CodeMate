import { randomBytes } from "node:crypto"
import {
  decryptGithubToken,
  encryptGithubToken,
  GitHubTokenDecryptionError,
  GitHubTokenEncryptionConfigurationError,
  inspectGithubTokenForMigration,
  isEncryptedGithubToken,
} from "@/lib/github-token-crypto"

const originalEnvironment = { ...process.env }

function key() {
  return randomBytes(32).toString("base64")
}

afterEach(() => {
  process.env = { ...originalEnvironment }
})

it("encrypts and decrypts a GitHub token with AES-GCM", () => {
  process.env.GITHUB_TOKEN_ENCRYPTION_KEY = key()
  const encrypted = encryptGithubToken("gho_secret_token")

  expect(isEncryptedGithubToken(encrypted)).toBe(true)
  expect(encrypted).not.toContain("gho_secret_token")
  expect(decryptGithubToken(encrypted)).toEqual({
    token: "gho_secret_token",
    needsMigration: false,
  })
})

it("rejects a tampered encrypted token", () => {
  process.env.GITHUB_TOKEN_ENCRYPTION_KEY = key()
  const encrypted = encryptGithubToken("gho_secret_token")
  const parts = encrypted.split(":")
  parts[2] = `${parts[2][0] === "A" ? "B" : "A"}${parts[2].slice(1)}`
  const tampered = parts.join(":")

  expect(() => decryptGithubToken(tampered)).toThrow(GitHubTokenDecryptionError)
})

it("decrypts with the previous key and requests rotation", () => {
  const previousKey = key()
  process.env.GITHUB_TOKEN_ENCRYPTION_KEY = previousKey
  const encrypted = encryptGithubToken("gho_rotating_token")

  process.env.GITHUB_TOKEN_ENCRYPTION_KEY = key()
  process.env.GITHUB_TOKEN_ENCRYPTION_KEY_PREVIOUS = previousKey

  expect(decryptGithubToken(encrypted)).toEqual({
    token: "gho_rotating_token",
    needsMigration: true,
  })
  expect(inspectGithubTokenForMigration(encrypted, false)).toEqual({
    token: "gho_rotating_token",
    needsMigration: true,
  })

  const rotated = encryptGithubToken("gho_rotating_token")
  expect(inspectGithubTokenForMigration(rotated, false).needsMigration).toBe(false)
  delete process.env.GITHUB_TOKEN_ENCRYPTION_KEY_PREVIOUS
  expect(decryptGithubToken(rotated).token).toBe("gho_rotating_token")
  expect(() => decryptGithubToken(encrypted)).toThrow(GitHubTokenDecryptionError)
})

it("clears a legacy account token copy even when the user token has the current key", () => {
  process.env.GITHUB_TOKEN_ENCRYPTION_KEY = key()
  const encrypted = encryptGithubToken("gho_token")

  expect(inspectGithubTokenForMigration(encrypted, true)).toEqual({
    token: "gho_token",
    needsMigration: true,
  })
})

it("marks a legacy plaintext token for migration when a key is configured", () => {
  process.env.GITHUB_TOKEN_ENCRYPTION_KEY = key()

  expect(decryptGithubToken("legacy-token")).toEqual({
    token: "legacy-token",
    needsMigration: true,
  })
})

it("fails closed for a plaintext token in production without a key", () => {
  delete process.env.GITHUB_TOKEN_ENCRYPTION_KEY
  delete process.env.GITHUB_TOKEN_ENCRYPTION_KEY_PREVIOUS
  ;(process.env as Record<string, string | undefined>).NODE_ENV = "production"

  expect(() => decryptGithubToken("legacy-token")).toThrow(
    GitHubTokenEncryptionConfigurationError
  )
})
