# Outpost feature scope

Outpost has one edition. Everything is free and open source: no plans, no tiers, no seats, no add-ons, no usage limits. Every feature below is available to every user of every instance.

Status legend: `mvp` (first usable release), `planned` (comes after).

## API client and development

| Feature | Status |
|---|---|
| Multi-protocol API client (HTTP, GraphQL, gRPC, WebSocket, SSE, MQTT, SOAP) | mvp (HTTP first) |
| MCP client (Model Context Protocol) | planned |
| Collections, folders, environments, globals, variables | mvp |
| Pre-request and test scripts (scripting API compatible with existing collections) | mvp |
| Import/export of existing collections (Collection Format v2.1) and environments | mvp |
| Specs (OpenAPI, AsyncAPI) editor and import | planned |
| Mock servers | planned |
| Native Git sync for collections | planned |
| Visual workflows (request chaining) | planned |
| Automated workflows (scheduled and triggered) | planned |
| Private package library (shared scripts) | planned |
| AI assistant (bring your own model key, unlimited) | planned |

## Testing and monitoring

| Feature | Status |
|---|---|
| Collection Runner, local performance testing | mvp |
| CLI runner (Newman-like) | mvp |
| Data-driven testing (CSV/JSON) with result exports | mvp |
| API monitoring, unlimited scheduled runs | planned |
| Private runners for tests and workflows (self-hosted workers) | planned |
| Distributed performance testing on your own workers | planned |
| Monitor reports with approval workflows | planned |
| Insights (production traffic visibility, OpenTelemetry ingest) | planned |

## Collaboration

| Feature | Status |
|---|---|
| Shared team workspaces with real-time sync | mvp |
| Unlimited users and viewers | mvp |
| Commenting and annotations | planned |
| Version history and recovery, configurable retention | planned |
| Webhooks and integrations (Slack, GitHub, GitLab, Jira) | planned |
| Public API for automation, unmetered | mvp |
| Organizations (multiple teams under one org) | planned |
| Private, internal and partner (external) workspaces | planned |
| Workspace archival | planned |

## Documentation and distribution

| Feature | Status |
|---|---|
| API documentation, public and private | planned |
| Custom-branded docs and unlimited custom domains | planned |
| SDK generation and distribution (OpenAPI Generator) | planned |
| SDK auto-distribution (auto PR to repos) | planned |
| API Catalog (system of record for APIs) | planned |
| Private API Network (internal API directory) | planned |

## Identity and access

| Feature | Status |
|---|---|
| Google login, with allowed domain restriction | mvp |
| SSO via SAML 2.0 (Entra ID, Okta, OneLogin, Ping, Duo, AD FS, custom) | mvp |
| SSO via OIDC (Keycloak, Authentik, Zitadel, any OIDC IdP) | mvp |
| Enforced SSO or mixed sign-in methods | mvp |
| Just-in-time user provisioning | mvp |
| RBAC (admin, editor, viewer) | mvp |
| User groups | mvp |
| Advanced RBAC: team, workspace and element-level roles | planned |
| SCIM 2.0 user and group provisioning | planned |
| Domain verification and domain capture | planned |
| Account discovery and account control | planned |

## Security, governance and compliance

| Feature | Status |
|---|---|
| Audit logs and compliance reporting, exportable | mvp |
| Local vault (secrets never leave the client) | mvp |
| Shared vault with external vaults (HashiCorp Vault, AWS Secrets Manager, Azure Key Vault) | planned |
| Secret scanner, local and server-side | planned |
| Advanced secret security controls | planned |
| Governance rules for specs and packages (Spectral linting) | planned |
| AI input guardrails | planned |
| Deployment control | planned |
| Data residency | Built in: you host it |

## Not included

- Anything to do with billing: licenses, seats, credits, quotas. There is nothing to pay for.
- A public API marketplace. Outpost is private to your organization by default.
- Code, assets or branding from any other product.
