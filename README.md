# Outpost

A free, open source, self-hostable API platform for companies.

One central server you run yourself, with every feature included: team workspaces, RBAC, SSO (SAML and OIDC), Google login, SCIM, audit logs, private runners, and more. No per-seat pricing. No SSO tax.

Status: early design. See [docs/FEATURES.md](docs/FEATURES.md) for the full feature scope.

## Development

Requirements: Node.js 24+, pnpm 10, Docker.

```bash
cp .env.example .env            # then set BETTER_AUTH_SECRET and the Google credentials
docker compose -p outpost -f deploy/docker-compose.dev.yml up -d   # PostgreSQL on port 5440
pnpm install
pnpm db:migrate
pnpm dev                        # http://localhost:3000
```

Google login: create an OAuth client ID (type "Web application") in the Google Cloud console and add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI. Set `GOOGLE_ALLOWED_DOMAINS` to restrict sign-in to your company domains.

## Stack

- `apps/web`: Next.js app (UI, admin, API) with Better Auth (Google login, organizations, teams)
- `packages/db`: Prisma schema, migrations and client for PostgreSQL

## License

MIT
