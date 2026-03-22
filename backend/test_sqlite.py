import sqlite3

def run():
    print(sqlite3.sqlite_version)
    conn = sqlite3.connect("hostelos.db")
    
    # Insert a dummy ticket
    conn.execute(
        "INSERT OR IGNORE INTO fixit_tickets (id, title, assignee, status, eta, created_by, created_at) "
        "VALUES ('TKT-999', 'Fake ticket', 'Nobody', 'Pending', 'TBD', 'user', datetime('now'))"
    )
    conn.commit()

    try:
        cursor = conn.execute("UPDATE fixit_tickets SET status = ? WHERE id = ? RETURNING *", ("Resolved", "TKT-999"))
        row = cursor.fetchone()
        conn.commit()
        print("Updated row:", row)
    except Exception as e:
        print("Error during update:", repr(e))

if __name__ == "__main__":
    run()
