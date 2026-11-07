import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

const ENCRYPTED_TOKEN_PREFIX = "codemate-github-token-v1"
const KEY_BYTES = 32
const IV_BYTES = 12

export class GitHubTokenEncryptionConfigurationError extends Error {
  constructor(message = "GITHUB_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key") {
    super(message)
    this.name = "GitHubTokenEncryptionConfigurationError"
  }
}

export class GitHubTokenDecryptionError extends Error {
  constructor() {
    super("Stored GitHub token could not be decrypted")
    this.name = "GitHubTokenDecryptionError"
  }
}

function parseKey(value: string | undefined): Buffer | null {
  if (!value) return null

  const key = Buffer.from(value, "base64")
  if (key.length !== KEY_BYTES) {
    throw new GitHubTokenEncryptionConfigurationError()
  }

  return key
}

function currentKey(): Buffer | null {
  return parseKey(process.env.GITHUB_TOKEN_ENCRYPTION_KEY)
}

function decryptionKeys(): Buffer[] {
  const keys = [
    currentKey(),
    parseKey(process.env.GITHUB_TOKEN_ENCRYPTION_KEY_PREVIOUS),
  ].filter((key): key is Buffer => key !== null)

  return keys.filter(
    (key, index) => keys.findIndex((candidate) => candidate.equals(key)) === index
  )
}

export function isEncryptedGithubToken(value: string): boolean {
  return value.startsWith(`${ENCRYPTED_TOKEN_PREFIX}:`)
}

export function encryptGithubToken(token: string): string {
  const key = currentKey()
  if (!key) throw new GitHubTokenEncryptionConfigurationError()

  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [
    ENCRYPTED_TOKEN_PREFIX,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":")
}

export function decryptGithubToken(storedValue: string): {
  token: string
  needsMigration: boolean
} {
  if (!isEncryptedGithubToken(storedValue)) {
    const hasKey = currentKey() !== null
    if (!hasKey && process.env.NODE_ENV === "production") {
      throw new GitHubTokenEncryptionConfigurationError()
    }

    return { token: storedValue, needsMigration: hasKey }
  }

  const parts = storedValue.split(":")
  if (parts.length !== 4) throw new GitHubTokenDecryptionError()

  const iv = Buffer.from(parts[1], "base64url")
  const authTag = Buffer.from(parts[2], "base64url")
  const encrypted = Buffer.from(parts[3], "base64url")
  const keys = decryptionKeys()
  if (keys.length === 0) throw new GitHubTokenEncryptionConfigurationError()

  for (let index = 0; index < keys.length; index += 1) {
    try {
      const decipher = createDecipheriv("aes-256-gcm", keys[index], iv)
      decipher.setAuthTag(authTag)
      const token = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]).toString("utf8")

      return { token, needsMigration: index > 0 }
    } catch {
      // Try the previous key during a controlled key rotation.
    }
  }

  throw new GitHubTokenDecryptionError()
}

export function inspectGithubTokenForMigration(
  storedValue: string,
  hasAccountCopy: boolean
): { token: string; needsMigration: boolean } {
  const result = decryptGithubToken(storedValue)
  return {
    token: result.token,
    needsMigration: result.needsMigration || hasAccountCopy,
  }
}
