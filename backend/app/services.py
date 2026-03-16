from __future__ import annotations

import json
import re
from typing import Any

from .database import get_connection


def _extract_amount(command: str) -> float | None:
    match = re.search(r"(\\d+(?:\\.\\d{1,2})?)", command)
    return float(match.group(1)) if match else None


def _get_state(key: str, default: str) -> str:
    with get_connection() as connection:
        row = connection.execute("SELECT value FROM app_state WHERE key = ?", (key,)).fetchone()
        if row is None:
            connection.execute("INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)", (key, default))
            connection.commit()
            return default
        return str(row["value"])


def _set_state(key: str, value: str) -> None:
    with get_connection() as connection:
        connection.execute("INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)", (key, value))
        connection.commit()


def _next_counter(key: str) -> int:
    current = int(_get_state(key, "0")) + 1
    _set_state(key, str(current))
    return current


def _currency() -> str:
    return _get_state("currency", "INR")


def _net_balance() -> float:
    return float(_get_state("net_balance", "0"))


def _set_net_balance(value: float) -> None:
    _set_state("net_balance", f"{value:.2f}")


def _format_currency(amount: float) -> str:
    return f"{_currency()} {amount:.2f}"


def _add_activity(message: str, user_id: str) -> None:
    with get_connection() as connection:
        connection.execute(
            "INSERT INTO activity_log (message, user_id, created_at) VALUES (?, ?, datetime('now'))",
            (message, user_id),
        )
        connection.commit()


def _find_next_dinner() -> dict[str, Any]:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT meal, time, title, menu_json, status FROM mess_schedule WHERE lower(meal) = 'dinner' LIMIT 1"
        ).fetchone()
        if row is None:
            row = connection.execute(
                "SELECT meal, time, title, menu_json, status FROM mess_schedule ORDER BY id DESC LIMIT 1"
            ).fetchone()
            if row is None:
                return {
                    "meal": "Dinner",
                    "time": "--",
                    "title": "Dinner",
                    "menu": ["Unavailable"],
                    "status": "UNKNOWN",
                }

        return {
            "meal": row["meal"],
            "time": row["time"],
            "title": row["title"],
            "menu": json.loads(row["menu_json"]),
            "status": row["status"],
        }


def get_dashboard_summary() -> dict[str, Any]:
    with get_connection() as connection:
        pending_tickets = connection.execute(
            "SELECT COUNT(*) AS count FROM fixit_tickets WHERE status != 'Resolved'"
        ).fetchone()["count"]
        arrived_parcels = connection.execute(
            "SELECT COUNT(*) AS count FROM parcels WHERE picked_up = 0"
        ).fetchone()["count"]
        activity_rows = connection.execute(
            "SELECT message FROM activity_log ORDER BY id DESC LIMIT 6"
        ).fetchall()

    dinner = _find_next_dinner()

    return {
        "dinner_time": f"Dinner: {dinner['time']}",
        "fixit_pending": pending_tickets,
        "roomtab_balance": _format_currency(_net_balance()),
        "parcel_arrived": arrived_parcels,
        "recent_activity": [row["message"] for row in activity_rows],
    }


def get_messmate_schedule() -> dict[str, Any]:
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT meal, time, title, menu_json, status FROM mess_schedule ORDER BY id ASC"
        ).fetchall()

    return {
        "period": "Current Weekly Plan",
        "slots": [
            {
                "meal": row["meal"],
                "time": row["time"],
                "title": row["title"],
                "menu": json.loads(row["menu_json"]),
                "status": row["status"],
            }
            for row in rows
        ],
    }


def list_fixit_tickets() -> list[dict[str, Any]]:
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT id, title, assignee, status, eta FROM fixit_tickets ORDER BY created_at DESC, id DESC"
        ).fetchall()
    return [dict(row) for row in rows]


def create_fixit_ticket(title: str, user_id: str = "default_user") -> dict[str, Any]:
    ticket_id = f"TKT-{_next_counter('ticket_counter')}"
    ticket = {
        "id": ticket_id,
        "title": title,
        "assignee": "Pending Assignment",
        "status": "Received",
        "eta": "TBD",
    }

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO fixit_tickets (id, title, assignee, status, eta, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            """,
            (ticket["id"], ticket["title"], ticket["assignee"], ticket["status"], ticket["eta"], user_id),
        )
        connection.commit()

    _add_activity(f"FixIt: {ticket_id} created.", user_id)
    return ticket


def get_roomtab_summary() -> dict[str, Any]:
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT id, title, payer, total, share, status FROM roomtab_expenses ORDER BY created_at DESC, id DESC"
        ).fetchall()

    net = _net_balance()
    currency = _currency()
    return {
        "currency": currency,
        "net_balance": net,
        "you_are_owed": net if net > 0 else 0.0,
        "you_owe": abs(net) if net < 0 else 0.0,
        "expenses": [dict(row) for row in rows],
    }


def create_roomtab_expense(title: str, payer: str, total: float, share: float, user_id: str = "default_user") -> dict[str, Any]:
    if total <= 0:
        raise ValueError("Total must be greater than zero")

    expense = {
        "id": f"EXP-{_next_counter('expense_counter')}",
        "title": title,
        "payer": payer,
        "total": total,
        "share": share,
        "status": "Pending" if share < 0 else "Settled 1/1",
    }

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO roomtab_expenses (id, title, payer, total, share, status, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
            """,
            (expense["id"], expense["title"], expense["payer"], expense["total"], expense["share"], expense["status"], user_id),
        )
        connection.commit()

    updated_balance = _net_balance() + share
    _set_net_balance(updated_balance)
    _add_activity(f"RoomTab: expense {expense['id']} logged ({_format_currency(total)}).", user_id)
    return expense


def list_parcels() -> list[dict[str, Any]]:
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT id, vendor, location, status, eta, picked_up FROM parcels ORDER BY created_at DESC, id DESC"
        ).fetchall()

    return [
        {
            "id": row["id"],
            "vendor": row["vendor"],
            "location": row["location"],
            "status": row["status"],
            "eta": row["eta"],
            "picked_up": bool(row["picked_up"]),
        }
        for row in rows
    ]


def create_parcel(vendor: str, location: str, status: str, eta: str, user_id: str = "default_user") -> dict[str, Any]:
    parcel = {
        "id": f"PRC-{_next_counter('parcel_counter')}",
        "vendor": vendor,
        "location": location,
        "status": status,
        "eta": eta,
        "picked_up": False,
    }

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO parcels (id, vendor, location, status, eta, picked_up, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            """,
            (parcel["id"], parcel["vendor"], parcel["location"], parcel["status"], parcel["eta"], 0, user_id),
        )
        connection.commit()

    _add_activity(f"ParcelPing: {parcel['id']} logged at {location}.", user_id)
    return parcel


def pickup_parcel(parcel_id: str, user_id: str = "default_user") -> dict[str, Any] | None:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT id, vendor, location, status, eta, picked_up FROM parcels WHERE id = ?",
            (parcel_id,),
        ).fetchone()
        if row is None:
            return None

        connection.execute(
            "UPDATE parcels SET picked_up = 1, status = 'PICKED UP', updated_at = datetime('now') WHERE id = ?",
            (parcel_id,),
        )
        connection.commit()

    _add_activity(f"ParcelPing: {parcel_id} marked as picked up.", user_id)
    return {
        "id": row["id"],
        "vendor": row["vendor"],
        "location": row["location"],
        "status": "PICKED UP",
        "eta": row["eta"],
        "picked_up": True,
    }


def mess_status(_: str, user_id: str = "default_user") -> str:
    dinner = _find_next_dinner()
    menu = ", ".join(dinner["menu"])
    message = f"Dinner at {dinner['time']}. Menu: {menu}."
    _add_activity(f"Bunky check: {message}", user_id)
    return message


def fixit_ticket_create(command: str, user_id: str = "default_user") -> str:
    title = command.split("for", 1)[1].strip() if "for" in command.lower() else "Issue reported by resident"
    ticket = create_fixit_ticket(title, user_id=user_id)
    message = f"Created {ticket['id']} for '{title}'. Assigned status: {ticket['status']}."
    return message


def roomtab_log_expense(command: str, user_id: str = "default_user") -> str:
    amount = _extract_amount(command)
    if amount is None:
        return "Could not detect amount. Try: roomtab add 250 for cleaning supplies"

    title = command.split("for", 1)[1].strip() if "for" in command.lower() else "Shared expense"
    create_roomtab_expense(title=title, payer="Self", total=amount, share=-amount, user_id=user_id)

    message = f"Logged expense {_format_currency(amount)} for '{title}'. Updated net balance: {_format_currency(_net_balance())}."
    return message


def parcel_status(_: str, user_id: str = "default_user") -> str:
    available = [parcel for parcel in list_parcels() if parcel["picked_up"] is False]
    if not available:
        return "No parcels have arrived yet."

    latest = available[0]
    message = f"Parcel {latest['id']} is ready at {latest['location']}."
    _add_activity(f"ParcelPing: status check for {latest['id']}.", user_id)
    return message


def route_command(command: str, user_id: str = "default_user") -> tuple[str, str, str]:
    normalized = command.strip().lower()
    if not normalized:
        fallback = "Empty command. Try mess status, fixit for <issue>, roomtab add <amount>, or parcel status."
        _add_activity("Bunky: empty command received.", user_id)
        return "unknown", "unknown", fallback

    if any(word in normalized for word in ["mess", "meal", "menu"]):
        return "mess_status", "mess_status", mess_status(command, user_id=user_id)
    if any(word in normalized for word in ["fixit", "ticket", "repair", "maintenance"]):
        return "fixit_ticket_create", "fixit_ticket_create", fixit_ticket_create(command, user_id=user_id)
    if any(word in normalized for word in ["roomtab", "expense", "split", "pay"]):
        return "roomtab_log_expense", "roomtab_log_expense", roomtab_log_expense(command, user_id=user_id)
    if any(word in normalized for word in ["parcel", "package", "delivery"]):
        return "parcel_status", "parcel_status", parcel_status(command, user_id=user_id)

    fallback = "Unknown intent. Try commands for mess, fixit, roomtab, or parcel."
    _add_activity("Bunky: unknown command received.", user_id)
    return "unknown", "unknown", fallback
