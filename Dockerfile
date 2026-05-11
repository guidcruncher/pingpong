# Stage 1: Base & pnpm Setup
FROM node:24-bookworm-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
    tini \
    arp-scan \
    avahi-utils \
    avahi-daemon \
    libnss-mdns \
    sqlite3 \
    python3 make g++ \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Stage 2: Dependencies & Build
FROM base AS builder
# Copy workspace manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/client/package.json ./apps/client/
COPY apps/server/package.json ./apps/server/
COPY shared/package.json ./shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code (Excluding db)
COPY tsconfig.json .
COPY apps ./apps
COPY shared ./shared

# Build all projects to create dist/ folders
RUN pnpm run build

# Stage 3: Runner
FROM base AS runner

RUN mkdir -p /var/run/dbus

WORKDIR /app

COPY ./apps/server/docs/*.json /app
COPY ./scripts /usr/local/bin
RUN chmod +x /usr/local/bin/*.sh

# 2. Copy Production Artifacts
# Shared project
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/shared/package.json ./shared/package.json

# Client project (Static assets)
COPY --from=builder /app/apps/client/dist ./apps/client/dist
COPY --from=builder /app/apps/client/package.json ./apps/client/package.json

# Server project
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/package.json ./apps/server/package.json

# 3. Copy Production Dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/server/node_modules ./apps/server/node_modules

# Environment & Execution
ENV NODE_ENV=production
EXPOSE 5173

# Start server using app.js
ENTRYPOINT ["/usr/bin/tini", "--"]

CMD ["/usr/local/bin/cmd.sh"]
