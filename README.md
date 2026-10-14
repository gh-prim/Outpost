# Outpost

A free, open source, self-hostable API platform for companies.

One central server you run yourself, with every feature included: team workspaces, RBAC, SSO (SAML and OIDC), Google login, SCIM, audit logs, private runners, and more. No per-seat pricing. No SSO tax.

Status: early design. See [docs/FEATURES.md](docs/FEATURES.md) for the full feature scope.

## Deploy with Docker

```bash
cp .env.example .env    # set BETTER_AUTH_SECRET, BETTER_AUTH_URL, POSTGRES_PASSWORD and your sign-in providers
docker compose -f deploy/docker-compose.yml --env-file .env up -d --build
```

This starts PostgreSQL, applies the database migrations, starts the worker that runs monitors, then serves Outpost on port 3000 (`OUTPOST_PORT` to change it). Put a TLS reverse proxy with HTTP/2 in front of it (live updates keep one connection open per tab) and set `BETTER_AUTH_URL` to the public URL.

## Development

Requirements: Node.js 24+, pnpm 10, Docker.

```bash
cp .env.example .env            # then set BETTER_AUTH_SECRET and the Google credentials
docker compose -p outpost -f deploy/docker-compose.dev.yml up -d   # PostgreSQL on port 5440
pnpm install
pnpm db:migrate
pnpm dev                        # http://localhost:3000
pnpm --filter @outpost/runner start   # optional: the worker that runs monitors
```

Google login: create an OAuth client ID (type "Web application") in the Google Cloud console and add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI. Set `GOOGLE_ALLOWED_DOMAINS` to restrict sign-in to your company domains.

## CLI

Run collections from a terminal or CI. Requests leave from the machine running the CLI, so it reaches internal networks.

```bash
pnpm --filter @outpost/cli build
node apps/cli/dist/outpost.js login --server https://outpost.example.com --key opk_...   # key from Settings > API keys
outpost run <collection id> -e <environment id> -d data.csv --reporter-json report.json
```

In CI, set `OUTPOST_SERVER` and `OUTPOST_API_KEY` instead of logging in. The exit code is 1 when a request fails or a test does not pass.

## Desktop app

The desktop app is the Outpost web app in its own window, with one difference: requests run on your computer, so they reach `localhost` and your company network. On first launch it asks for your Outpost server address.

```bash
pnpm --filter @outpost/desktop start   # run it from source
pnpm --filter @outpost/desktop dist    # build installers for your OS (macOS, Windows, Linux)
```

## Stack

- `apps/web`: Next.js app (UI, admin, API) with Better Auth (Google login, organizations, teams)
- `packages/db`: Prisma schema, migrations and client for PostgreSQL
- `packages/engine`: runs collections (Collection Format v2.1, `pm.*` scripts and tests) on the open source collection runtime, with outbound blocking of cloud metadata endpoints
- `packages/ui`: design system
- `apps/cli`: `outpost` command-line runner
- `apps/desktop`: Electron desktop app with local request execution
- `apps/runner`: background worker for monitors (scheduled collection runs with Slack/Teams/webhook alerts)

## License

MIT
