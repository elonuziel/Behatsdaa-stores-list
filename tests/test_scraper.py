#!/usr/bin/env python3
"""
Unit tests for Behatsdaa scraper logic, deals parsing, and catalog persistence.
"""

import os
import sys
import json
import csv
import tempfile
import unittest
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scraper import (
    parse_arguments,
    extract_discount_percent,
    generate_store_id,
    parse_chains_from_categories,
    merge_stores_into_catalog,
    parse_deal,
    save_catalog,
    save_deals
)


class TestScraperLogic(unittest.TestCase):

    def test_extract_discount_percent(self):
        self.assertEqual(extract_discount_percent("20%"), 20)
        self.assertEqual(extract_discount_percent("עד 30% הנחה"), 30)
        self.assertEqual(extract_discount_percent("15.5%"), 15)
        self.assertEqual(extract_discount_percent(25), 25)
        self.assertEqual(extract_discount_percent("ללא הנחה"), 0)
        self.assertEqual(extract_discount_percent(None), 0)

    def test_generate_store_id(self):
        self.assertEqual(generate_store_id("שופרסל דיל"), "שופרסל-דיל")
        self.assertEqual(generate_store_id("Fox & Co."), "fox-co")
        self.assertEqual(generate_store_id("", 5), "store-5")

    def test_parse_deal_with_variants(self):
        raw_deal = {
            "categoryId": "18402",
            "categoryName": "שואב שוטף אלחוטי Dreame G10 Pro - יבואן רשמי",
            "supplierName": "Dreame",
            "category": "מוצרי חשמל לבית",
            "sourceTags": ["מבצעי צרכנות לחג", "הכי משתלם"],
            "image": "https://example.com/dreame.jpg",
            "price": 679,
            "discount": 999,
            "locations": [{"address": "סניף תל אביב"}],
            "description": "שואב מעולה",
            "termsOfUse": "משלוח חינם",
            "variants": [
                {
                    "id": "v-1",
                    "name": "דגם G10 Pro",
                    "price": 679,
                    "discount": 999,
                    "barCode": "123456789",
                    "outofStock": False
                }
            ]
        }

        stores_catalog = {
            "Dreame Official": {"id": "dreame-official", "name": "Dreame Official"}
        }

        deal = parse_deal(raw_deal, stores_catalog)
        self.assertEqual(deal["id"], "18402")
        self.assertEqual(deal["title"], "שואב שוטף אלחוטי Dreame G10 Pro - יבואן רשמי")
        self.assertEqual(deal["supplier"], "Dreame")
        self.assertEqual(deal["price"], 679.0)
        self.assertEqual(deal["original_price"], 999.0)
        self.assertEqual(deal["discount_percent"], 32)
        self.assertTrue(deal["shipping_included"])
        self.assertEqual(deal["matched_store_id"], "dreame-official")
        self.assertEqual(len(deal["variants"]), 1)
        self.assertEqual(deal["variants"][0]["barcode"], "123456789")

    def test_parse_deal_supplier_fallback_from_title(self):
        raw_deal = {
            "categoryId": "9999",
            "categoryName": "6 ליטר שמן זית מבית 'משק אחיה'",
            "supplierName": "",  # Empty on purpose
            "price": 276,
            "discount": 390
        }
        deal = parse_deal(raw_deal)
        self.assertEqual(deal["supplier"], "משק אחיה")
        self.assertEqual(deal["discount_percent"], 29)

    def test_save_and_read_deals(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            sample_deal = {
                "id": "1001",
                "category_id": "1001",
                "title": "שובר אצה 150 ₪",
                "supplier": "אצה",
                "category": "קולינריה",
                "tags": ["מבצעי חג"],
                "image": "https://example.com/atza.jpg",
                "url": "https://www.behatsdaa.org.il/category/productPage/1001",
                "price": 105.0,
                "original_price": 150.0,
                "discount_percent": 30,
                "locations": "מגוון סניפים",
                "shipping_included": False,
                "expiration_date": "2026-12-31",
                "limits": "עד 5 ללקוח",
                "description": "שובר כספי לאצה",
                "terms_of_use": "בישיבה במסעדה",
                "variants": [],
                "matched_store_id": "אצה",
                "matched_store_name": "אצה"
            }

            save_deals([sample_deal], [{"id": 1, "name": "מבצעי חג"}], tmp_dir, "https://example.com")

            json_file = Path(tmp_dir) / "deals.json"
            csv_file = Path(tmp_dir) / "deals.csv"

            self.assertTrue(json_file.exists())
            self.assertTrue(csv_file.exists())

            with open(json_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                self.assertEqual(data["metadata"]["total_deals"], 1)
                self.assertEqual(data["deals"][0]["title"], "שובר אצה 150 ₪")

            with open(csv_file, "r", encoding="utf-8-sig") as f:
                reader = csv.reader(f)
                rows = list(reader)
                self.assertEqual(len(rows), 2)  # Header + 1 row
                self.assertIn("שובר אצה 150 ₪", rows[1])

    def test_fetch_wallets_via_evaluate(self):
        from unittest.mock import MagicMock
        from scraper import fetch_wallets_via_evaluate

        mock_page = MagicMock()
        mock_page.evaluate.return_value = {
            "ok": True,
            "results": [
                {
                    "wallet": {"walletID": "101", "walletName": "Test Wallet"},
                    "categories": [{"tagName": "כללי", "walletChainData": []}]
                }
            ]
        }

        res = fetch_wallets_via_evaluate(mock_page)

        mock_page.evaluate.assert_called_once()
        js_code = mock_page.evaluate.call_args[0][0]
        self.assertIn("Promise.all", js_code)
        self.assertIn("GetWalletChain", js_code)
        self.assertTrue(res["ok"])
        self.assertEqual(len(res["results"]), 1)


if __name__ == "__main__":
    unittest.main()
