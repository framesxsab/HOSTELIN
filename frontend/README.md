## HostelOS Frontend

Terminal-luxe frontend for HostelOS built with Next.js App Router + Tailwind.

For full project start/verify/release steps, see `RUNBOOK.md`, run `.\\scripts\\start-dev.ps1` to launch both services, and use `.\\scripts\\verify.ps1` for checks.

### Current Status
- Shared app shell implemented.
- Routes implemented:
	- `/` (Dashboard)
	- `/messmate`
	- `/fixit`
	- `/roomtab`
	- `/parcelping`
- Lint baseline passes.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.
If 3000 is busy, Next.js automatically uses the next available port (for example 3001).

### Main Files
- `src/components/app-shell.tsx` - shared layout, header, and module navigation
- `src/app/page.tsx` - dashboard page
- `src/app/messmate/page.tsx` - MessMate module
- `src/app/fixit/page.tsx` - FixIt module
- `src/app/roomtab/page.tsx` - RoomTab module
- `src/app/parcelping/page.tsx` - ParcelPing module

### Completed Milestones
1. [x] Add backend scaffold (FastAPI).
2. [x] Add Bunky endpoint `/api/bunky/chat` with mock actions.
3. [x] Connect command bar in dashboard to backend response stream.
4. [x] Add seeded data and replace static module cards with API-driven values.
5. [x] Add live activity streaming endpoint and optimistic command updates on dashboard.

### Local Full Flow
1. Start backend from the workspace root:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Note: Backend now persists data in `backend/hostelos.db` by default.

2. Start frontend in a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Optional: set `NEXT_PUBLIC_BUNKY_API_BASE` in `.env.local` if backend is not on `http://127.0.0.1:8000`.

3. Open the dashboard and run commands in the command bar:
- `mess status`
- `fixit for broken fan in room 14`
- `roomtab add 250 for cleaning supplies`
- `parcel status`

4. Open `/messmate` and use `Skip Meal` / `Undo Skip` to toggle today's skip state in backend.

5. Dashboard command bar now respects backend chat rate-limits and shows a live retry countdown when throttled.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js).

## Deploy on Vercel

Use Vercel, Azure Static Web Apps, or any Node-compatible platform.
