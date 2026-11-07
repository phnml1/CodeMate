import { randomBytes } from "node:crypto"
import {
  decryptGithubToken,
  encryptGithubToken,
  GitHubTokenDecryptionError,
  GitHubTokenEncryptionConfigurationError,
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
  const replacement = encrypted.endsWith("A") ? "B" : "A"
  const tampered = `${encrypted.slice(0, -1)}${replacement}`

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
