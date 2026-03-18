# HostelOS Backend (Bunky API)

FastAPI backend for Bunky command routing and module APIs with SQLite persistence.

For full project start/verify/release steps, see `RUNBOOK.md` at workspace root. Use `.\\scripts\\start-dev.ps1` from workspace root to launch backend and frontend together.

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
- `HOSTELOS_ALLOWED_ORIGINS` (comma-separated CORS origins)
- `HOSTELOS_LOG_LEVEL` (default: `INFO`)
- `HOSTELOS_CHAT_RATE_WINDOW_SECONDS` (default: `10`)
- `HOSTELOS_CHAT_RATE_MAX_REQUESTS` (default: `12`)

The database schema is applied automatically at startup from `backend/migrations/001_init_schema.sql`.

## Endpoints

- `GET /health`
- `GET /api/dashboard/summary`
- `GET /api/dashboard/activity/stream`
- `POST /api/bunky/chat`
- `GET /api/messmate/menu`
- `POST /api/messmate/skip`
- `POST /api/messmate/unskip`
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

## Bunky Command Notes

- `skip lunch`, `skip dinner`, `skip breakfast` are now routed to MessMate skip flow.
- `unskip lunch` or `undo lunch skip` removes a skipped meal for the day.
- Skip command validates meal name against configured rows in `mess_schedule`.

## Health Payload

`GET /health` now includes service metadata and diagnostics:

- `service`
- `version`
- `uptime_seconds`
- `db_path`
- `db_exists`

All HTTP responses also include:

- `X-Request-ID`
- `X-Processed-At`
