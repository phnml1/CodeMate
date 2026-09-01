import { spawnSync } from "node:child_process"
import path from "node:path"

export default function globalTeardown() {
  const tsxCli = path.resolve("node_modules/tsx/dist/cli.mjs")
  const cleanupScript = path.resolve("e2e/scripts/cleanup.ts")
  const result = spawnSync(process.execPath, [tsxCli, cleanupScript], {
    env: process.env,
    stdio: "inherit",
  })

  if (result.status !== 0) {
    throw new Error("Failed to clean up E2E data.")
  }
}
