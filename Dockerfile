# Tribunal API — SUSE BCI Node.js 22 base image.
FROM registry.suse.com/bci/nodejs:22 AS build

WORKDIR /app

# Copy monorepo manifests first for layer caching.
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps ./apps

# Install the exact locked dependency graph.
RUN npm ci

# The container is an operator surface, so a broken or missing UI fails the
# image build instead of silently shipping only the API.
RUN npm run build --workspace @tribunal/web

FROM registry.suse.com/bci/nodejs:22

WORKDIR /app

COPY --from=build /app /app

ENV PORT=8787
# The API binds 127.0.0.1 by default (it can drive local agent CLIs). A
# container must listen on all interfaces to accept published-port traffic, so
# this image opts in to a non-loopback bind. The server therefore refuses to
# start unless TRIBUNAL_DECODER_OPERATOR_TOKEN is injected at runtime; never
# bake that secret into the image.
ENV HOST=0.0.0.0
ENV TRIBUNAL_RUNS_DIR=runs

EXPOSE 8787

CMD ["npx", "tsx", "apps/server/src/index.ts"]
