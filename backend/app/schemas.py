from typing import Literal

from pydantic import BaseModel, Field


class BunkyChatRequest(BaseModel):
    command: str = Field(min_length=1, max_length=500)


class ToolResult(BaseModel):
    tool: Literal[
        "mess_status",
        "fixit_ticket_create",
        "roomtab_log_expense",
        "parcel_status",
        "unknown",
    ]
    message: str


class BunkyChatResponse(BaseModel):
    intent: str
    result: ToolResult


class DashboardSummary(BaseModel):
    dinner_time: str
    fixit_pending: int
    roomtab_balance: str
    parcel_arrived: int
    recent_activity: list[str]


class MealSlot(BaseModel):
    meal: str
    time: str
    title: str
    menu: list[str]
    status: str


class MessMateResponse(BaseModel):
    period: str
    slots: list[MealSlot]


class FixItTicket(BaseModel):
    id: str
    title: str
    assignee: str
    status: str
    eta: str


class FixItCreateRequest(BaseModel):
    title: str = Field(min_length=3, max_length=240)


class RoomTabExpense(BaseModel):
    id: str
    title: str
    payer: str
    total: float
    share: float
    status: str


class RoomTabCreateExpenseRequest(BaseModel):
    title: str = Field(min_length=3, max_length=240)
    payer: str = Field(min_length=2, max_length=80)
    total: float = Field(gt=0)
    share: float


class RoomTabSummary(BaseModel):
    currency: str
    net_balance: float
    you_are_owed: float
    you_owe: float
    expenses: list[RoomTabExpense]


class ParcelItem(BaseModel):
    id: str
    vendor: str
    location: str
    status: str
    eta: str
    picked_up: bool


class ParcelCreateRequest(BaseModel):
    vendor: str = Field(min_length=2, max_length=120)
    location: str = Field(min_length=2, max_length=120)
    status: str = Field(min_length=2, max_length=60)
    eta: str = Field(min_length=2, max_length=60)


class ParcelPickupRequest(BaseModel):
    id: str = Field(min_length=3, max_length=40)
