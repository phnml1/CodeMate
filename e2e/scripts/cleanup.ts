import { cleanE2EData, disconnectE2EDatabase } from "../fixtures/database"

async function main() {
  try {
    await cleanE2EData()
  } finally {
    await disconnectE2EDatabase()
  }
}

void main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
