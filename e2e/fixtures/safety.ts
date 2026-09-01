const ALLOWED_DATABASE_HOSTS = new Set(["localhost", "127.0.0.1", "postgres"])
const E2E_DATABASE_NAME = "codemate_e2e"

function assertSafeUrl(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`${name} must be set before running E2E tests.`)
  }

  const url = new URL(value)
  const databaseName = url.pathname.replace(/^\//, "")

  if (!ALLOWED_DATABASE_HOSTS.has(url.hostname) || databaseName !== E2E_DATABASE_NAME) {
    throw new Error(
      `${name} must target a local ${E2E_DATABASE_NAME} database. Received ${url.hostname}/${databaseName}.`
    )
  }
}

export function assertSafeE2EDatabase() {
  if (process.env.E2E_TEST_MODE !== "1") {
    throw new Error("E2E_TEST_MODE=1 is required before resetting E2E data.")
  }

  assertSafeUrl("DATABASE_URL", process.env.DATABASE_URL)

  if (process.env.DIRECT_DATABASE_URL) {
    assertSafeUrl("DIRECT_DATABASE_URL", process.env.DIRECT_DATABASE_URL)
  }
}
