from __future__ import annotations

import re
from typing import Any

from .seed_data import store


def _extract_amount(command: str) -> float | None:
    match = re.search(r"(\\d+(?:\\.\\d{1,2})?)", command)
    return float(match.group(1)) if match else None


def _find_next_dinner() -> dict[str, Any]:
    for slot in store.mess_schedule:
        if slot["meal"].lower() == "dinner":
            return slot
    return store.mess_schedule[-1]


def _format_currency(amount: float) -> str:
    return f"{store.roomtab['currency']} {amount:.2f}"


def get_dashboard_summary() -> dict[str, Any]:
    pending_tickets = sum(1 for ticket in store.fixit_tickets if ticket["status"] != "Resolved")
    arrived_parcels = sum(1 for parcel in store.parcels if parcel["picked_up"] is False)
    dinner = _find_next_dinner()

    return {
        "dinner_time": f"Dinner: {dinner['time']}",
        "fixit_pending": pending_tickets,
        "roomtab_balance": _format_currency(store.roomtab["net_balance"]),
        "parcel_arrived": arrived_parcels,
        "recent_activity": store.activity[:6],
    }


def get_messmate_schedule() -> dict[str, Any]:
    return {
        "period": "Current Weekly Plan",
        "slots": store.mess_schedule,
    }


def list_fixit_tickets() -> list[dict[str, Any]]:
    return store.fixit_tickets


def create_fixit_ticket(title: str) -> dict[str, Any]:
    store.ticket_counter += 1
    ticket_id = f"TKT-{store.ticket_counter}"
    ticket = {
        "id": ticket_id,
        "title": title,
        "assignee": "Pending Assignment",
        "status": "Received",
        "eta": "TBD",
    }
    store.fixit_tickets.insert(0, ticket)
    store.activity.insert(0, f"FixIt: {ticket_id} created.")
    return ticket


def get_roomtab_summary() -> dict[str, Any]:
    net = float(store.roomtab["net_balance"])
    return {
        "currency": store.roomtab["currency"],
        "net_balance": net,
        "you_are_owed": net if net > 0 else 0.0,
        "you_owe": abs(net) if net < 0 else 0.0,
        "expenses": store.roomtab["expenses"],
    }


def create_roomtab_expense(title: str, payer: str, total: float, share: float) -> dict[str, Any]:
    store.expense_counter += 1
    expense = {
        "id": f"EXP-{store.expense_counter}",
        "title": title,
        "payer": payer,
        "total": total,
        "share": share,
        "status": "Pending" if share < 0 else "Settled 1/1",
    }
    store.roomtab["expenses"].insert(0, expense)
    store.roomtab["net_balance"] += share
    store.activity.insert(0, f"RoomTab: expense {expense['id']} logged ({_format_currency(total)}).")
    return expense


def list_parcels() -> list[dict[str, Any]]:
    return store.parcels


def create_parcel(vendor: str, location: str, status: str, eta: str) -> dict[str, Any]:
    store.parcel_counter += 1
    parcel = {
        "id": f"PRC-{store.parcel_counter}",
        "vendor": vendor,
        "location": location,
        "status": status,
        "eta": eta,
        "picked_up": False,
    }
    store.parcels.insert(0, parcel)
    store.activity.insert(0, f"ParcelPing: {parcel['id']} logged at {location}.")
    return parcel


def pickup_parcel(parcel_id: str) -> dict[str, Any] | None:
    for parcel in store.parcels:
        if parcel["id"] == parcel_id:
            parcel["picked_up"] = True
            parcel["status"] = "PICKED UP"
            store.activity.insert(0, f"ParcelPing: {parcel_id} marked as picked up.")
            return parcel
    return None


def mess_status(_: str) -> str:
    dinner = _find_next_dinner()
    menu = ", ".join(dinner["menu"])
    message = f"Dinner at {dinner['time']}. Menu: {menu}."
    store.activity.insert(0, f"Bunky check: {message}")
    return message


def fixit_ticket_create(command: str) -> str:
    title = command.split("for", 1)[1].strip() if "for" in command.lower() else "Issue reported by resident"
    ticket = create_fixit_ticket(title)
    message = f"Created {ticket['id']} for '{title}'. Assigned status: {ticket['status']}."
    return message


def roomtab_log_expense(command: str) -> str:
    amount = _extract_amount(command)
    if amount is None:
        return "Could not detect amount. Try: roomtab add 250 for cleaning supplies"

    title = command.split("for", 1)[1].strip() if "for" in command.lower() else "Shared expense"
    create_roomtab_expense(title=title, payer="Self", total=amount, share=-amount)

    message = f"Logged expense {_format_currency(amount)} for '{title}'. Updated net balance: {_format_currency(store.roomtab['net_balance'])}."
    return message


def parcel_status(_: str) -> str:
    available = [parcel for parcel in store.parcels if parcel["picked_up"] is False]
    if not available:
        return "No parcels have arrived yet."

    latest = available[0]
    message = f"Parcel {latest['id']} is ready at {latest['location']}."
    store.activity.insert(0, f"ParcelPing: status check for {latest['id']}.")
    return message


def route_command(command: str) -> tuple[str, str, str]:
    normalized = command.strip().lower()
    if not normalized:
        fallback = "Empty command. Try mess status, fixit for <issue>, roomtab add <amount>, or parcel status."
        store.activity.insert(0, "Bunky: empty command received.")
        return "unknown", "unknown", fallback

    if any(word in normalized for word in ["mess", "meal", "menu"]):
        return "mess_status", "mess_status", mess_status(command)
    if any(word in normalized for word in ["fixit", "ticket", "repair", "maintenance"]):
        return "fixit_ticket_create", "fixit_ticket_create", fixit_ticket_create(command)
    if any(word in normalized for word in ["roomtab", "expense", "split", "pay"]):
        return "roomtab_log_expense", "roomtab_log_expense", roomtab_log_expense(command)
    if any(word in normalized for word in ["parcel", "package", "delivery"]):
        return "parcel_status", "parcel_status", parcel_status(command)

    fallback = "Unknown intent. Try commands for mess, fixit, roomtab, or parcel."
    store.activity.insert(0, "Bunky: unknown command received.")
    return "unknown", "unknown", fallback
