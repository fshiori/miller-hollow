# Miller Hollow V1 Secret Handling

Date: 2026-05-14

## Policy

This is an open source repository. Real secrets must never be committed.

Commit only examples and placeholders:

- `.env.example`
- `.dev.vars.example`

Keep real local values in ignored files:

- `.env.local`
- `.dev.vars`

## Cloudflare Deploy Secrets

Wrangler uses Cloudflare credentials from the shell environment.

For local deploy testing, create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

Fill in local values:

```bash
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_ACCOUNT_ID=...
```

Load them only in your shell when needed:

```bash
set -a
source .env.local
set +a
npm run deploy:dry-run
```

`npm run deploy:dry-run` currently does not require publishing, but keeping the same local secret-loading path makes deploy testing repeatable.

## Worker Variables

Worker runtime variables that are safe to share can live in `wrangler.toml`.

Local overrides can go in `.dev.vars`, copied from `.dev.vars.example`:

```bash
cp .dev.vars.example .dev.vars
```

Do not put Cloudflare API tokens in `.dev.vars`; those are CLI credentials, not Worker runtime configuration.

## Verification

Before commit, run:

```bash
npm run secrets:check
git status --short --ignored
```

Expected:

- `npm run secrets:check` reports no obvious secrets in tracked files.
- `.env.local` and `.dev.vars` appear only as ignored files if present.
