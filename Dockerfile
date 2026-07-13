FROM node:22-slim AS builder

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --ignore-scripts || pnpm install --ignore-scripts
RUN pnpm rebuild @prisma/client @prisma/engines prisma

COPY . .
RUN npx prisma generate
RUN pnpm run build && cp -r src/generated dist/generated

FROM node:22-slim AS runner

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/serviceAccountKey.json ./serviceAccountKey.json

RUN mkdir -p /app/uploads

EXPOSE 3000

CMD npx prisma migrate deploy && node dist/server.js
