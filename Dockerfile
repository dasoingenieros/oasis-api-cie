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

# System deps: LibreOffice + Python + Chromium browser deps (all in one layer)
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
    # Chromium system dependencies for Playwright
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libdbus-1-3 libxkbcommon0 libatspi2.0-0 libxcomposite1 libxdamage1 \
    libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2 \
    libwayland-client0 \
    && pip3 install --break-system-packages python-docx \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

# Copy non-TS assets (templates, Python scripts) that nest build may not copy
COPY --from=builder /app/src/assets ./dist/src/assets
COPY --from=builder /app/src/documents/templates ./dist/src/documents/templates

# Install Playwright Chromium browsers AFTER node_modules are in place
ENV PLAYWRIGHT_BROWSERS_PATH=/app/.cache/ms-playwright
RUN npx playwright-core install chromium

RUN groupadd -r appuser && useradd -r -g appuser -d /app appuser \
    && mkdir -p /app/tmp /app/.config /app/uploads/signed && chown -R appuser:appuser /app
USER appuser

ENV HOME=/app
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
    CMD curl -sf http://localhost:3001/api/v1/health || exit 1

EXPOSE 3001
CMD ["node", "dist/src/main"]
