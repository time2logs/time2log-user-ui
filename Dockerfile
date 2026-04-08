FROM oven/bun:1 AS builder

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run prepare
RUN bun run vite build


FROM oven/bun:1-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./

EXPOSE 3000

CMD ["bun", "run", "build/index.js"]
