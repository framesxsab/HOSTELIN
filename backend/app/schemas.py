from typing import Literal, Optional

from pydantic import BaseModel, Field


class BunkyChatRequest(BaseModel):
    command: str = Field(min_length=1, max_length=500)


class ToolResult(BaseModel):
    tool: Literal[
        "mess_status",
        "mess_skip_meal",
        "mess_unskip_meal",
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
    mess_skipped_today: int
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
    skipped: bool


class WeeklyMealCell(BaseModel):
    items: list[str]


class WeeklyMenuDay(BaseModel):
    day: str
    date: str
    breakfast: WeeklyMealCell
    lunch: WeeklyMealCell
    dinner: WeeklyMealCell


class MessMateResponse(BaseModel):
    period: str
    today_label: str
    slots: list[MealSlot]
    week: list[WeeklyMenuDay]


class MessMateSkipRequest(BaseModel):
    meal: str = Field(min_length=3, max_length=40)
    date: str | None = Field(default=None, max_length=10)


class MessMateSkipResponse(BaseModel):
    meal: str
    date: str
    already_skipped: bool
    message: str


class MessMateUnskipRequest(BaseModel):
    meal: str = Field(min_length=3, max_length=40)
    date: str | None = Field(default=None, max_length=10)


class MessMateUnskipResponse(BaseModel):
    meal: str
    date: str
    was_skipped: bool
    message: str


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


# ── Auth schemas ──────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    username: str = Field(min_length=3, max_length=60)
    password: str = Field(min_length=6, max_length=120)


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=60)
    password: str = Field(min_length=1, max_length=120)


class AuthUser(BaseModel):
    id: str
    name: str
    username: str
    role: str


class AuthResponse(BaseModel):
    access_token: str
    user: AuthUser


# ── Admin schemas ─────────────────────────────────────────────

class AdminFixItUpdate(BaseModel):
    status: Optional[str] = None
    assignee: Optional[str] = None
    eta: Optional[str] = None


class AdminParcelUpdate(BaseModel):
    status: Optional[str] = None
    eta: Optional[str] = None


class AdminMenuUpdate(BaseModel):
    week: list[dict]


# ── Meal rating schemas ──────────────────────────────────────

class MealRateRequest(BaseModel):
    meal: str = Field(min_length=3, max_length=40)
    rating: int = Field(ge=1, le=5)
    date: str | None = Field(default=None, max_length=10)


class MealRatingItem(BaseModel):
    meal: str
    date: str
    rating: int
    average: float
    total_ratings: int


class MealRatingsResponse(BaseModel):
    ratings: list[MealRatingItem]
