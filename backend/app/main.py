import os
import logging
import time
import json
import asyncio
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException
from fastapi import FastAPI
from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

from .database import init_database
from .database import DB_PATH
from .schemas import (
    BunkyChatRequest,
    BunkyChatResponse,
    DashboardSummary,
    FixItCreateRequest,
    FixItTicket,
    MessMateSkipRequest,
    MessMateSkipResponse,
    MessMateUnskipRequest,
    MessMateUnskipResponse,
    MessMateResponse,
    ParcelCreateRequest,
    ParcelItem,
    ParcelPickupRequest,
    RoomTabCreateExpenseRequest,
    RoomTabExpense,
    RoomTabSummary,
    ToolResult,
)
from .services import (
    create_fixit_ticket,
    create_parcel,
    create_roomtab_expense,
    get_dashboard_summary,
    get_messmate_schedule,
    get_roomtab_summary,
    list_fixit_tickets,
    list_parcels,
    list_activity_since,
    pickup_parcel,
    route_command,
    skip_meal,
    unskip_meal,
)


def _parse_allowed_origins() -> list[str]:
    configured = os.getenv(
        "HOSTELOS_ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001",
    )
    origins = [origin.strip() for origin in configured.split(",") if origin.strip()]
    return origins or ["*"]


logging.basicConfig(
    level=getattr(logging, os.getenv("HOSTELOS_LOG_LEVEL", "INFO").upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger("hostelos")
STARTED_AT = time.perf_counter()
CHAT_RATE_WINDOW_SECONDS = int(os.getenv("HOSTELOS_CHAT_RATE_WINDOW_SECONDS", "10"))
CHAT_RATE_MAX_REQUESTS = int(os.getenv("HOSTELOS_CHAT_RATE_MAX_REQUESTS", "12"))
_chat_rate_buckets: dict[str, list[float]] = {}


def _is_chat_rate_limited(user_id: str) -> tuple[bool, int]:
    now = time.monotonic()
    window_start = now - CHAT_RATE_WINDOW_SECONDS
    bucket = [value for value in _chat_rate_buckets.get(user_id, []) if value >= window_start]

    if len(bucket) >= CHAT_RATE_MAX_REQUESTS:
        retry_after_seconds = max(1, int(bucket[0] + CHAT_RATE_WINDOW_SECONDS - now) + 1)
        _chat_rate_buckets[user_id] = bucket
        return True, retry_after_seconds

    bucket.append(now)
    _chat_rate_buckets[user_id] = bucket
    return False, 0

app = FastAPI(title="HostelOS Bunky API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_parse_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event() -> None:
    init_database()


@app.middleware("http")
async def inject_user_context(request: Request, call_next):
    request_id = uuid4().hex[:12]
    started = time.perf_counter()
    default_user = os.getenv("HOSTELOS_DEFAULT_USER", "default_user")
    request.state.user_id = request.headers.get("X-User-ID", default_user)
    request.state.request_id = request_id

    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - started) * 1000
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Processed-At"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    logger.info(
        "%s %s -> %s (%.1f ms) user=%s req=%s",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
        request.state.user_id,
        request_id,
    )
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    request_id = getattr(request.state, "request_id", "unknown")
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Request validation failed.",
            "errors": exc.errors(),
            "request_id": request_id,
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", "unknown")
    logger.exception("Unhandled error for req=%s", request_id)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error.",
            "request_id": request_id,
        },
    )


@app.get("/health")
def health() -> dict[str, object]:
    db_file = Path(DB_PATH)
    return {
        "status": "ok",
        "service": "hostelos-backend",
        "version": app.version,
        "uptime_seconds": round(time.perf_counter() - STARTED_AT, 3),
        "db_path": str(db_file),
        "db_exists": db_file.exists(),
    }


@app.get("/api/dashboard/summary", response_model=DashboardSummary)
def dashboard_summary(request: Request) -> DashboardSummary:
    return DashboardSummary(**get_dashboard_summary(user_id=request.state.user_id))


@app.get("/api/dashboard/activity/stream")
async def dashboard_activity_stream(request: Request) -> StreamingResponse:
    async def event_stream():
        last_seen_id = 0

        while True:
            if await request.is_disconnected():
                break

            rows = list_activity_since(last_seen_id)
            if rows:
                for row in rows:
                    payload = json.dumps({"id": row["id"], "message": row["message"]}, ensure_ascii=True)
                    yield f"event: activity\ndata: {payload}\n\n"
                last_seen_id = rows[-1]["id"]
            else:
                yield "event: heartbeat\ndata: {}\n\n"

            await asyncio.sleep(2)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/api/bunky/chat", response_model=BunkyChatResponse)
def bunky_chat(payload: BunkyChatRequest, request: Request) -> BunkyChatResponse:
    is_limited, retry_after = _is_chat_rate_limited(request.state.user_id)
    if is_limited:
        raise HTTPException(
            status_code=429,
            detail="Too many command requests. Please retry shortly.",
            headers={"Retry-After": str(retry_after)},
        )

    intent, tool_name, message = route_command(payload.command, user_id=request.state.user_id)
    return BunkyChatResponse(intent=intent, result=ToolResult(tool=tool_name, message=message))


@app.get("/api/messmate/menu", response_model=MessMateResponse)
def messmate_menu(request: Request) -> MessMateResponse:
    return MessMateResponse(**get_messmate_schedule(user_id=request.state.user_id))


@app.post("/api/messmate/skip", response_model=MessMateSkipResponse)
def messmate_skip(payload: MessMateSkipRequest, request: Request) -> MessMateSkipResponse:
    try:
        result = skip_meal(payload.meal, payload.date, user_id=request.state.user_id)
        return MessMateSkipResponse(**result)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/messmate/unskip", response_model=MessMateUnskipResponse)
def messmate_unskip(payload: MessMateUnskipRequest, request: Request) -> MessMateUnskipResponse:
    try:
        result = unskip_meal(payload.meal, payload.date, user_id=request.state.user_id)
        return MessMateUnskipResponse(**result)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/fixit/tickets", response_model=list[FixItTicket])
def get_fixit_tickets() -> list[FixItTicket]:
    return [FixItTicket(**ticket) for ticket in list_fixit_tickets()]


@app.post("/api/fixit/tickets", response_model=FixItTicket)
def post_fixit_ticket(payload: FixItCreateRequest, request: Request) -> FixItTicket:
    try:
        return FixItTicket(**create_fixit_ticket(payload.title, user_id=request.state.user_id))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/roomtab/summary", response_model=RoomTabSummary)
def roomtab_summary() -> RoomTabSummary:
    return RoomTabSummary(**get_roomtab_summary())


@app.post("/api/roomtab/expenses", response_model=RoomTabExpense)
def roomtab_add_expense(payload: RoomTabCreateExpenseRequest, request: Request) -> RoomTabExpense:
    try:
        expense = create_roomtab_expense(
            title=payload.title,
            payer=payload.payer,
            total=payload.total,
            share=payload.share,
            user_id=request.state.user_id,
        )
        return RoomTabExpense(**expense)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/parcelping/parcels", response_model=list[ParcelItem])
def parcelping_list() -> list[ParcelItem]:
    return [ParcelItem(**parcel) for parcel in list_parcels()]


@app.post("/api/parcelping/parcels", response_model=ParcelItem)
def parcelping_create(payload: ParcelCreateRequest, request: Request) -> ParcelItem:
    try:
        return ParcelItem(
            **create_parcel(
                payload.vendor,
                payload.location,
                payload.status,
                payload.eta,
                user_id=request.state.user_id,
            )
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/parcelping/pickup", response_model=ParcelItem)
def parcelping_pickup(payload: ParcelPickupRequest, request: Request) -> ParcelItem:
    parcel = pickup_parcel(payload.id, user_id=request.state.user_id)
    if parcel is None:
        raise HTTPException(status_code=404, detail=f"Parcel '{payload.id}' not found")
    return ParcelItem(**parcel)
