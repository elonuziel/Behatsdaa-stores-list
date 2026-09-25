#!/usr/bin/env python3
"""
Unit and integration tests for scrape_beplus.py and data/billing_stores.json.
"""

import json
import csv
import unittest
from pathlib import Path
import sys

# Add root directory to sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from scrape_beplus import clean_html_text, clean_hebrew_name, parse_business_item

DATA_DIR = ROOT_DIR / "data"


class TestScrapeBePlus(unittest.TestCase):

    def test_clean_html_text(self):
        raw = "<p>מבצע מיוחד &quot;שובר הנחה&quot; &nbsp; לכל הסניפים!</p>"
        cleaned = clean_html_text(raw)
        self.assertEqual(cleaned, 'מבצע מיוחד "שובר הנחה" לכל הסניפים!')

        # Empty / None
        self.assertEqual(clean_html_text(""), "")
        self.assertEqual(clean_html_text(None), "")

        # Multiple whitespace & newlines
        raw2 = "<div>חנות   צעצועים\n\n  ומשחקים  </div>"
        self.assertEqual(clean_html_text(raw2), "חנות צעצועים ומשחקים")

    def test_clean_hebrew_name(self):
        raw = "  אופיס   דיפו &amp; Co  "
        cleaned = clean_hebrew_name(raw)
        self.assertEqual(cleaned, "אופיס דיפו & Co")

    def test_parse_business_item(self):
        cat_lookup = {
            36: {'id': 36, 'name': 'אופנה', 'parent_id': 0, 'top_name': 'אופנה', 'sub_name': ''},
            37: {'id': 37, 'name': 'הלבשת נשים', 'parent_id': 36, 'top_name': 'אופנה', 'sub_name': 'הלבשת נשים'}
        }
        raw_item = {
            "id": 12345,
            "model": "רשת אופנה ישראלית",
            "city": "תל אביב - יפו",
            "address": "דיזנגוף 50",
            "free_text": "<p>הנחה <b>בלעדית</b> על כל הקולקציה</p>",
            "price": 7.5,
            "cat_id": 37,
            "icon": "icon123.jpg"
        }

        parsed = parse_business_item(raw_item, cat_lookup)
        self.assertEqual(parsed["id"], 12345)
        self.assertEqual(parsed["name"], "רשת אופנה ישראלית")
        self.assertEqual(parsed["discount"], 7.5)
        self.assertEqual(parsed["city"], "תל אביב - יפו")
        self.assertEqual(parsed["address"], "דיזנגוף 50")
        self.assertEqual(parsed["category"], "אופנה")
        self.assertEqual(parsed["subcategory"], "הלבשת נשים")
        self.assertEqual(parsed["description"], "הנחה בלעדית על כל הקולקציה")
        self.assertIn("icon123.jpg", parsed["logo"])
        self.assertIn("12345", parsed["detail_url"])

    def test_billing_stores_json_integrity(self):
        json_path = DATA_DIR / "billing_stores.json"
        self.assertTrue(json_path.exists(), "data/billing_stores.json must exist")

        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        self.assertIn("metadata", data)
        self.assertIn("stores", data)
        stores = data["stores"]
        self.assertGreater(len(stores), 5000, "Be-Plus should have 5,000+ businesses")

        # Validate structure of each store
        required_keys = {"id", "name", "discount", "city", "address", "category", "description"}
        for s in stores[:100]:  # check sample
            for k in required_keys:
                self.assertIn(k, s, f"Store missing key {k}: {s}")
            self.assertIsInstance(s["discount"], (int, float))
            self.assertGreaterEqual(s["discount"], 0)

    def test_billing_stores_csv_integrity(self):
        csv_path = DATA_DIR / "billing_stores.csv"
        self.assertTrue(csv_path.exists(), "data/billing_stores.csv must exist")

        with open(csv_path, "r", encoding="utf-8-sig") as f:
            reader = csv.reader(f)
            rows = list(reader)

        self.assertGreater(len(rows), 5000, "CSV should contain > 5000 rows")
        headers = rows[0]
        self.assertIn("name", headers)
        self.assertIn("discount", headers)
        self.assertIn("city", headers)


if __name__ == "__main__":
    unittest.main()
