#!/bin/bash
set -e

echo "╔══════════════════════════════════════════════╗"
echo "║  HostelOS — Starting Production Server       ║"
echo "╚══════════════════════════════════════════════╝"

# ── Ensure writable dirs ──────────────────────────────────────
mkdir -p /tmp/nginx/client_body /tmp/nginx/proxy /tmp/nginx/fastcgi /tmp/nginx/uwsgi /tmp/nginx/scgi

# ── Run database migrations ───────────────────────────────────
echo "[1/4] Running database migrations..."
cd /app/backend
python -c "from app.database import init_database; init_database()"
echo "       ✓ Database ready at ${HOSTELOS_DB_PATH:-/tmp/hostelos.db}"

# ── Start FastAPI backend ─────────────────────────────────────
echo "[2/4] Starting FastAPI backend on :8000..."
python -m uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers 2 \
    --log-level info &
BACKEND_PID=$!

# ── Start Next.js frontend ───────────────────────────────────
echo "[3/4] Starting Next.js frontend on :3000..."
cd /app/frontend-standalone
HOSTNAME=0.0.0.0 PORT=3000 node server.js &
FRONTEND_PID=$!

# ── Wait for services to be ready ─────────────────────────────
echo "[4/4] Waiting for services..."
sleep 3

# Health check loop
for i in $(seq 1 10); do
    if curl -sf http://127.0.0.1:8000/health > /dev/null 2>&1; then
        echo "       ✓ Backend healthy"
        break
    fi
    if [ "$i" -eq 10 ]; then
        echo "       ✗ Backend failed to start"
        exit 1
    fi
    sleep 1
done

for i in $(seq 1 10); do
    if curl -sf http://127.0.0.1:3000 > /dev/null 2>&1; then
        echo "       ✓ Frontend healthy"
        break
    fi
    if [ "$i" -eq 10 ]; then
        echo "       ✗ Frontend failed to start"
        exit 1
    fi
    sleep 1
done

# ── Start Nginx (foreground — keeps container alive) ──────────
echo ""
echo "══════════════════════════════════════════════"
echo "  HostelOS is live on port 7860"
echo "══════════════════════════════════════════════"
echo ""

nginx -g "daemon off;"
