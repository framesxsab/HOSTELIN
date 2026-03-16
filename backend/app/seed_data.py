from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class MockStore:
    mess_schedule: list[dict[str, Any]] = field(default_factory=lambda: [
        {
            "meal": "Breakfast",
            "time": "07:30 - 09:30",
            "title": "Breakfast_Matrix",
            "menu": ["Steel-cut Oats", "Berries", "Whey"],
            "status": "ACTIVE",
        },
        {
            "meal": "Lunch",
            "time": "12:30 - 14:00",
            "title": "Lunch_Operational",
            "menu": ["Miso Salmon", "Quinoa", "Kale"],
            "status": "ENFORCED",
        },
        {
            "meal": "Dinner",
            "time": "19:30 - 21:00",
            "title": "Dinner_Protocol",
            "menu": ["Paneer Butter Masala", "Jeera Rice", "Salad"],
            "status": "ENFORCED",
        },
    ])
    fixit_tickets: list[dict[str, Any]] = field(default_factory=lambda: [
        {
            "id": "TKT-4402",
            "title": "Bathroom Faucet Leak - Room 304",
            "assignee": "Marco Rossi",
            "status": "In Progress",
            "eta": "24m",
        },
        {
            "id": "TKT-4405",
            "title": "Faulty Power Outlet - Common Area",
            "assignee": "Elena Petrov",
            "status": "Assigned",
            "eta": "1h 15m",
        },
        {
            "id": "TKT-4412",
            "title": "AC Unit Making Noise - Dorm 12",
            "assignee": "Pending Assignment",
            "status": "Received",
            "eta": "TBD",
        },
    ])
    roomtab: dict[str, Any] = field(default_factory=lambda: {
        "net_balance": 4500.0,
        "currency": "INR",
        "expenses": [
            {
                "id": "EXP-3101",
                "title": "Late Night Pizza // Domino's",
                "payer": "Self",
                "total": 60.0,
                "share": 45.0,
                "status": "Settled 3/4",
            },
            {
                "id": "EXP-3102",
                "title": "Internet Bill // Starlink",
                "payer": "Rahul M.",
                "total": 130.0,
                "share": -32.5,
                "status": "Pending",
            },
            {
                "id": "EXP-3103",
                "title": "Weekly Groceries // Whole Foods",
                "payer": "Sarah K.",
                "total": 288.0,
                "share": -96.0,
                "status": "Pending",
            },
        ],
    })
    parcels: list[dict[str, Any]] = field(default_factory=lambda: [
        {
            "id": "AMZ-4491",
            "vendor": "Amazon Logistics",
            "location": "Locker #402",
            "status": "READY FOR PICKUP",
            "eta": "14m at Gate",
            "picked_up": False,
        },
        {
            "id": "ZOM-8821",
            "vendor": "Zomato Fresh",
            "location": "Main Desk • Gate B",
            "status": "EXPIRING SOON",
            "eta": "4h 12m at Gate",
            "picked_up": False,
        },
    ])
    activity: list[str] = field(default_factory=lambda: [
        "Parcel #AMZ-4491 logged at Locker #402.",
        "MessMate dinner menu published.",
    ])
    ticket_counter: int = 4500
    expense_counter: int = 3200
    parcel_counter: int = 9000


store = MockStore()
