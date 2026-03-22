import os
import tempfile
import unittest

_tmp_db = tempfile.NamedTemporaryFile(prefix="hostelos-test-parcelping-", suffix=".db", delete=False)
_tmp_db.close()
os.environ["HOSTELOS_DB_PATH"] = _tmp_db.name

from app.database import init_database
from app.services import create_parcel, list_parcels, pickup_parcel, parcel_status

class ParcelPingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_database()

    @classmethod
    def tearDownClass(cls):
        try:
            os.remove(_tmp_db.name)
        except Exception:
            pass

    def test_create_and_pickup(self):
        parcel = create_parcel(vendor="Amazon", location="Gate 1", status="Arrived", eta="Now")
        self.assertEqual(parcel["vendor"], "Amazon")
        self.assertFalse(parcel["picked_up"])
        
        parcels = list_parcels()
        self.assertTrue(any(p["id"] == parcel["id"] for p in parcels))
        
        picked = pickup_parcel(parcel["id"])
        self.assertTrue(picked["picked_up"])

    def test_parcel_status_command(self):
        create_parcel(vendor="Flipkart", location="Gate 2", status="Arrived", eta="Soon")
        message = parcel_status("parcel status")
        self.assertIn("Gate 2", message)

if __name__ == "__main__":
    unittest.main()
