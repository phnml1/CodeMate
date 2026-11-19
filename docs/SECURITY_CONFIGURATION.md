# Production security configuration

## GitHub OAuth token encryption

Set `GITHUB_TOKEN_ENCRYPTION_KEY` in every Next.js production and preview
environment that can read the same database. The value must be a base64-encoded
32-byte random key. Generate it locally and copy it directly into the secret
manager; never commit or print a production key in logs.

```sh
node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64'))"
```

New GitHub OAuth tokens are encrypted with AES-256-GCM before being stored in
`User.githubToken`. The Auth.js `Account.access_token` and `refresh_token`
copies are cleared after the encrypted token is stored. Existing plaintext
tokens are encrypted on their next authenticated GitHub operation.

Before public launch, take a restorable database backup, verify the target
database, then inspect the migration without writes:

```sh
npm run migrate:github-tokens
```

Run the write mode only after reviewing the dry-run counts:

```sh
npm run migrate:github-tokens -- --apply
```

The script reports counts only and never prints tokens. Do not run it against a
production database until backup restoration has been tested.

### Key rotation

1. Keep the current key in `GITHUB_TOKEN_ENCRYPTION_KEY_PREVIOUS`.
2. Put a new 32-byte key in `GITHUB_TOKEN_ENCRYPTION_KEY`.
3. Run the migration dry-run and apply modes.
4. Confirm the dry-run reports no pending tokens.
5. Remove `GITHUB_TOKEN_ENCRYPTION_KEY_PREVIOUS`.

If neither the current nor previous key can decrypt a stored token, the user
must reconnect GitHub. Losing all configured keys makes encrypted tokens
unrecoverable.

## API request limiting

Authenticated mutation limits use `REDIS_URL` and fail closed with HTTP 503 if
Redis is missing or unavailable in production. The Vercel application must be
able to reach the configured Redis endpoint. The Socket service may use the
same Redis deployment, but production and preview must keep isolated keys or
separate Redis instances.

Rate-limit keys contain a SHA-256 hash of the user ID, not the raw user ID.
Rejected requests return HTTP 429 with `Retry-After` and rate-limit headers.

After deployment, verify:

1. A normal repository connect, sync, AI review, GitHub publication and room
   join succeeds.
2. Repeated requests exceed the documented window and return 429.
3. Stopping Redis makes protected mutations return 503 instead of bypassing
   the limit.
4. Redis keys expire after their fixed window.

## Legal pages

`/privacy` and `/terms` are public for both signed-in and signed-out users.
Review their service-provider list, retention language and contact route before
launch whenever infrastructure or data handling changes.
