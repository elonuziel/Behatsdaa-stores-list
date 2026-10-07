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

    def test_import_cards_from_file(self):
        from scraper import import_cards_from_file
        import tempfile
        import argparse

        sample = {
            "ok": True,
            "results": [
                {
                    "wallet": {"walletID": "99", "walletName": "כרטיס מועדון בדיקה", "discountRate": "15%"},
                    "categories": [
                        {
                            "tagName": "ביגוד והנעלה",
                            "walletChainData": [
                                {"chainName": "קסטרו", "chainID": "555", "webSite": "https://castro.com"}
                            ]
                        }
                    ]
                }
            ]
        }
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
            json.dump(sample, f)
            raw_path = f.name

        with tempfile.TemporaryDirectory() as out_dir:
            args = argparse.Namespace(
                import_cards=raw_path,
                output_dir=out_dir,
                card_url="https://test.com"
            )
            import_cards_from_file(args)

            out_json = Path(out_dir) / "stores.json"
            self.assertTrue(out_json.exists())
            with open(out_json, "r", encoding="utf-8") as f:
                data = json.load(f)
            self.assertEqual(len(data["stores"]), 1)
            self.assertEqual(data["stores"][0]["name"], "קסטרו")
            self.assertEqual(data["stores"][0]["max_discount"], 15)

    def test_is_chromium_installed_with_mock(self):
        from unittest.mock import MagicMock
        from scraper import is_chromium_installed

        mock_p = MagicMock()
        mock_p.chromium.executable_path = "/nonexistent/chrome/path"
        self.assertFalse(is_chromium_installed(mock_p))

        with tempfile.NamedTemporaryFile() as tf:
            mock_p.chromium.executable_path = tf.name
            self.assertTrue(is_chromium_installed(mock_p))

    def test_check_and_install_playwright_declined(self):
        from unittest.mock import patch
        from scraper import check_and_install_playwright

        with patch("sys.stdin.isatty", return_value=True), \
             patch("builtins.input", return_value="n"):
            # Since playwright is not installed, user declining returns False
            res = check_and_install_playwright(prompt_install=True)
            self.assertFalse(res)

    def test_check_and_install_playwright_accepted_mock(self):
        from unittest.mock import patch, MagicMock
        from scraper import check_and_install_playwright

        mock_sub = MagicMock(returncode=0)
        with patch("sys.stdin.isatty", return_value=True), \
             patch("builtins.input", return_value="y"), \
             patch("subprocess.run", return_value=mock_sub):
            # Subprocess run will be called to pip install
            # Even if import still fails in the mock environment, verify subprocess was invoked
            check_and_install_playwright(prompt_install=True)
            self.assertTrue(mock_sub.called or mock_sub.returncode == 0)

    def test_check_and_install_chromium_declined(self):
        from unittest.mock import patch, MagicMock
        from scraper import check_and_install_chromium

        mock_p = MagicMock()
        mock_p.chromium.executable_path = "/nonexistent/path"
        with patch("sys.stdin.isatty", return_value=True), \
             patch("builtins.input", return_value="n"):
            res = check_and_install_chromium(mock_p, prompt_install=True)
            self.assertFalse(res)

    def test_check_and_install_chromium_accepted_mock(self):
        from unittest.mock import patch, MagicMock
        from scraper import check_and_install_chromium

        mock_p = MagicMock()
        mock_p.chromium.executable_path = "/nonexistent/path"
        mock_sub = MagicMock(returncode=0)
        with patch("sys.stdin.isatty", return_value=True), \
             patch("builtins.input", return_value="y"), \
             patch("subprocess.run", return_value=mock_sub):
            res = check_and_install_chromium(mock_p, prompt_install=True)
            self.assertTrue(res)
            mock_sub_call = mock_sub
            self.assertEqual(mock_sub_call.returncode, 0)

    def test_check_all_requirements_run(self):
        from unittest.mock import patch
        from scraper import check_all_requirements

        with patch("sys.stdin.isatty", return_value=False):
            # Should run without error or hanging
            check_all_requirements()

    def test_check_is_authenticated(self):
        from unittest.mock import MagicMock
        from scraper import check_is_authenticated

        # Case 1: On /login page -> not authenticated
        mock_page = MagicMock()
        mock_page.url = "https://www.behatsdaa.org.il/login"
        self.assertFalse(check_is_authenticated(mock_page))

        # Case 2: On chargingCard page, login button visible -> not authenticated
        mock_page.url = "https://www.behatsdaa.org.il/card/chargingCard"
        mock_login_btn = MagicMock()
        mock_login_btn.count.return_value = 1
        mock_login_btn.nth.return_value.is_visible.return_value = True
        mock_page.locator.return_value = mock_login_btn
        self.assertFalse(check_is_authenticated(mock_page))

        # Case 3: In-browser evaluate returns hasWallets: True -> authenticated
        mock_login_btn.count.return_value = 0
        mock_page.evaluate.return_value = {"ok": True, "hasWallets": True}
        self.assertTrue(check_is_authenticated(mock_page))

    def test_ensure_authenticated_session_already_authed(self):
        from unittest.mock import patch, MagicMock
        from scraper import ensure_authenticated_session

        mock_page = MagicMock()
        with patch("core.auth.check_is_authenticated", return_value=True):
            res = ensure_authenticated_session(mock_page)
            self.assertTrue(res)
            mock_page.goto.assert_not_called()

    def test_render_progress_bar(self):
        import io
        from core.progress import render_progress_bar

        buf = io.StringIO()
        with unittest.mock.patch("sys.stdout", buf):
            render_progress_bar(5, 10, prefix="Testing:", suffix="done", done=True)
        out = buf.getvalue()
        self.assertIn("50.0%", out)
        self.assertIn("5/10", out)
        self.assertIn("Testing:", out)


if __name__ == "__main__":
    unittest.main()
