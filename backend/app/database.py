from __future__ import annotations

import os
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = Path(os.getenv("HOSTELOS_DB_PATH", BASE_DIR / "hostelos.db"))
MIGRATIONS_DIR = BASE_DIR / "migrations"


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH, check_same_thread=False)
    connection.row_factory = sqlite3.Row
    return connection


def apply_migrations() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    with get_connection() as connection:
        for migration in sorted(MIGRATIONS_DIR.glob("*.sql")):
            connection.executescript(migration.read_text(encoding="utf-8"))


def init_database() -> None:
    apply_migrations()

    from .seed_data import seed_if_empty

    with get_connection() as connection:
        seed_if_empty(connection)
