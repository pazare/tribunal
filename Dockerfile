# Tribunal API — SUSE BCI Node.js 22 base image.
FROM registry.suse.com/bci/nodejs:22 AS build

WORKDIR /app

# Copy monorepo manifests first for layer caching.
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps ./apps

# Install dependencies (lockfile present in repo).
RUN npm ci || npm install

# Web UI build is optional in minimal checkouts; server runs without it.
RUN npm run build --workspace @tribunal/web || true

FROM registry.suse.com/bci/nodejs:22

WORKDIR /app

COPY --from=build /app /app

ENV PORT=8787
# The API binds 127.0.0.1 by default (it can drive local agent CLIs); inside a
# container the boundary is the container itself, so opt in to all interfaces.
ENV HOST=0.0.0.0
ENV TRIBUNAL_RUNS_DIR=runs

EXPOSE 8787

CMD ["npx", "tsx", "apps/server/src/index.ts"]
