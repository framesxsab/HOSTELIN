from __future__ import annotations

import json
import sqlite3


def seed_if_empty(connection: sqlite3.Connection) -> None:
    existing = connection.execute("SELECT COUNT(*) AS count FROM mess_schedule").fetchone()["count"]
    if existing > 0:
        return

    connection.execute("INSERT OR IGNORE INTO users (id, name) VALUES (?, ?)", ("default_user", "Default User"))

    connection.executemany(
        """
        INSERT INTO app_state (key, value) VALUES (?, ?)
        """,
        [
            ("currency", "INR"),
            ("net_balance", "4500"),
            ("ticket_counter", "4500"),
            ("expense_counter", "3200"),
            ("parcel_counter", "9000"),
        ],
    )

    connection.executemany(
        """
        INSERT INTO mess_schedule (meal, time, title, menu_json, status)
        VALUES (?, ?, ?, ?, ?)
        """,
        [
            ("Breakfast", "07:30 - 09:30", "Breakfast_Matrix", json.dumps(["Steel-cut Oats", "Berries", "Whey"]), "ACTIVE"),
            ("Lunch", "12:30 - 14:00", "Lunch_Operational", json.dumps(["Miso Salmon", "Quinoa", "Kale"]), "ENFORCED"),
            ("Dinner", "19:30 - 21:00", "Dinner_Protocol", json.dumps(["Paneer Butter Masala", "Jeera Rice", "Salad"]), "ENFORCED"),
        ],
    )

    connection.executemany(
        """
        INSERT INTO fixit_tickets (id, title, assignee, status, eta, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        """,
        [
            ("TKT-4402", "Bathroom Faucet Leak - Room 304", "Marco Rossi", "In Progress", "24m", "default_user"),
            ("TKT-4405", "Faulty Power Outlet - Common Area", "Elena Petrov", "Assigned", "1h 15m", "default_user"),
            ("TKT-4412", "AC Unit Making Noise - Dorm 12", "Pending Assignment", "Received", "TBD", "default_user"),
        ],
    )

    connection.executemany(
        """
        INSERT INTO roomtab_expenses (id, title, payer, total, share, status, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        """,
        [
            ("EXP-3101", "Late Night Pizza // Domino's", "Self", 60.0, 45.0, "Settled 3/4", "default_user"),
            ("EXP-3102", "Internet Bill // Starlink", "Rahul M.", 130.0, -32.5, "Pending", "default_user"),
            ("EXP-3103", "Weekly Groceries // Whole Foods", "Sarah K.", 288.0, -96.0, "Pending", "default_user"),
        ],
    )

    connection.executemany(
        """
        INSERT INTO parcels (id, vendor, location, status, eta, picked_up, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        """,
        [
            ("AMZ-4491", "Amazon Logistics", "Locker #402", "READY FOR PICKUP", "14m at Gate", 0, "default_user"),
            ("ZOM-8821", "Zomato Fresh", "Main Desk - Gate B", "EXPIRING SOON", "4h 12m at Gate", 0, "default_user"),
        ],
    )

    connection.executemany(
        """
        INSERT INTO activity_log (message, user_id, created_at)
        VALUES (?, ?, datetime('now'))
        """,
        [
            ("Parcel #AMZ-4491 logged at Locker #402.", "default_user"),
            ("MessMate dinner menu published.", "default_user"),
        ],
    )

    connection.commit()
