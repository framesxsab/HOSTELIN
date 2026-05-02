import os
import tempfile
import unittest
from unittest.mock import patch, MagicMock

# Configure isolated database path before importing app modules.
_tmp_db = tempfile.NamedTemporaryFile(prefix="hostelos-test-", suffix=".db", delete=False)
_tmp_db.close()
os.environ["HOSTELOS_DB_PATH"] = _tmp_db.name

from app.database import init_database  # noqa: E402
from app.main import health  # noqa: E402
from app.services import create_fixit_ticket  # noqa: E402
from app.services import get_messmate_schedule  # noqa: E402
from app.services import route_command  # noqa: E402


class BackendSmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_database()

    @classmethod
    def tearDownClass(cls):
        try:
            os.remove(_tmp_db.name)
        except (FileNotFoundError, PermissionError):
            pass

    def test_health_payload_shape(self):
        payload = health()
        self.assertEqual(payload.get("status"), "ok")
        self.assertIn("service", payload)
        self.assertIn("version", payload)
        self.assertIn("uptime_seconds", payload)
        self.assertIn("db_path", payload)
        self.assertIn("db_exists", payload)

    def test_missing_api_key_fallback(self):
        # Temporarily unset GEMINI_API_KEY
        original_key = os.environ.get("GEMINI_API_KEY")
        if "GEMINI_API_KEY" in os.environ:
            del os.environ["GEMINI_API_KEY"]
            
        try:
            intent, tool, message = route_command("skip lunch")
            self.assertEqual(intent, "error")
            self.assertTrue("GEMINI_API_KEY is not set" in message)
        finally:
            if original_key is not None:
                os.environ["GEMINI_API_KEY"] = original_key
    def test_messmate_schedule_shape(self):
        payload = get_messmate_schedule()
        self.assertEqual(payload.get("period"), "16/03/26 To 22/03/26")
        self.assertIn("today_label", payload)
        self.assertEqual(len(payload.get("slots", [])), 3)
        self.assertEqual(len(payload.get("week", [])), 7)

    def test_fixit_ticket_ids_start_at_one(self):
        first_ticket = create_fixit_ticket("Broken fan in room 14")
        second_ticket = create_fixit_ticket("Leaking tap in wash area")

        self.assertEqual(first_ticket["id"], "TKT-1")
        self.assertEqual(second_ticket["id"], "TKT-2")


if __name__ == "__main__":
    unittest.main()
