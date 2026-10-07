#!/usr/bin/env python3
"""
Behatsdaa Participating Stores & Changing Deals Scraper
Supports extracting both:
1. Rechargeable Wallet Cards & Stores Catalog (stores.json / stores.csv)
2. Changing Promotional Deals & Vouchers (deals.json / deals.csv)
"""

import os
import sys
import json
import time
import argparse
from pathlib import Path

# Ensure UTF-8 stdout encoding on Windows
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Load .env if present
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Re-export and import core modules for clean separation & 100% backward compatibility
from core.parsers import (
    _GENERIC_TOKENS,
    _GENERIC_NORMS,
    _SUPER_CATS,
    clean_html,
    get_color_theme,
    get_badge_class,
    build_wallet_info_entry,
    parse_caps_and_rules,
    extract_discount_percent,
    generate_store_id,
    parse_chains_from_categories,
    merge_stores_into_catalog,
    safe_float,
    parse_deal,
)
from core.deps import (
    check_and_install_playwright,
    is_chromium_installed,
    install_chromium_browser,
    check_and_install_chromium,
    check_all_requirements,
)
from core.auth import (
    launch_stealth_context,
    check_is_authenticated,
    wait_for_user_login,
    ensure_authenticated_session,
)
from core.extractors import (
    fetch_wallets_via_evaluate,
    fetch_deals_via_evaluate,
)
from core.storage import (
    save_catalog,
    save_deals,
    save_wallets_info,
    DEFAULT_GENERAL_CAPS,
    DEFAULT_GENERAL_RULES,
)
from core.importers import (
    import_deals_from_file,
    import_cards_from_file,
    find_downloaded_file,
)
from core.progress import render_progress_bar


def parse_arguments():
    parser = argparse.ArgumentParser(description="Scrape participating stores and rotating deals across Behatsdaa.")
    parser.add_argument(
        "--output-dir",
        default="data",
        help="Directory to save stores and deals JSON/CSV (default: 'data')"
    )
    parser.add_argument(
        "--headless",
        action="store_true",
        default=False,
        help="Run browser in headless mode (default: False, headful recommended for initial login & WAF)"
    )
    parser.add_argument(
        "--card-url",
        default="https://www.behatsdaa.org.il/card/chargingCard",
        help="Main cards page URL"
    )
    parser.add_argument(
        "--home-url",
        default="https://www.behatsdaa.org.il/",
        help="Behatsdaa homepage URL"
    )
    parser.add_argument(
        "--browser", "--channel",
        dest="browser",
        choices=["chrome", "msedge", "edge", "chromium"],
        default="chrome",
        help="Browser to use: 'chrome' (Google Chrome, default), 'edge' / 'msedge' (Microsoft Edge), or 'chromium'"
    )
    parser.add_argument(
        "--cdp",
        default=None,
        help="Connect to an already open browser via Chrome DevTools Protocol port or URL (e.g. 9222 or http://localhost:9222)"
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=60000,
        help="Navigation timeout in milliseconds (default: 60000)"
    )
    parser.add_argument(
        "--profile-dir",
        default="./behatsdaa_profile",
        help="Directory to store persistent browser profile and login session (default: ./behatsdaa_profile)"
    )
    parser.add_argument(
        "--deals-only",
        action="store_true",
        default=False,
        help="Scrape only rotating deals & vouchers, skipping wallet cards"
    )
    parser.add_argument(
        "--cards-only",
        action="store_true",
        default=False,
        help="Scrape only rechargeable card stores, skipping deals"
    )
    parser.add_argument(
        "--max-deals",
        type=int,
        default=None,
        help="Maximum number of deals to deeply scrape (default: all)"
    )
    parser.add_argument(
        "--no-hydrate",
        dest="hydrate_deals",
        action="store_false",
        default=True,
        help="Skip deep per-deal hydration (terms of use, variants, limits) for faster scraping"
    )
    parser.add_argument(
        "--import-deals",
        default=None,
        help="Path to raw deals JSON file (e.g. extracted from browser console) to process and save directly"
    )
    parser.add_argument(
        "--import-cards",
        default=None,
        help="Path to raw cards JSON file (e.g. extracted from browser console) to process and save directly"
    )
    parser.add_argument(
        "--id",
        dest="user_id",
        default=None,
        help="Israeli ID (תעודת זהות - 9 digits) for automated login (if omitted, you will be prompted in terminal)"
    )
    parser.add_argument(
        "--manual-login",
        action="store_true",
        default=False,
        help="Use manual login in browser window (enter ID & SMS code directly in Chrome/Edge)"
    )
    parser.add_argument(
        "--menu",
        action="store_true",
        default=False,
        help="Launch interactive terminal menu to choose scraping or importing actions"
    )
    parser.add_argument(
        "--check-deps",
        action="store_true",
        default=False,
        help="Check dependencies (Playwright & Chromium) and prompt to install if missing"
    )
    return parser.parse_args()


def scrape_with_playwright(args):
    if not check_and_install_playwright(prompt_install=True):
        sys.exit(1)

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("\n[ERROR] Playwright is not installed! Run: pip install -r requirements.txt\n")
        sys.exit(1)

    all_scraped_stores = {}
    discovered_cards = []
    final_deals_list = []
    discovered_tags = []

    print("==========================================================")
    print("      Behatsdaa - Stores & Rotating Deals Scraper         ")
    print("==========================================================")
    print(f"[*] Target URL: {args.card_url}")
    print(f"[*] Headless: {args.headless}")
    print(f"[*] Mode: Cards={'No' if args.deals_only else 'Yes'} | Deals={'No' if args.cards_only else 'Yes'}")
    if args.max_deals:
        print(f"[*] Max deals limit: {args.max_deals}")

    if args.cdp:
        print(f"[*] Mode: Connect to existing open browser (CDP: {args.cdp})")
    else:
        print(f"[*] Browser: {args.browser}")
        print(f"[*] Profile Directory: {args.profile_dir}")

    # Load existing stores.json for deal cross-linking ONLY if deals-only
    stores_path = Path(args.output_dir) / "stores.json"
    if args.deals_only and stores_path.exists():
        try:
            with open(stores_path, "r", encoding="utf-8") as f:
                existing_data = json.load(f)
                for s in existing_data.get("stores", []):
                    all_scraped_stores[s["name"]] = s
        except Exception:
            pass

    with sync_playwright() as p:
        if args.cdp:
            endpoint = args.cdp if str(args.cdp).startswith("http") else f"http://localhost:{args.cdp}"
            print(f"[*] Connecting over CDP: {endpoint} ...")
            browser = p.chromium.connect_over_cdp(endpoint)
            context = browser.contexts[0] if browser.contexts else browser.new_context()
        else:
            browser_channel = args.browser.lower()
            if browser_channel in ["edge", "msedge"]:
                browser_channel = "msedge"
            elif browser_channel == "chromium":
                browser_channel = None
            else:
                browser_channel = "chrome"

            context = launch_stealth_context(
                p,
                profile_dir=args.profile_dir,
                headless=args.headless,
                channel=browser_channel
            )

        page = context.pages[0] if context.pages else context.new_page()
        page.add_init_script("Object.defineProperty(navigator, 'webdriver', { get: () => undefined });")

        # Navigate & ensure authentication
        nav_url = args.home_url if args.deals_only else args.card_url
        print(f"\n[1/3] Navigating to: {nav_url}")
        try:
            page.goto(nav_url, wait_until="domcontentloaded", timeout=args.timeout)
        except Exception as e:
            print(f"[*] Navigation note: {e}")

        ensure_authenticated_session(
            page,
            user_id=args.user_id,
            manual=getattr(args, "manual_login", False),
            target_url=nav_url,
            headless=args.headless
        )
        time.sleep(1)

        # 1. Scrape Cards (unless deals-only)
        wallets_info_list = []
        final_caps = None
        final_rules = None
        if not args.deals_only:
            print("\n[2/3] Extracting wallets and stores across all cards...")
            start_time = time.time()
            raw_result = None
            try:
                raw_result = fetch_wallets_via_evaluate(page)
            except Exception as err:
                print(f"[!] In-browser evaluation error: {err}")

            if raw_result and raw_result.get("ok"):
                results = raw_result.get("results", [])
                total_cards = len(results)

                # Parse dynamic caps and rules from official site
                final_caps, final_rules = parse_caps_and_rules(
                    extracted_caps=raw_result.get("extracted_caps"),
                    extracted_rules=raw_result.get("extracted_rules"),
                    page_text=raw_result.get("page_text_sample")
                )

                for idx, item in enumerate(results, start=1):
                    w = item["wallet"]
                    wid = str(w.get("walletId") or w.get("walletID") or w.get("id"))
                    wname = (w.get("walletName") or w.get("name") or f"כרטיס ארנק {wid}").strip()
                    disc_num = extract_discount_percent(w.get("discount") or w.get("discountRate") or w.get("discountNumeric", 0))
                    disc_str = f"{disc_num}%" if disc_num else "הנחת מועדון"

                    card_entry = {
                        "id": f"card-{wid}",
                        "name": wname,
                        "wallet_id": wid,
                        "discount_default": disc_str,
                        "discount_numeric": disc_num,
                        "max_deposit": w.get("maxDeposit"),
                        "url": f"https://www.behatsdaa.org.il/card/shops?walletId={wid}"
                    }
                    discovered_cards.append(card_entry)
                    wallets_info_list.append(build_wallet_info_entry(w, caps_dict=final_caps))

                    categories = item.get("categories", [])
                    stores = parse_chains_from_categories(categories, card_entry)
                    merge_stores_into_catalog(all_scraped_stores, stores, card_entry)

                    render_progress_bar(
                        idx,
                        total_cards,
                        prefix="Processing Cards:   ",
                        suffix=f"| {len(all_scraped_stores):,} stores found",
                        done=(idx == total_cards)
                    )

                # Process any extra raw wallets not in results
                for rw in raw_result.get("raw_wallets", []):
                    entry = build_wallet_info_entry(rw, caps_dict=final_caps)
                    if not any(x["id"] == entry["id"] for x in wallets_info_list):
                        wallets_info_list.append(entry)

                print(f"[+] Successfully retrieved data for {total_cards} cards ({len(all_scraped_stores):,} participating stores) in {time.time() - start_time:.2f}s!")
            else:
                err_msg = (raw_result or {}).get("error", "No cards or wallets returned from API")
                print(f"[!] Card extraction failed: {err_msg}")

        # 2. Scrape Deals & Vouchers (unless cards-only)
        if not args.cards_only:
            print("\n[3/3] Extracting rotating deals, coupons, and vouchers across all categories...")
            start_time = time.time()
            deals_result = None
            try:
                deals_result = fetch_deals_via_evaluate(
                    page,
                    max_deals=args.max_deals,
                    hydrate_details=getattr(args, "hydrate_deals", True)
                )
            except Exception as err:
                print(f"[!] In-browser deals extraction error: {err}")

            if deals_result and deals_result.get("ok"):
                raw_deals = deals_result.get("deals", [])
                discovered_tags = deals_result.get("tags", [])
                print(f"[+] Successfully extracted {len(raw_deals)} raw deals in {time.time() - start_time:.2f}s!")

                for rd in raw_deals:
                    parsed = parse_deal(rd, all_scraped_stores)
                    if parsed and parsed.get("title"):
                        final_deals_list.append(parsed)
            else:
                err_msg = (deals_result or {}).get("error", "Deals extraction returned empty")
                print(f"[!] Deals extraction failed: {err_msg}")

        context.close()

    # Save Stores Catalog
    if not args.deals_only:
        if all_scraped_stores:
            final_stores_list = list(all_scraped_stores.values())
            print(f"\n[+] Total unique stores saved: {len(final_stores_list)}")
            save_catalog(final_stores_list, discovered_cards, args.output_dir, args.card_url)
            if wallets_info_list:
                save_wallets_info(
                    wallets_info_list,
                    general_caps=final_caps,
                    general_rules=final_rules,
                    output_dir=args.output_dir
                )
        else:
            print("\n[!] No stores were scraped in this run. Existing stores catalog preserved.")

    # Save Deals Catalog
    if not args.cards_only:
        if final_deals_list:
            print(f"[+] Total unique deals & vouchers saved: {len(final_deals_list)}")
            save_deals(final_deals_list, discovered_tags, args.output_dir, args.home_url)
        else:
            print("[!] No deals were extracted in this run. Existing deals catalog preserved.")

    if all_scraped_stores or final_deals_list:
        print("\n[SUCCESS] Scraping completed successfully!")
    else:
        print("\n[!] Scraping finished with no new data extracted. Please ensure you are logged in.")


def run_interactive_menu():
    """Interactive CLI menu to select scraping or importing actions."""
    print("\n" + "=" * 62)
    print("        💳 Behatsdaa - Scraper & Data Pipeline Suite")
    print("=" * 62)
    print(" Select an action to perform:\n")
    print("  [1] 💳 Scrape Rechargeable Cards (Playwright headless - terminal login)")
    print("  [2] 🎁 Scrape Rotating Deals (Playwright headless - terminal login)")
    print("  [3] 🚀 Full Scrape: Cards + Deals (Playwright headless - terminal login)")
    print("  [4] 🖥️  Manual Browser Scrape (Playwright headful - enter in browser window)")
    print("  [5] 🏷️  Scrape Be-Plus Billing Discounts (10,600+ stores, no browser)")
    print("  [6] 📥 Import Cards from file (cards_raw.json)")
    print("  [7] 📥 Import Deals from file (deals_raw.json)")
    print("  [8] 🔧 Check & Install Requirements (Playwright & Chromium)")
    print("  [9] 💳 Refresh Wallets & Spending Caps (wallets_info.json)")
    print("  [0] ❌ Exit")
    print("=" * 62)

    try:
        choice = input("Enter choice [0-9]: ").strip()
    except (KeyboardInterrupt, EOFError):
        print("\nExiting.")
        sys.exit(0)

    if choice == "0":
        print("Goodbye!")
        sys.exit(0)

    args = parse_arguments()

    if choice == "8":
        check_all_requirements()
        return

    if choice == "9":
        stores_path = Path(args.output_dir) / "stores.json"
        wallets_to_save = []
        if stores_path.exists():
            with open(stores_path, "r", encoding="utf-8") as f:
                sdata = json.load(f)
                for c in sdata.get("metadata", {}).get("available_cards", []):
                    wallets_to_save.append(build_wallet_info_entry(c))
        if wallets_to_save:
            save_wallets_info(wallets_to_save, output_dir=args.output_dir)
            print("[SUCCESS] Wallets info refreshed successfully!")
        else:
            print("[!] No available cards found in stores.json to build wallets info.")
        return

    if choice == "4":
        args.headless = False
        args.manual_login = True
        print("\n[*] Launching visual browser window for manual login...")
        scrape_with_playwright(args)
        return

    if choice == "5":
        try:
            from scrape_beplus import scrape_all_billing_stores
            print("\n[*] Starting Be-Plus Billing Discounts scraper...")
            scrape_all_billing_stores(output_dir=args.output_dir)
        except Exception as err:
            print(f"[!] Error running Be-Plus scraper: {err}")
        return

    if choice == "6":
        suggested = find_downloaded_file("cards_raw.json")
        prompt = f"Path to cards_raw.json [{suggested}]: " if suggested else "Path to cards_raw.json: "
        try:
            val = input(prompt).strip() or suggested
        except (KeyboardInterrupt, EOFError):
            return
        if not val:
            print("[!] No file path provided.")
            return
        args.import_cards = val
        import_cards_from_file(args)
        return

    if choice == "7":
        suggested = find_downloaded_file("deals_raw.json")
        prompt = f"Path to deals_raw.json [{suggested}]: " if suggested else "Path to deals_raw.json: "
        try:
            val = input(prompt).strip() or suggested
        except (KeyboardInterrupt, EOFError):
            return
        if not val:
            print("[!] No file path provided.")
            return
        args.import_deals = val
        import_deals_from_file(args)
        return

    # Browser Playwright Scraping (Headless with automated terminal login)
    args.headless = True
    args.manual_login = False
    if choice == "1":
        args.cards_only = True
        args.deals_only = False
    elif choice == "2":
        args.deals_only = True
        args.cards_only = False
    elif choice == "3":
        args.cards_only = False
        args.deals_only = False
    else:
        print("[!] Invalid choice. Exiting.")
        return

    scrape_with_playwright(args)


def main():
    if len(sys.argv) == 1 and sys.stdin.isatty():
        run_interactive_menu()
        return

    args = parse_arguments()
    if args.menu:
        run_interactive_menu()
        return

    if args.check_deps:
        check_all_requirements()
        return

    if args.import_deals:
        import_deals_from_file(args)
    elif args.import_cards:
        import_cards_from_file(args)
    else:
        scrape_with_playwright(args)


if __name__ == "__main__":
    main()
