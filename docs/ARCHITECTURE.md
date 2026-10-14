# Outpost architecture (proposal)

## Goals

- One server a company can self-host with a single `docker compose up`, and scale on Kubernetes later.
- Every feature free, including SSO, SCIM and audit logs.
- Full compatibility with existing API collections (Collection Format v2.1) and their scripts.
- One language end to end: TypeScript.

## Overview

```
                ┌──────────────────────────────┐
  Desktop app ──┤   Outpost web (Next.js)      │
  (Electron)    │   UI + admin + REST API      │──┐
                │   + Better Auth              │  ├── PostgreSQL via Prisma
  Browser ──────┤   + live updates (SSE)       │  │   (data, LISTEN/NOTIFY)
                └──────────────────────────────┘  │
  CLI ───── API key                               ├── Redis (job queues, later)
                        ┌──────────────┐          │
                        │   Runners    │──────────┴── S3-compatible storage
                        │ (N workers)  │  monitors, scheduled runs,  (later)
                        └──────────────┘  perf tests, hosted mocks
```

## Components

### 1. Web app and API (`apps/web`, Next.js)

- Next.js (App Router) serves the whole interface: the API client, collections, workspaces, and the admin console (users, teams, organizations, identity providers, audit logs, settings).
- REST API in Next.js route handlers, validated with Zod, OpenAPI generated from the schemas. The UI uses only this public API, so everything is scriptable.
- Server components for admin pages, client components for the request editor.
- Runs on the default Node.js runtime, self-hosted with `next start` in a container.

### 2. Database (`packages/db`, Prisma)

- PostgreSQL accessed only through Prisma. The schema lives in `packages/db/prisma/schema/` (`auth.prisma` for Better Auth models, `outpost.prisma` for the rest) and is shared by the web app and the runners.
- Migrations with `prisma migrate`, run automatically at container start.
- Collection documents stored as JSONB, with a history table for version recovery.

### 3. Authentication, users, teams and organizations (Better Auth)

Better Auth runs inside the Next.js app with its Prisma adapter, so users, sessions, organizations and teams live in the same database.

| Need | Better Auth feature |
|---|---|
| Email and password, can be disabled | core |
| Google login, with allowed domains | Google social provider |
| SSO via OIDC (Keycloak, Entra ID, Okta, Authentik, Zitadel...) | `@better-auth/sso` |
| SSO via SAML 2.0 | `@better-auth/sso` |
| Enforced SSO per verified email domain, JIT provisioning | `@better-auth/sso` domain verification |
| SCIM 2.0 provisioning | `@better-auth/scim` |
| Organizations, teams, members, invitations | `organization` plugin with teams enabled |
| Roles and permissions | `organization` plugin access control (custom roles and statements) |
| API tokens for CLI and automation | `api-key` plugin |
| Admin console (ban, impersonate, list users) | `admin` plugin |
| Two-factor auth | `two-factor` plugin |

- Sessions in HTTP-only cookies for the web app; API keys or bearer tokens for desktop and CLI.
- Every security-relevant action writes to an append-only audit log table, exportable as JSON or CSV.

### Authorization

- Model: Organization > Teams > Workspaces > Collections > Folders > Requests.
- Org and team roles come from Better Auth's organization plugin. Workspace and element roles (admin, editor, runner, viewer) are Outpost tables in Prisma, assignable to users or teams.
- One policy function checks every API call, so permission rules live in one place.

### Realtime collaboration

- Each workspace has a server-sent events stream (`GET /api/v1/workspaces/:id/events`) served by the Next.js app.
- Changes are broadcast through PostgreSQL `LISTEN/NOTIFY`, so several app instances behind a load balancer stay in sync without Redis or a separate service.
- Saves use optimistic concurrency: every collection has a version, a save based on an old version is rejected (409). An editor with no local changes reloads automatically when someone else saves; with local changes it shows who saved and offers to load the new version.
- Serve Outpost over HTTP/2 (any TLS reverse proxy does it) so open event streams do not hit the browser's 6-connections-per-host limit of HTTP/1.1.

### Execution engine (`packages/engine`)

- Built on the open source Apache 2.0 collection runtime and scripting sandbox available on npm. We wrap it instead of rewriting it. This gives exact compatibility with existing collections and test scripts.
- Same package used in three places: the desktop app, the CLI, and the runners.

### Clients

- Web app: the Next.js app above.
- Desktop app (`apps/desktop`): Electron shell around the Next.js web app. Electron rather than Tauri because the engine is a Node library. The desktop app executes requests locally, so it can reach `localhost` and internal networks and has no CORS limits.
- Browser agent: in the web app, requests to private networks go through a small local agent (same engine) or, if the admin allows it, through the server.
- CLI (`apps/cli`): runs collections in CI, logs in with an API token, can push results to the server.

### Runners (`apps/runner`)

- Stateless workers pulling jobs from a queue (BullMQ on Redis).
- Used for monitors, scheduled runs, distributed performance tests and hosted mock servers.
- Deployable anywhere, including inside a private network, which gives "private runners" for free.

### Storage

- PostgreSQL through Prisma for all structured data, including users, orgs and collection documents.
- Redis for job queues once runners land. Live updates use PostgreSQL `LISTEN/NOTIFY`.
- S3-compatible storage (MinIO in the default compose file) for uploaded files, run reports and exports.
- Secrets: encrypted at rest with a server key, with optional external vaults (HashiCorp Vault, cloud secret managers) later. A local vault on the desktop keeps personal secrets on the device.

## Repository layout

```
apps/
  web/       Next.js: UI, admin console, REST API, Better Auth
  desktop/   Electron shell
  cli/       command-line runner
  runner/    background workers
packages/
  engine/    execution wrapper around the collection runtime
  db/        Prisma schema, migrations and client
  schema/    shared types and Zod schemas
  ui/        shared React components
deploy/
  docker-compose.yml
  helm/
docs/
```

Monorepo with pnpm workspaces and Turborepo.

## Deployment

- `docker compose up` starts PostgreSQL, applies migrations and starts the web app. Runners, Redis and MinIO come later.
- Configuration via environment variables and an optional YAML file (IdPs, allowed domains, retention).
- Helm chart for Kubernetes, horizontal scaling of the web app and runners.

## First milestone (MVP)

1. Next.js app with Prisma and PostgreSQL: workspaces, collections, environments.
2. Better Auth: Google login, OIDC, SAML, enforced SSO, JIT provisioning, organizations and teams.
3. Roles and audit log, admin console.
4. Request editor: send HTTP requests, edit collections, run scripts, import existing collections.
5. Realtime sync between two users.
6. CLI runner.
7. Docker compose deployment.
