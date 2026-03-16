from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .schemas import (
    BunkyChatRequest,
    BunkyChatResponse,
    DashboardSummary,
    FixItCreateRequest,
    FixItTicket,
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
    pickup_parcel,
    route_command,
)

app = FastAPI(title="HostelOS Bunky API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/dashboard/summary", response_model=DashboardSummary)
def dashboard_summary() -> DashboardSummary:
    return DashboardSummary(**get_dashboard_summary())


@app.post("/api/bunky/chat", response_model=BunkyChatResponse)
def bunky_chat(payload: BunkyChatRequest) -> BunkyChatResponse:
    intent, tool_name, message = route_command(payload.command)
    return BunkyChatResponse(intent=intent, result=ToolResult(tool=tool_name, message=message))


@app.get("/api/messmate/menu", response_model=MessMateResponse)
def messmate_menu() -> MessMateResponse:
    return MessMateResponse(**get_messmate_schedule())


@app.get("/api/fixit/tickets", response_model=list[FixItTicket])
def get_fixit_tickets() -> list[FixItTicket]:
    return [FixItTicket(**ticket) for ticket in list_fixit_tickets()]


@app.post("/api/fixit/tickets", response_model=FixItTicket)
def post_fixit_ticket(payload: FixItCreateRequest) -> FixItTicket:
    return FixItTicket(**create_fixit_ticket(payload.title))


@app.get("/api/roomtab/summary", response_model=RoomTabSummary)
def roomtab_summary() -> RoomTabSummary:
    return RoomTabSummary(**get_roomtab_summary())


@app.post("/api/roomtab/expenses", response_model=RoomTabExpense)
def roomtab_add_expense(payload: RoomTabCreateExpenseRequest) -> RoomTabExpense:
    expense = create_roomtab_expense(
        title=payload.title,
        payer=payload.payer,
        total=payload.total,
        share=payload.share,
    )
    return RoomTabExpense(**expense)


@app.get("/api/parcelping/parcels", response_model=list[ParcelItem])
def parcelping_list() -> list[ParcelItem]:
    return [ParcelItem(**parcel) for parcel in list_parcels()]


@app.post("/api/parcelping/parcels", response_model=ParcelItem)
def parcelping_create(payload: ParcelCreateRequest) -> ParcelItem:
    return ParcelItem(**create_parcel(payload.vendor, payload.location, payload.status, payload.eta))


@app.post("/api/parcelping/pickup", response_model=ParcelItem)
def parcelping_pickup(payload: ParcelPickupRequest) -> ParcelItem:
    parcel = pickup_parcel(payload.id)
    if parcel is None:
        raise HTTPException(status_code=404, detail=f"Parcel '{payload.id}' not found")
    return ParcelItem(**parcel)
