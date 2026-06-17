# Stage 1: Install all deps and build
FROM oven/bun:1 AS builder
WORKDIR /app

ARG PUBLIC_SUPABASE_URL
ARG PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV PUBLIC_SUPABASE_URL=$PUBLIC_SUPABASE_URL
ENV PUBLIC_SUPABASE_PUBLISHABLE_KEY=$PUBLIC_SUPABASE_PUBLISHABLE_KEY

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run prepare
RUN bunx --bun vite build

# Stage 2: Production dependencies only (clean, no devDeps)
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Stage 3: Node runtime (adapter-node outputs a Node.js HTTP server)
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
ENV USE_SMS=0

# package.json required — "type": "module" tells Node to use ESM
COPY --from=builder /app/package.json ./
COPY --from=builder /app/build ./build
COPY --from=deps /app/node_modules ./node_modules

EXPOSE 3000
CMD ["node", "build/index.js"]
