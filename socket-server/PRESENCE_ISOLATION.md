# Collaboration presence environment isolation

## Root Cause

The original DB reconciliation selected every active membership older than
105 seconds, then checked only the Redis behind that Next.js environment's
Socket server. Redis heartbeats do not update the DB membership's updatedAt.
With a shared database and separate Redis stores, a healthy local member
therefore looked absent to production reconciliation and could acquire leftAt.
Browser confirmation cancellation does not send a leave request.

A disposable PostgreSQL database and Redis logical databases 14/15 reproduced
the mechanism without any browser interaction. The exact process that wrote
the previously observed shared-DB leftAt is not identifiable from the old logs;
the reproducer establishes the defect, not an audit attribution to that process.

## Changes

- Persist presenceScope on each room. Existing rooms migrate to production.
- Creation, listing and direct access are restricted to the current scope.
- Reconciliation and disconnect updates filter by the room's scope, in both
  candidate selection and conditional writes. Existing updatedAt guards remain.
- Next.js and Socket exchange x-collaboration-scope. Missing or mismatched scope
  is rejected; mismatched presence is never interpreted as an empty room.
- Signed room tokens carry the scope and cannot join a different environment.

## Configuration

Set the same COLLABORATION_PRESENCE_SCOPE on each environment's Next.js and
Socket services. Keep Redis and preferably PostgreSQL separate by environment.

| Environment | Scope |
| --- | --- |
| Local | local |
| Production | production |
| Staging | staging |
| Preview | A separate scope per preview, with its own Socket/Redis |

If unset, a localhost NEXTJS_URL (or NEXTAUTH_URL/AUTH_URL fallback) yields local;
a public URL yields production. Without a URL, NODE_ENV=production yields
production; other values yield local. Vercel previews must configure a scope
explicitly. Explicit configuration is recommended for every deployed service.

Scopes are coordination boundaries, not a replacement for internal secrets.
Do not change an existing room's scope during an active session.

## Rollout

This change requires a DB migration and coordinated Next.js/Socket deployment.
It was NOT applied to the shared/production database during local verification.

1. Stop old Socket reconciliation workers during rollout. They do not have the
   scope filter and remain capable of modifying other environments' members.
2. Run `npx prisma migrate deploy` against the intended deployment database,
   including `20261006000000_add_collaboration_presence_scope`.
3. Deploy updated Next.js and Socket together with matching scopes and secrets.
   A mixed-version pairing fails closed instead of trusting unscoped presence.
4. Restart Socket workers and re-enter test rooms; pre-upgrade room tokens must
   be renewed. Run the local, staging and production isolation checks.

Existing rooms are assigned production because historical rows have no reliable
environment owner. Create new local rooms; do not guess and reassign old rooms
that could belong to production. Migration rollback should restore code only
after sessions are drained; dropping the column would discard ownership data.

## Reproduction

Use a disposable PostgreSQL instance, bound to localhost, named
codemate_scope_test. Never point this verification at the shared Supabase DB.
Initialize it with `prisma db push --url <disposable-local-database-url>`.

```powershell
$env:PRESENCE_SCOPE_TEST_DATABASE_URL = 'postgresql://scope_test:scope_test@127.0.0.1:55433/codemate_scope_test'
$env:REDIS_URL = 'redis://127.0.0.1:6379/15'
node --import tsx --test e2e/scripts/verify-collaboration-presence-scope.test.ts
```

The test rejects non-local database/Redis URLs, uses UUID-prefixed fixture rows
and keys, and cleans up only those fixtures. It exercises real Prisma SQL,
real Redis Lua operations, and the actual Next.js reconciliation route. Redis
14/15 emulate the isolated presence stores; the small internal HTTP fixture
serves the real Redis snapshots. It does not launch two full Socket deployments
or exercise native browser-close confirmation.

Tests cover old cross-environment false leave, scoped protection of a connected
local member, and genuine last-user leave cleanup. Separate existing tests
cover two Socket replicas, multi-tab capacity and reconnect grace.
