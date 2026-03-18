# HostelOS Runbook

This runbook gives you one place to start, validate, and smoke-test the whole application.

## Prerequisites

- Python virtual environment exists at `.venv` in workspace root.
- Backend dependencies are installed from `backend/requirements.txt`.
- Frontend dependencies are installed from `frontend/package.json`.

## Start The App

Open two terminals from workspace root.

### Terminal 1: Backend API

```powershell
Set-Location backend
& ..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

### Terminal 2: Frontend

```powershell
Set-Location frontend
npm run dev
```

### One Command (Recommended)

Use the launcher script from workspace root:

```powershell
.\scripts\start-dev.ps1
```

Optional custom ports:

```powershell
.\scripts\start-dev.ps1 -BackendPort 8010 -FrontendPort 3001
```

Dry-run preview (prints commands without launching terminals):

```powershell
.\scripts\start-dev.ps1 -DryRun
```

## Verify Health Quickly

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/health"
```

Expected keys include `status`, `service`, `version`, `uptime_seconds`, `db_path`, and `db_exists`.

## One-Shot Validation Script

Run this from workspace root:

```powershell
.\scripts\verify.ps1
```

This script runs:

1. Frontend lint.
2. Backend smoke tests.
3. Backend compile check.

## Manual Smoke Flow

1. Open `http://localhost:3000`.
2. In dashboard command bar, run:
   - `mess status`
   - `skip lunch`
   - `unskip lunch`
3. Open `/messmate` and toggle `Skip Meal` and `Undo Skip`.
4. Confirm dashboard skip count reflects MessMate actions.
5. Confirm Bunky command bar handles cooldown when chat rate limit is hit.

## Common Issues

### Backend not reachable

- Ensure backend is running on port `8000`.
- Verify `NEXT_PUBLIC_BUNKY_API_BASE` in `frontend/.env.local` if using a non-default host/port.

### Port 3000 busy

- Next.js auto-selects another port (for example `3001`).

### SQLite file lock during tests on Windows

- Re-run `.\scripts\verify.ps1`; teardown is lock-tolerant.

## Release Checklist

1. Run `.\scripts\verify.ps1`.
2. Run backend health check.
3. Do manual smoke flow in browser.
4. Confirm both backend and frontend terminal logs are clean.
