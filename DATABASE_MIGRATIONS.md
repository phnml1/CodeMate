# Database migration recovery

The original `0_init` migration was empty. It now contains the SQL generated
from `prisma/schema.baseline.prisma`, which represents the schema before the
subsequent migrations. This lets a new PostgreSQL database replay the history
in order. `Review.failureReason` is also represented in `schema.prisma` because
`20260422000000_add_review_failure_reason` already adds that column.
The SQL defaults on `UserRepository` and collaboration `updatedAt` fields are
also reflected in `schema.prisma`.

## Before any deployment

1. Identify the target database from its host and database name. Never use a
   production URL for a fresh-database rehearsal.
2. Take a restorable backup of the existing database and test restoration in
   an isolated environment. Record the backup location and restoration time.
3. Read `_prisma_migrations` and inspect the live schema before applying any
   migration. In particular, check whether `0_init` is recorded as applied,
   whether any migration failed, and whether the tables from the baseline
   already exist. `prisma migrate status` is read-only, but it still connects
   to the configured database; verify the URL first.
4. Compare the restored database with `schema.prisma` and the migration history.
   Resolve any drift as a separate reviewed migration. Do not reset or `db push`
   an existing database to make this history pass.

## Fresh database rehearsal

Set `DIRECT_DATABASE_URL` and `DATABASE_URL` to an **empty, disposable** local
PostgreSQL database. Then run:

```sh
npx prisma migrate deploy
npx prisma migrate status
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code
```

The diff command exits with 0 when the Prisma-representable schema matches.
The partial unique index `review_active_unique` is raw SQL and must also be
checked directly in PostgreSQL. Exercise the application against this database
after the migration replay.
The `Migration Replay` workflow performs this check automatically on a fresh
PostgreSQL service when the schema or migrations change.

## Existing database

If `0_init` was already applied when it was empty, Prisma will report that its
file checksum changed. The edited migration must **not** be run against that
database: its baseline objects already exist. Do not edit `_prisma_migrations`
to silence the warning. Review the live schema and applied migration list,
record the checksum warning as a known history repair, and rehearse the exact
deployment against a restored copy before production deployment.

If an existing database has baseline tables but no `0_init` migration record,
follow Prisma's baselining procedure only after confirming those tables match
the baseline. `prisma migrate resolve --applied 0_init` writes migration
metadata and must be performed only in the approved deployment process.

Never run `prisma db push --force-reset`, `prisma migrate reset`, or an E2E
prepare script against a database containing user data.
