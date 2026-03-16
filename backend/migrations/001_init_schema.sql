PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mess_schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meal TEXT NOT NULL,
    time TEXT NOT NULL,
    title TEXT NOT NULL,
    menu_json TEXT NOT NULL,
    status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fixit_tickets (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    assignee TEXT NOT NULL,
    status TEXT NOT NULL,
    eta TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS roomtab_expenses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    payer TEXT NOT NULL,
    total REAL NOT NULL,
    share REAL NOT NULL,
    status TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS parcels (
    id TEXT PRIMARY KEY,
    vendor TEXT NOT NULL,
    location TEXT NOT NULL,
    status TEXT NOT NULL,
    eta TEXT NOT NULL,
    picked_up INTEGER NOT NULL DEFAULT 0,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fixit_status ON fixit_tickets(status);
CREATE INDEX IF NOT EXISTS idx_parcels_pickup ON parcels(picked_up);
CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity_log(created_at DESC);
