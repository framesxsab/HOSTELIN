DROP TABLE IF EXISTS mess_schedule;
CREATE TABLE mess_schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day_of_week TEXT NOT NULL,
    meal TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    title TEXT NOT NULL,
    menu_json TEXT NOT NULL,
    status TEXT NOT NULL,
    UNIQUE(day_of_week, meal)
);
