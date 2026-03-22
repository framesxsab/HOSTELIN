import os
import tempfile
import unittest

_tmp_db = tempfile.NamedTemporaryFile(prefix="hostelos-test-roomtab-", suffix=".db", delete=False)
_tmp_db.close()
os.environ["HOSTELOS_DB_PATH"] = _tmp_db.name

from app.database import init_database
from app.services import create_roomtab_expense, get_roomtab_summary, roomtab_log_expense

class RoomTabTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_database()

    @classmethod
    def tearDownClass(cls):
        try:
            os.remove(_tmp_db.name)
        except Exception:
            pass

    def test_create_and_summary(self):
        expense = create_roomtab_expense(title="Groceries", payer="Alice", total=500, share=250)
        self.assertEqual(expense["title"], "Groceries")
        self.assertEqual(expense["payer"], "Alice")
        
        summary = get_roomtab_summary()
        self.assertTrue(len(summary["expenses"]) >= 1)
        self.assertEqual(summary["net_balance"], 250.0)

    def test_roomtab_log_expense_command(self):
        message = roomtab_log_expense("roomtab add 250 for cleaning supplies")
        self.assertIn("cleaning supplies", message)
        self.assertIn("250", message)

if __name__ == "__main__":
    unittest.main()
