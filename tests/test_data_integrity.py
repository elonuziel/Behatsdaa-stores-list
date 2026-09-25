#!/usr/bin/env python3
"""
Data integrity and schema tests for data/stores.json and data/deals.json.
Ensures valid JSON, required fields, and correct cross-linking.
"""

import json
import csv
import unittest
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


class TestDataIntegrity(unittest.TestCase):

    def test_stores_json_integrity(self):
        json_path = DATA_DIR / "stores.json"
        self.assertTrue(json_path.exists(), "data/stores.json must exist")

        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        self.assertIn("metadata", data)
        self.assertIn("stores", data)
        stores = data["stores"]
        self.assertGreater(len(stores), 0, "stores.json must contain stores")

        for s in stores:
            self.assertTrue(s.get("id"), f"Store missing id: {s}")
            self.assertTrue(s.get("name"), f"Store missing name: {s}")
            self.assertIn("cards", s, f"Store missing cards list: {s.get('name')}")
            self.assertIsInstance(s["cards"], list)

    def test_deals_json_integrity(self):
        json_path = DATA_DIR / "deals.json"
        self.assertTrue(json_path.exists(), "data/deals.json must exist")

        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        self.assertIn("metadata", data)
        self.assertIn("deals", data)
        deals = data["deals"]
        self.assertGreater(len(deals), 0, "deals.json must contain deals")

        for d in deals:
            self.assertTrue(d.get("id"), f"Deal missing id: {d}")
            self.assertTrue(d.get("title"), f"Deal missing title: {d}")
            self.assertIn("price", d, f"Deal missing price: {d.get('title')}")
            self.assertGreaterEqual(d["price"], 0)
            self.assertIn("discount_percent", d)
            self.assertGreaterEqual(d["discount_percent"], 0)
            self.assertLessEqual(d["discount_percent"], 100)
            self.assertTrue(d.get("url"), f"Deal missing url: {d.get('title')}")

    def test_deals_csv_integrity(self):
        csv_path = DATA_DIR / "deals.csv"
        self.assertTrue(csv_path.exists(), "data/deals.csv must exist")

        with open(csv_path, "r", encoding="utf-8-sig") as f:
            reader = csv.reader(f)
            rows = list(reader)

        self.assertGreater(len(rows), 1, "deals.csv must have header and at least one row")
        headers = rows[0]
        self.assertIn("מזהה", headers)
        self.assertIn("שם המוצר / שובר", headers)
        self.assertIn("מחיר בהצדעה ₪", headers)

    def test_cross_linking_with_stores(self):
        with open(DATA_DIR / "stores.json", "r", encoding="utf-8") as f:
            stores = json.load(f)["stores"]
        store_names = {s["name"] for s in stores}

        with open(DATA_DIR / "deals.json", "r", encoding="utf-8") as f:
            deals = json.load(f)["deals"]

        # Check that matched store names in deals are actually present in stores.json
        matched_count = 0
        for d in deals:
            if d.get("matched_store_name"):
                self.assertIn(d["matched_store_name"], store_names)
                matched_count += 1

        self.assertGreater(matched_count, 0, "At least some deals should link to known stores (e.g. אצה, ורדינון)")


if __name__ == "__main__":
    unittest.main()
