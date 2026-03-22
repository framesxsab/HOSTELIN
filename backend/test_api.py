import requests
import sqlite3
import jwt
from datetime import datetime, timedelta

SECRET_KEY = "dummysecret"

# We first make the db the same
conn = sqlite3.connect("hostelos.db")
conn.execute("INSERT OR IGNORE INTO users (id, name, username, password_hash, role) VALUES ('ADMIN-1', 'Admin', 'myagent', 'hash', 'admin')")
conn.execute("INSERT OR IGNORE INTO fixit_tickets (id, title, assignee, status, eta, created_by, created_at) VALUES ('TKT-100', 'Broken Fan', 'None', 'Pending', 'TBD', 'user', 'today')")
conn.commit()

# generate a token exactly as auth.py would
payload = {"sub": "ADMIN-1", "role": "admin", "exp": datetime.utcnow() + timedelta(minutes=15)}
token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")

print("Token generated:", token)

res = requests.patch(
    "http://127.0.0.1:8000/api/admin/fixit/TKT-100",
    json={"status": "Resolved"},
    headers={"Authorization": f"Bearer {token}"}
)

print(res.status_code)
print(res.text)
