# oasis-api-cie — Multi-stage build

# ─── Build ───────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
COPY packages ./packages
COPY .npmrc* ./
RUN npm ci --legacy-peer-deps

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

# ─── Runtime ─────────────────────────────────────────────────
FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice-calc \
    libreoffice-writer \
    python3 \
    python3-uno \
    python3-pip \
    fonts-liberation \
    fonts-dejavu-core \
    ca-certificates \
    curl \
    && pip3 install --break-system-packages python-docx \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

RUN groupadd -r appuser && useradd -r -g appuser -d /app appuser \
    && mkdir -p /app/tmp /app/.config && chown -R appuser:appuser /app
USER appuser

ENV HOME=/app
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
    CMD curl -sf http://localhost:3001/api/v1/health || exit 1

EXPOSE 3001
CMD ["node", "dist/main"]
