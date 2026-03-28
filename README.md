---
title: HostelOS
emoji: 🏠
colorFrom: green
colorTo: gray
sdk: docker
app_port: 7860
pinned: true
license: mit
short_description: The Everything App for Hostel Students
---

# HostelOS 🏠

**The Everything App for Hostel Students** — a terminal-luxe dashboard that manages mess menus, maintenance tickets, expense splitting, parcel tracking, and an AI command assistant.

## Features

| Module | Description |
|--------|-------------|
| **MessMate** | Weekly mess menu, meal skip/unskip, star ratings |
| **FixIt** | Maintenance ticket creation & tracking |
| **RoomTab** | Expense splitting & balance tracking |
| **ParcelPing** | Delivery tracking & pickup confirmation |
| **Bunky AI** | Natural language command router |
| **Admin Panel** | Ticket/parcel management, menu editing |

## Tech Stack

- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS
- **Backend**: FastAPI + SQLite
- **Auth**: JWT with bcrypt password hashing
- **Deployment**: Docker + Nginx reverse proxy

## Environment Variables

Set these as **Space Secrets** for production:

| Variable | Description | Default |
|----------|-------------|---------|
| `HOSTELOS_SECRET_KEY` | JWT signing key | Auto-generated |
| `HOSTELOS_DB_PATH` | SQLite database path | `/tmp/hostelos.db` |

> **Note**: The SQLite database is stored in `/tmp/` and will reset on Space restart. This is a demo deployment.

## Running Locally

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```
