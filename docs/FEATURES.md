# Outpost feature scope

Outpost has one edition. Everything is free and open source: no plans, no tiers, no seats, no add-ons, no usage limits. Every feature below is available to every user of every instance.

Status legend: `done` (available now), `partial` (works, with the noted gaps), `planned` (not started).

## API client and development

| Feature | Status |
|---|---|
| Multi-protocol API client (HTTP, GraphQL, gRPC, WebSocket, SSE, MQTT, SOAP) | partial: HTTP |
| MCP client (Model Context Protocol) | planned |
| Collections, folders, environments, globals, variables | done |
| Pre-request and test scripts (scripting API compatible with existing collections) | done |
| Import/export of existing collections (Collection Format v2.1) and environments | done (collections export through the API) |
| Specs (OpenAPI, AsyncAPI) editor and import | planned |
| Mock servers | done (from saved examples, public or API key) |
| Native Git sync for collections | planned |
| Visual workflows (request chaining) | planned |
| Automated workflows (scheduled and triggered) | planned |
| Private package library (shared scripts) | planned |
| AI assistant (bring your own model key, unlimited) | planned |

## Testing and monitoring

| Feature | Status |
|---|---|
| Collection Runner, local performance testing | partial: runner done, performance testing planned |
| CLI runner (Newman-like) | done |
| Data-driven testing (CSV/JSON) with result exports | done |
| API monitoring, unlimited scheduled runs | done (Slack, Teams and webhook alerts) |
| Private runners for tests and workflows (self-hosted workers) | partial: the worker runs anywhere, monitors only |
| Distributed performance testing on your own workers | planned |
| Monitor reports with approval workflows | planned |
| Insights (production traffic visibility, OpenTelemetry ingest) | planned |

## Collaboration

| Feature | Status |
|---|---|
| Shared team workspaces with real-time sync | done |
| Unlimited users and viewers | done |
| Commenting and annotations | planned |
| Version history and recovery, configurable retention | partial: every save is kept and restorable through the API |
| Webhooks and integrations (Slack, GitHub, GitLab, Jira) | planned |
| Public API for automation, unmetered | done (personal API keys) |
| Organizations (multiple teams under one org) | done |
| Private, internal and partner (external) workspaces | partial: private and organization-wide |
| Workspace archival | partial: API only |

## Documentation and distribution

| Feature | Status |
|---|---|
| API documentation, public and private | done |
| Custom-branded docs and unlimited custom domains | partial: branding done, custom domains planned |
| SDK generation and distribution (OpenAPI Generator) | planned |
| SDK auto-distribution (auto PR to repos) | planned |
| API Catalog (system of record for APIs) | planned |
| Private API Network (internal API directory) | planned |

## Identity and access

| Feature | Status |
|---|---|
| Google login, with allowed domain restriction | done |
| SSO via SAML 2.0 (Entra ID, Okta, OneLogin, Ping, Duo, AD FS, custom) | done |
| SSO via OIDC (Keycloak, Authentik, Zitadel, any OIDC IdP) | done |
| Enforced SSO or mixed sign-in methods | done |
| Just-in-time user provisioning | done |
| RBAC (admin, editor, viewer) | done |
| User groups | done (teams) |
| Advanced RBAC: team, workspace and element-level roles | partial: team and workspace roles |
| SCIM 2.0 user and group provisioning | done |
| Domain verification and domain capture | partial: DNS verification |
| Account discovery and account control | planned |

## Security, governance and compliance

| Feature | Status |
|---|---|
| Audit logs and compliance reporting, exportable | done (CSV export) |
| Local vault (secrets never leave the client) | planned (environment secrets are encrypted at rest on the server today) |
| Shared vault with external vaults (HashiCorp Vault, AWS Secrets Manager, Azure Key Vault) | planned |
| Secret scanner, local and server-side | planned |
| Advanced secret security controls | planned |
| Governance rules for specs and packages (Spectral linting) | planned |
| AI input guardrails | planned |
| Deployment control | planned |
| Data residency | Built in: you host it |

## Desktop

| Feature | Status |
|---|---|
| Desktop app with local request execution (macOS, Windows, Linux) | done |

## Not included

- Anything to do with billing: licenses, seats, credits, quotas. There is nothing to pay for.
- A public API marketplace. Outpost is private to your organization by default.
- Code, assets or branding from any other product.
