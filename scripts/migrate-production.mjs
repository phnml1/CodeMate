import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

if (process.env.VERCEL_ENV === "production") {
  if (!process.env.DIRECT_DATABASE_URL && !process.env.DATABASE_URL) {
    console.error("Production database URL is missing; Prisma migrations were not applied.")
    process.exit(1)
  }

  console.log("Applying pending Prisma migrations before the production build...")
  const prismaCli = fileURLToPath(new URL("../node_modules/prisma/build/index.js", import.meta.url))
  const result = spawnSync(process.execPath, [prismaCli, "migrate", "deploy"], {
    stdio: "inherit",
  })

  if (result.error) console.error("Could not start Prisma migrations:", result.error)
  process.exit(result.status ?? 1)
}
