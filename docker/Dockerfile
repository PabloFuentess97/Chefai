# syntax=docker/dockerfile:1.7

# 1. Dependencies
FROM node:20-alpine AS deps
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
# node-linker=hoisted → flat node_modules (npm-style) so prisma generate
# writes to node_modules/.prisma/client at the top level (not inside .pnpm/).
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm config set --global enable-pre-post-scripts true && \
    pnpm config set --global node-linker hoisted && \
    pnpm install --frozen-lockfile --prod=false

# 2. Builder
FROM node:20-alpine AS builder
RUN corepack enable
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=true
RUN pnpm prisma generate && pnpm build

# 3. Runner
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl curl
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Pre-create uploads dir so the volume mount has correct ownership
RUN mkdir -p /app/public/uploads && chown -R nextjs:nodejs /app/public/uploads

USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD curl -fs http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]

# 4. Migrator (one-shot: run DB schema sync + seed before web boots)
# Uses the builder's full node_modules so prisma CLI + tsx are available.
FROM node:20-alpine AS migrator
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
CMD ["sh", "-c", "node ./node_modules/prisma/build/index.js db push --accept-data-loss && node ./node_modules/prisma/build/index.js db seed"]
