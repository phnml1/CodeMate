import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Prefer a direct connection for Prisma schema/migration commands.
    // Pooler URLs can work for runtime queries but often hang or fail for DDL.
    url: process.env["DIRECT_DATABASE_URL"] ?? process.env["DATABASE_URL"]!,
  },
});
