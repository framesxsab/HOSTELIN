import os
import tempfile
import unittest
from datetime import date as datetime_date

_tmp_db = tempfile.NamedTemporaryFile(prefix="hostelos-test-messmate-", suffix=".db", delete=False)
_tmp_db.close()
os.environ["HOSTELOS_DB_PATH"] = _tmp_db.name

from app.database import init_database
from app.services import get_messmate_schedule, skip_meal, unskip_meal

class MessMateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_database()
        pass

    @classmethod
    def tearDownClass(cls):
        try:
            os.remove(_tmp_db.name)
        except Exception:
            pass

    def test_dynamic_period(self):
        schedule = get_messmate_schedule()
        self.assertIn("To", schedule["period"])
        self.assertEqual(len(schedule["week"]), 7)
        self.assertEqual(len(schedule["slots"]), 3)

    def test_skip_and_unskip(self):
        today = datetime_date.today().isoformat()
        skip_res = skip_meal("Lunch", date_value=today)
        self.assertFalse(skip_res["already_skipped"])
        
        skip_res2 = skip_meal("Lunch", date_value=today)
        self.assertTrue(skip_res2["already_skipped"])
        
        unskip_res = unskip_meal("Lunch", date_value=today)
        self.assertTrue(unskip_res["was_skipped"])

if __name__ == "__main__":
    unittest.main()
