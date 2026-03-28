# ── Stage 1: Build Next.js frontend ───────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /build/frontend

# Install deps first (cache layer)
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --prefer-offline

# Copy source and build
COPY frontend/ ./
ENV NEXT_PUBLIC_BUNKY_API_BASE=""
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build


# ── Stage 2: Production image ────────────────────────────────
FROM python:3.11-slim

# Install nginx and Node.js runtime (for Next.js standalone)
RUN apt-get update && \
    apt-get install -y --no-install-recommends nginx curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user (HF Spaces requirement)
RUN useradd -m -u 1000 appuser

WORKDIR /app

# ── Backend setup ─────────────────────────────────────────────
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/ ./backend/

# ── Frontend setup ────────────────────────────────────────────
# Copy the standalone build + static assets + public
COPY --from=frontend-builder /build/frontend/.next/standalone ./frontend-standalone/
COPY --from=frontend-builder /build/frontend/.next/static ./frontend-standalone/.next/static/
COPY --from=frontend-builder /build/frontend/public ./frontend-standalone/public/

# ── Nginx config ──────────────────────────────────────────────
COPY nginx.conf /etc/nginx/nginx.conf

# ── Startup script ────────────────────────────────────────────
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Fix permissions
RUN mkdir -p /tmp/nginx /var/log/nginx /var/lib/nginx/body && \
    chown -R appuser:appuser /app /tmp/nginx /var/log/nginx /var/lib/nginx && \
    chown -R appuser:appuser /var/run && \
    chown -R appuser:appuser /etc/nginx

# Switch to non-root
USER appuser

ENV PORT=7860
ENV HOSTELOS_DB_PATH=/tmp/hostelos.db
ENV NEXT_PUBLIC_BUNKY_API_BASE=""
ENV NODE_ENV=production
ENV PYTHONUNBUFFERED=1

EXPOSE 7860

CMD ["/app/start.sh"]
