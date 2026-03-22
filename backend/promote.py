import sqlite3
import os

db_path = os.environ.get("HOSTELOS_DB_PATH", "hostelos.db")
conn = sqlite3.connect(db_path)
conn.execute("UPDATE users SET role='admin' WHERE username='myagent'")
print(f"Rows updated: {conn.total_changes}")
conn.commit()
conn.close()
