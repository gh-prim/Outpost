# Outpost web app: UI, REST API and authentication.
# Build: docker build -t outpost .
# The `migrate` target applies database migrations, the `worker` target runs monitors.

FROM node:24-bookworm-slim AS base
# The desktop app is part of the workspace but never built in the image.
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1 ELECTRON_SKIP_BINARY_DOWNLOAD=1
RUN corepack enable && apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY apps/cli/package.json apps/cli/
COPY apps/runner/package.json apps/runner/
COPY apps/desktop/package.json apps/desktop/
COPY packages/db/package.json packages/db/
COPY packages/engine/package.json packages/engine/
COPY packages/ui/package.json packages/ui/
COPY packages/vaults/package.json packages/vaults/
# Skip postinstall scripts here: the Prisma client is generated once the schema is copied.
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM deps AS build
COPY . .
RUN pnpm rebuild && pnpm --filter @outpost/db generate
# Placeholders so modules that read configuration at import time can load during the build.
RUN OUTPOST_STANDALONE=1 BETTER_AUTH_SECRET=build-only-placeholder DATABASE_URL=postgresql://build:build@localhost/build \
  pnpm --filter web build

FROM build AS migrate
CMD ["pnpm", "--filter", "@outpost/db", "migrate:deploy"]

# Background worker: monitors and scheduled runs.
FROM build AS worker
ENV NODE_ENV=production
CMD ["pnpm", "--filter", "@outpost/runner", "start"]

FROM node:24-bookworm-slim AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
RUN groupadd --system outpost && useradd --system --gid outpost outpost
COPY --from=build --chown=outpost:outpost /app/apps/web/.next/standalone ./
COPY --from=build --chown=outpost:outpost /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=outpost:outpost /app/apps/web/public ./apps/web/public
USER outpost
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:3000/api/auth/ok').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/web/server.js"]
