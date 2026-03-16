# HostelOS Backend (Bunky API)

FastAPI scaffold for Bunky command routing and dashboard module summaries.

## Setup

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Endpoints

- `GET /health`
- `GET /api/dashboard/summary`
- `POST /api/bunky/chat`
