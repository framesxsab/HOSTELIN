# HostelOS Backend (Bunky API)

FastAPI backend for Bunky command routing and module APIs with SQLite persistence.

## Setup

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Configuration

Copy `backend/.env.example` values into your environment if you need custom paths:

- `HOSTELOS_DB_PATH` (default: `backend/hostelos.db`)
- `HOSTELOS_DEFAULT_USER` (default: `default_user`)

The database schema is applied automatically at startup from `backend/migrations/001_init_schema.sql`.

## Endpoints

- `GET /health`
- `GET /api/dashboard/summary`
- `POST /api/bunky/chat`
- `GET /api/messmate/menu`
- `GET /api/fixit/tickets`
- `POST /api/fixit/tickets`
- `GET /api/roomtab/summary`
- `POST /api/roomtab/expenses`
- `GET /api/parcelping/parcels`
- `POST /api/parcelping/parcels`
- `POST /api/parcelping/pickup`

## Identity Context

Set `X-User-ID` header to tag writes and activity logs per user context.
If omitted, backend uses `default_user`.
