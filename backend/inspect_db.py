import os
import sqlite3
import requests
import time

def setup_db():
    conn = sqlite3.connect("hostelos.db")
    # Make sure we have the myagent user and a student user
    try:
        conn.execute("INSERT OR IGNORE INTO users (id, name, username, password_hash, role) VALUES ('U-001', 'Admin Agent', 'myagent', 'dummyhash', 'admin')")
        conn.execute("INSERT OR IGNORE INTO users (id, name, username, password_hash, role) VALUES ('U-002', 'Student Agent', 'student_1', 'dummyhash', 'student')")
        conn.commit()
    except Exception as e:
        print("DB setup error:", e)

    # Let's see what's in fixit_tickets
    rows = conn.execute("SELECT * FROM fixit_tickets").fetchall()
    print("Pre-existing tickets:", rows)
    conn.close()

if __name__ == "__main__":
    setup_db()
