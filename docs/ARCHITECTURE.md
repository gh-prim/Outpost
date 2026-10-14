# Outpost architecture (proposal)

## Goals

- One server a company can self-host with a single `docker compose up`, and scale on Kubernetes later.
- Every feature free, including SSO, SCIM and audit logs.
- Full compatibility with existing API collections (Collection Format v2.1) and their scripts.
- One language end to end: TypeScript.

## Overview

```
                ┌──────────────────────────────┐
  Desktop app ──┤                              │
  (Electron)    │        Outpost server        │──── PostgreSQL (all data)
                │  API + realtime + auth + UI  │──── Redis (queues, pub/sub)
  Web app ──────┤                              │──── S3-compatible storage (files, exports)
  (browser)     └──────────────┬───────────────┘
                               │ job queue
  CLI ───── API token   ┌──────┴───────┐
                        │   Runners    │  monitors, scheduled runs,
                        │ (N workers)  │  perf tests, hosted mocks
                        └──────────────┘
```

## Components

### 1. Server (`apps/server`)

- Node.js 24, Fastify, Zod for validation, OpenAPI generated from the routes.
- REST API for everything (workspaces, collections, environments, users, admin). The UI uses only the public API, so everything is scriptable.
- Realtime collaboration over WebSocket. Each collection is a document with a version number, and clients send operations that the server orders and broadcasts. Conflicts on the same field are last write wins, with full history kept for recovery.
- Serves the web app as static files, so one container is enough.

### 2. Authentication and identity (inside the server)

| Method | Library |
|---|---|
| Email and password, optional, can be disabled | argon2 |
| Google login, with allowed domains | OIDC via `openid-client` |
| Generic OIDC (Keycloak, Entra ID, Okta, Authentik, Zitadel...) | `openid-client` |
| SAML 2.0 | `@node-saml/node-saml` |
| SCIM 2.0 provisioning | built-in endpoints (`/scim/v2/Users`, `/scim/v2/Groups`) |

- Several identity providers can be configured at once, per organization, with "enforce SSO" per verified email domain.
- Just-in-time provisioning, IdP group to Outpost role mapping.
- Sessions in HTTP-only cookies for the web app, short-lived tokens with refresh for desktop and CLI, personal API tokens for automation.
- Every security-relevant action writes to an append-only audit log table, exportable as JSON or CSV.

### 3. Authorization

- Model: Organization > Teams > Workspaces > Collections > Folders > Requests.
- Roles at org, workspace and element level (admin, editor, runner, viewer), assignable to users or groups.
- One policy function checks every API call, so permission rules live in one place.

### 4. Execution engine (`packages/engine`)

- Built on the open source Apache 2.0 collection runtime and scripting sandbox available on npm. We wrap it instead of rewriting it. This gives exact compatibility with existing collections and test scripts.
- Same package used in three places: the desktop app, the CLI, and the runners.

### 5. Clients

- Web app (`apps/web`): React, Vite, TanStack Query, Monaco editor for scripts and bodies.
- Desktop app (`apps/desktop`): Electron shell around the same web app. Electron rather than Tauri because the engine is a Node library. The desktop app executes requests locally, so it can reach `localhost` and internal networks and has no CORS limits.
- Browser agent: in the web app, requests to private networks go through a small local agent (same engine) or, if the admin allows it, through the server.
- CLI (`apps/cli`): runs collections in CI, logs in with an API token, can push results to the server.

### 6. Runners (`apps/runner`)

- Stateless workers pulling jobs from a queue (BullMQ on Redis).
- Used for monitors, scheduled runs, distributed performance tests and hosted mock servers.
- Deployable anywhere, including inside a private network, which gives "private runners" for free.

### 7. Storage

- PostgreSQL for all structured data, including collection documents (JSONB) and their history.
- Redis for queues, realtime pub/sub between server instances, and rate limiting.
- S3-compatible storage (MinIO in the default compose file) for uploaded files, run reports and exports.
- Secrets: encrypted at rest with a server key, with optional external vaults (HashiCorp Vault, cloud secret managers) later. A local vault on the desktop keeps personal secrets on the device.

## Repository layout

```
apps/
  server/    API, realtime, auth, admin
  web/       web UI
  desktop/   Electron shell
  cli/       command-line runner
  runner/    background workers
packages/
  engine/    execution wrapper around the collection runtime
  schema/    shared types and Zod schemas
  ui/        shared React components
deploy/
  docker-compose.yml
  helm/
docs/
```

Monorepo with pnpm workspaces and Turborepo.

## Deployment

- `docker compose up` starts server, runner, PostgreSQL, Redis and MinIO.
- Configuration via environment variables and an optional YAML file (IdPs, allowed domains, retention).
- Helm chart for Kubernetes, horizontal scaling of server and runners.

## First milestone (MVP)

1. Server with Postgres, organizations, workspaces, collections, environments.
2. Auth: Google login, OIDC, SAML, enforced SSO, JIT provisioning.
3. Basic roles and audit log.
4. Web app: send HTTP requests, edit collections, run scripts, import existing collections.
5. Realtime sync between two users.
6. CLI runner.
7. Docker compose deployment.
