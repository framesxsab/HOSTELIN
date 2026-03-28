from __future__ import annotations

import math
import re
from datetime import date as datetime_date
from typing import Any

from .database import get_connection


MEAL_TIMES = {
    "Breakfast": "07:30 - 09:30",
    "Lunch": "12:30 - 14:00",
    "Dinner": "19:30 - 21:00",
}

MESSMATE_WEEKLY_MENU: list[dict[str, Any]] = [
    {
        "day": "Monday",
        "date": "16/03/26",
        "breakfast": ["चना पोहा"],
        "lunch": ["मोट", "दाल, चावल, रोटी"],
        "dinner": ["आलू रस्सा", "दाल तड़का, चावल, रोटी"],
    },
    {
        "day": "Tuesday",
        "date": "17/03/26",
        "breakfast": ["इडली सांबर"],
        "lunch": ["चोलाई", "दाल, चावल, रोटी"],
        "dinner": ["मेथी पराठा, राजमा", "दाल, चावल, ठेचा"],
    },
    {
        "day": "Wednesday",
        "date": "18/03/26",
        "breakfast": ["दाबेली"],
        "lunch": ["काला चना", "दाल, चावल, रोटी"],
        "dinner": ["पनीर", "दाल, चावल, रोटी"],
    },
    {
        "day": "Thursday",
        "date": "19/03/26",
        "breakfast": ["वडा सांभर"],
        "lunch": ["बैंग मसाला, पूरन पोली", "दाल, चावल, रोटी"],
        "dinner": ["पाव भाजी, फ्राइड राइस"],
    },
    {
        "day": "Friday",
        "date": "20/03/26",
        "breakfast": ["पोहा चिवडा"],
        "lunch": ["मोगर, मूंग", "चपकोड़े", "दाल, चावल, रोटी"],
        "dinner": ["छोले, दाल तड़का, ठेचा", "चावल, रोटी"],
    },
    {
        "day": "Saturday",
        "date": "21/03/26",
        "breakfast": ["साबूदाना"],
        "lunch": ["आलू मेथी", "दाल, चावल, रोटी"],
        "dinner": ["फूलगोभी, चावल, रोटी, दाल"],
    },
    {
        "day": "Sunday",
        "date": "22/03/26",
        "breakfast": ["आलू बड़ा, ठेचा"],
        "lunch": ["आलू रस्सा, पूरी, मसाला चावल, कढ़ी"],
        "dinner": ["दाल खिचड़ी"],
    },
]


def _extract_amount(command: str) -> float | None:
    match = re.search(r"(\d+(?:\.\d{1,2})?)", command)
    return float(match.group(1)) if match else None


def _extract_after_for(command: str, default: str) -> str:
    match = re.search(r"\bfor\b\s*(.+)", command, flags=re.IGNORECASE)
    if match and match.group(1).strip():
        return match.group(1).strip()
    return default


def _has_keyword_match(command: str, keywords: list[str]) -> bool:
    return any(re.search(rf"\b{re.escape(keyword)}\b", command) for keyword in keywords)


def _extract_meal_name(command: str) -> str | None:
    match = re.search(r"\b(breakfast|lunch|dinner)\b", command, flags=re.IGNORECASE)
    return match.group(1).lower() if match else None


def _meal_exists(meal: str) -> bool:
    return meal.lower() in {"breakfast", "lunch", "dinner"}


def _split_menu_cell(lines: list[str]) -> dict[str, list[str] | str]:
    if not lines:
        return {"title": "Unavailable", "menu": ["Unavailable"]}

    title = lines[0]
    menu = lines[1:] if len(lines) > 1 else []
    return {"title": title, "menu": menu}


def _get_weekly_menu() -> list[dict[str, Any]]:
    return [
        {
            "day": entry["day"],
            "date": entry["date"],
            "breakfast": {"items": entry["breakfast"]},
            "lunch": {"items": entry["lunch"]},
            "dinner": {"items": entry["dinner"]},
        }
        for entry in MESSMATE_WEEKLY_MENU
    ]


def _get_current_day_menu() -> dict[str, Any]:
    today_key = datetime_date.today().strftime("%d/%m/%y")
    weekday_key = datetime_date.today().strftime("%A").lower()

    for entry in MESSMATE_WEEKLY_MENU:
        if entry["date"] == today_key:
            return entry

    for entry in MESSMATE_WEEKLY_MENU:
        if entry["day"].lower() == weekday_key:
            return entry

    return MESSMATE_WEEKLY_MENU[0]


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
    current_day = _get_current_day_menu()
    dinner_cell = _split_menu_cell(current_day["dinner"])
    return {
        "meal": "Dinner",
        "time": MEAL_TIMES["Dinner"],
        "title": dinner_cell["title"],
        "menu": dinner_cell["menu"],
        "status": "ENFORCED",
    }


def get_dashboard_summary(user_id: str = "default_user") -> dict[str, Any]:
    selected_date = datetime_date.today().isoformat()
    with get_connection() as connection:
        pending_tickets = connection.execute(
            "SELECT COUNT(*) AS count FROM fixit_tickets WHERE status != 'Resolved'"
        ).fetchone()["count"]
        arrived_parcels = connection.execute(
            "SELECT COUNT(*) AS count FROM parcels WHERE picked_up = 0"
        ).fetchone()["count"]
        skipped_today = connection.execute(
            "SELECT COUNT(*) AS count FROM skipped_meals WHERE date = ? AND user_id = ?",
            (selected_date, user_id),
        ).fetchone()["count"]
        activity_rows = connection.execute(
            "SELECT message FROM activity_log ORDER BY id DESC LIMIT 6"
        ).fetchall()

    dinner = _find_next_dinner()

    return {
        "dinner_time": f"Dinner: {dinner['time']}",
        "mess_skipped_today": int(skipped_today),
        "fixit_pending": pending_tickets,
        "roomtab_balance": _format_currency(_net_balance()),
        "parcel_arrived": arrived_parcels,
        "recent_activity": [row["message"] for row in activity_rows],
    }


def list_activity_since(last_id: int, limit: int = 50) -> list[dict[str, Any]]:
    safe_limit = max(1, min(limit, 200))
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT id, message FROM activity_log WHERE id > ? ORDER BY id ASC LIMIT ?",
            (last_id, safe_limit),
        ).fetchall()

    return [{"id": int(row["id"]), "message": row["message"]} for row in rows]


def get_messmate_schedule(user_id: str = "default_user") -> dict[str, Any]:
    selected_date = datetime_date.today().isoformat()
    skipped_rows: list[dict[str, Any]]
    with get_connection() as connection:
        skipped_rows = connection.execute(
            "SELECT meal FROM skipped_meals WHERE date = ? AND user_id = ?",
            (selected_date, user_id),
        ).fetchall()

    skipped_meals = {str(row["meal"]).strip().lower() for row in skipped_rows}
    current_day = _get_current_day_menu()
    breakfast_cell = _split_menu_cell(current_day["breakfast"])
    lunch_cell = _split_menu_cell(current_day["lunch"])
    dinner_cell = _split_menu_cell(current_day["dinner"])

    return {
        "period": "16/03/26 To 22/03/26",
        "today_label": f"{current_day['day'].upper()} ({current_day['date']})",
        "slots": [
            {
                "meal": meal_name,
                "time": MEAL_TIMES[meal_name],
                "title": breakfast_cell["title"] if meal_name == "Breakfast" else lunch_cell["title"] if meal_name == "Lunch" else dinner_cell["title"],
                "menu": breakfast_cell["menu"] if meal_name == "Breakfast" else lunch_cell["menu"] if meal_name == "Lunch" else dinner_cell["menu"],
                "status": "ACTIVE" if meal_name == "Breakfast" else "ENFORCED",
                "skipped": meal_name.lower() in skipped_meals,
            }
            for meal_name in ["Breakfast", "Lunch", "Dinner"]
        ],
        "week": _get_weekly_menu(),
    }


def skip_meal(meal: str, date_value: str | None = None, user_id: str = "default_user") -> dict[str, Any]:
    clean_meal = meal.strip()
    if len(clean_meal) < 3:
        raise ValueError("Meal must be at least 3 characters")

    if date_value is None or not date_value.strip():
        selected_date = datetime_date.today().isoformat()
    else:
        selected_date = date_value.strip()
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", selected_date):
            raise ValueError("Date must be in YYYY-MM-DD format")

    normalized_meal = clean_meal.lower()
    if not _meal_exists(normalized_meal):
        raise ValueError("Meal must be one of the configured schedule slots (for example: Breakfast, Lunch, Dinner)")

    with get_connection() as connection:
        existing = connection.execute(
            "SELECT id FROM skipped_meals WHERE date = ? AND lower(meal) = ? AND user_id = ?",
            (selected_date, normalized_meal, user_id),
        ).fetchone()
        if existing is not None:
            return {
                "meal": clean_meal,
                "date": selected_date,
                "already_skipped": True,
                "message": f"{clean_meal.title()} already skipped for {selected_date}.",
            }

        connection.execute(
            "INSERT INTO skipped_meals (date, meal, user_id) VALUES (?, ?, ?)",
            (selected_date, clean_meal.title(), user_id),
        )
        connection.commit()

    _add_activity(f"MessMate: {clean_meal.title()} skipped for {selected_date}.", user_id)
    return {
        "meal": clean_meal.title(),
        "date": selected_date,
        "already_skipped": False,
        "message": f"{clean_meal.title()} skipped for {selected_date}.",
    }


def unskip_meal(meal: str, date_value: str | None = None, user_id: str = "default_user") -> dict[str, Any]:
    clean_meal = meal.strip()
    if len(clean_meal) < 3:
        raise ValueError("Meal must be at least 3 characters")

    if date_value is None or not date_value.strip():
        selected_date = datetime_date.today().isoformat()
    else:
        selected_date = date_value.strip()
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", selected_date):
            raise ValueError("Date must be in YYYY-MM-DD format")

    normalized_meal = clean_meal.lower()
    if not _meal_exists(normalized_meal):
        raise ValueError("Meal must be one of the configured schedule slots (for example: Breakfast, Lunch, Dinner)")

    with get_connection() as connection:
        existing = connection.execute(
            "SELECT id FROM skipped_meals WHERE date = ? AND lower(meal) = ? AND user_id = ?",
            (selected_date, normalized_meal, user_id),
        ).fetchone()
        if existing is None:
            return {
                "meal": clean_meal.title(),
                "date": selected_date,
                "was_skipped": False,
                "message": f"{clean_meal.title()} was not skipped for {selected_date}.",
            }

        connection.execute(
            "DELETE FROM skipped_meals WHERE date = ? AND lower(meal) = ? AND user_id = ?",
            (selected_date, normalized_meal, user_id),
        )
        connection.commit()

    _add_activity(f"MessMate: {clean_meal.title()} skip removed for {selected_date}.", user_id)
    return {
        "meal": clean_meal.title(),
        "date": selected_date,
        "was_skipped": True,
        "message": f"{clean_meal.title()} skip removed for {selected_date}.",
    }


def list_fixit_tickets() -> list[dict[str, Any]]:
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT id, title, assignee, status, eta FROM fixit_tickets ORDER BY created_at DESC, id DESC"
        ).fetchall()
    return [dict(row) for row in rows]


def _next_fixit_ticket_number() -> int:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT COALESCE(MAX(CAST(SUBSTR(id, 5) AS INTEGER)), 0) AS max_ticket FROM fixit_tickets WHERE id LIKE 'TKT-%'"
        ).fetchone()

    return int(row["max_ticket"]) + 1


def create_fixit_ticket(title: str, user_id: str = "default_user") -> dict[str, Any]:
    clean_title = title.strip()
    if len(clean_title) < 3:
        raise ValueError("Ticket title must be at least 3 characters")

    ticket_id = f"TKT-{_next_fixit_ticket_number()}"
    ticket = {
        "id": ticket_id,
        "title": clean_title,
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
    clean_title = title.strip()
    clean_payer = payer.strip()

    if len(clean_title) < 3:
        raise ValueError("Expense title must be at least 3 characters")
    if len(clean_payer) < 2:
        raise ValueError("Payer name must be at least 2 characters")
    if not math.isfinite(total) or not math.isfinite(share):
        raise ValueError("Total and share must be valid finite numbers")
    if total <= 0:
        raise ValueError("Total must be greater than zero")

    expense = {
        "id": f"EXP-{_next_counter('expense_counter')}",
        "title": clean_title,
        "payer": clean_payer,
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
    clean_vendor = vendor.strip()
    clean_location = location.strip()
    clean_status = status.strip()
    clean_eta = eta.strip()

    if len(clean_vendor) < 2:
        raise ValueError("Vendor must be at least 2 characters")
    if len(clean_location) < 2:
        raise ValueError("Location must be at least 2 characters")
    if len(clean_status) < 2:
        raise ValueError("Status must be at least 2 characters")
    if len(clean_eta) < 2:
        raise ValueError("ETA must be at least 2 characters")

    parcel = {
        "id": f"PRC-{_next_counter('parcel_counter')}",
        "vendor": clean_vendor,
        "location": clean_location,
        "status": clean_status,
        "eta": clean_eta,
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


def mess_skip_meal(command: str, user_id: str = "default_user") -> str:
    meal = _extract_meal_name(command)
    if meal is None:
        return "Could not detect meal name. Try: skip lunch"

    result = skip_meal(meal=meal, user_id=user_id)
    return result["message"]


def mess_unskip_meal(command: str, user_id: str = "default_user") -> str:
    meal = _extract_meal_name(command)
    if meal is None:
        return "Could not detect meal name. Try: unskip lunch"

    result = unskip_meal(meal=meal, user_id=user_id)
    return result["message"]


def fixit_ticket_create(command: str, user_id: str = "default_user") -> str:
    title = _extract_after_for(command, "Issue reported by resident")
    ticket = create_fixit_ticket(title, user_id=user_id)
    message = f"Created {ticket['id']} for '{title}'. Assigned status: {ticket['status']}."
    return message


def roomtab_log_expense(command: str, user_id: str = "default_user") -> str:
    amount = _extract_amount(command)
    if amount is None:
        return "Could not detect amount. Try: roomtab add 250 for cleaning supplies"

    title = _extract_after_for(command, "Shared expense")
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


def update_fixit_ticket(ticket_id: str, status: str | None = None, assignee: str | None = None, eta: str | None = None) -> dict[str, Any] | None:
    with get_connection() as connection:
        row = connection.execute("SELECT id, title, assignee, status, eta FROM fixit_tickets WHERE id = ?", (ticket_id,)).fetchone()
        if row is None:
            return None

        new_status = status if status else row["status"]
        new_assignee = assignee if assignee else row["assignee"]
        new_eta = eta if eta else row["eta"]

        connection.execute(
            "UPDATE fixit_tickets SET status = ?, assignee = ?, eta = ? WHERE id = ?",
            (new_status, new_assignee, new_eta, ticket_id),
        )
        connection.commit()

    return {"id": ticket_id, "title": row["title"], "assignee": new_assignee, "status": new_status, "eta": new_eta}


def update_parcel_admin(parcel_id: str, status: str | None = None, eta: str | None = None) -> dict[str, Any] | None:
    with get_connection() as connection:
        row = connection.execute("SELECT id, vendor, location, status, eta, picked_up FROM parcels WHERE id = ?", (parcel_id,)).fetchone()
        if row is None:
            return None

        new_status = status if status else row["status"]
        new_eta = eta if eta else row["eta"]

        connection.execute(
            "UPDATE parcels SET status = ?, eta = ?, updated_at = datetime('now') WHERE id = ?",
            (new_status, new_eta, parcel_id),
        )
        connection.commit()

    return {"id": parcel_id, "vendor": row["vendor"], "location": row["location"], "status": new_status, "eta": new_eta, "picked_up": bool(row["picked_up"])}


def update_weekly_menu(week_data: list[dict[str, Any]]) -> None:
    global MESSMATE_WEEKLY_MENU
    MESSMATE_WEEKLY_MENU = week_data


def rate_meal(meal: str, rating: int, date_value: str | None = None, user_id: str = "default_user") -> dict[str, Any]:
    clean_meal = meal.strip()
    if not _meal_exists(clean_meal.lower()):
        raise ValueError("Meal must be one of: Breakfast, Lunch, Dinner")
    if rating < 1 or rating > 5:
        raise ValueError("Rating must be between 1 and 5")

    if date_value is None or not date_value.strip():
        selected_date = datetime_date.today().isoformat()
    else:
        selected_date = date_value.strip()

    with get_connection() as connection:
        connection.execute(
            "INSERT OR REPLACE INTO meal_ratings (date, meal, user_id, rating, created_at) VALUES (?, ?, ?, ?, datetime('now'))",
            (selected_date, clean_meal.title(), user_id, rating),
        )
        connection.commit()

        stats = connection.execute(
            "SELECT AVG(rating) as avg_rating, COUNT(*) as total FROM meal_ratings WHERE date = ? AND meal = ?",
            (selected_date, clean_meal.title()),
        ).fetchone()

    _add_activity(f"MessMate: {clean_meal.title()} rated {rating}/5 for {selected_date}.", user_id)
    return {
        "meal": clean_meal.title(),
        "date": selected_date,
        "rating": rating,
        "average": round(float(stats["avg_rating"] or 0), 1),
        "total_ratings": int(stats["total"] or 0),
    }


def get_meal_ratings(date_value: str | None = None, user_id: str = "default_user") -> list[dict[str, Any]]:
    if date_value is None or not date_value.strip():
        selected_date = datetime_date.today().isoformat()
    else:
        selected_date = date_value.strip()

    results = []
    for meal_name in ["Breakfast", "Lunch", "Dinner"]:
        with get_connection() as connection:
            stats = connection.execute(
                "SELECT AVG(rating) as avg_rating, COUNT(*) as total FROM meal_ratings WHERE date = ? AND meal = ?",
                (selected_date, meal_name),
            ).fetchone()

            user_rating = connection.execute(
                "SELECT rating FROM meal_ratings WHERE date = ? AND meal = ? AND user_id = ?",
                (selected_date, meal_name, user_id),
            ).fetchone()

        results.append({
            "meal": meal_name,
            "date": selected_date,
            "rating": int(user_rating["rating"]) if user_rating else 0,
            "average": round(float(stats["avg_rating"] or 0), 1),
            "total_ratings": int(stats["total"] or 0),
        })

    return results


def route_command(command: str, user_id: str = "default_user") -> tuple[str, str, str]:
    normalized = command.strip().lower()
    if not normalized:
        fallback = "Empty command. Try mess status, skip lunch, fixit for <issue>, roomtab add <amount>, or parcel status."
        _add_activity("Bunky: empty command received.", user_id)
        return "unknown", "unknown", fallback

    if _has_keyword_match(normalized, ["unskip", "undo"]) and _has_keyword_match(normalized, ["meal", "breakfast", "lunch", "dinner"]):
        return "mess_unskip_meal", "mess_unskip_meal", mess_unskip_meal(command, user_id=user_id)
    if _has_keyword_match(normalized, ["skip", "skipping"]) and _has_keyword_match(normalized, ["meal", "breakfast", "lunch", "dinner"]):
        return "mess_skip_meal", "mess_skip_meal", mess_skip_meal(command, user_id=user_id)
    if _has_keyword_match(normalized, ["mess", "meal", "menu"]):
        return "mess_status", "mess_status", mess_status(command, user_id=user_id)
    if _has_keyword_match(normalized, ["fixit", "ticket", "repair", "maintenance"]):
        return "fixit_ticket_create", "fixit_ticket_create", fixit_ticket_create(command, user_id=user_id)
    if _has_keyword_match(normalized, ["roomtab", "expense", "split", "pay"]):
        return "roomtab_log_expense", "roomtab_log_expense", roomtab_log_expense(command, user_id=user_id)
    if _has_keyword_match(normalized, ["parcel", "package", "delivery"]):
        return "parcel_status", "parcel_status", parcel_status(command, user_id=user_id)

    fallback = "Unknown intent. Try commands for mess, skip meal, fixit, roomtab, or parcel."
    _add_activity("Bunky: unknown command received.", user_id)
    return "unknown", "unknown", fallback
