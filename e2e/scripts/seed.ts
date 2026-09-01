import { randomUUID } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { disconnectE2EDatabase, seedE2EData } from "../fixtures/database"
import { AUTH_STATE_PATH } from "../fixtures/test-data"

async function main() {
  const sessionToken = randomUUID()
  const authStatePath = path.resolve(AUTH_STATE_PATH)
  const expires = Math.floor(Date.now() / 1000) + 24 * 60 * 60

  try {
    await seedE2EData(sessionToken)
    await mkdir(path.dirname(authStatePath), { recursive: true })
    await writeFile(
      authStatePath,
      JSON.stringify(
        {
          cookies: [
            {
              name: "authjs.session-token",
              value: sessionToken,
              domain: "localhost",
              path: "/",
              expires,
              httpOnly: true,
              secure: false,
              sameSite: "Lax",
            },
          ],
          origins: [],
        },
        null,
        2
      ),
      "utf8"
    )
  } finally {
    await disconnectE2EDatabase()
  }
}

void main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
