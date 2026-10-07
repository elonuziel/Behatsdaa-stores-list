"""
Import handlers for raw data extracted manually via in-browser JavaScript console.
"""

import sys
import json
from pathlib import Path
from core.parsers import (
    extract_discount_percent,
    parse_chains_from_categories,
    merge_stores_into_catalog,
    parse_deal,
)
from core.storage import save_catalog, save_deals


def import_deals_from_file(args):
    """Import and process raw deals from a JSON file directly without Playwright."""
    import_path = Path(args.import_deals)
    if not import_path.exists():
        print(f"[ERROR] Import file not found: {import_path}")
        sys.exit(1)

    print(f"[*] Importing raw deals from: {import_path} ...")
    with open(import_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    raw_deals = data.get("deals", []) if isinstance(data, dict) else (data if isinstance(data, list) else [])
    discovered_tags = data.get("tags", []) if isinstance(data, dict) else []

    all_scraped_stores = {}
    stores_path = Path(args.output_dir) / "stores.json"
    if stores_path.exists():
        try:
            with open(stores_path, "r", encoding="utf-8") as f:
                existing_data = json.load(f)
                for s in existing_data.get("stores", []):
                    all_scraped_stores[s["name"]] = s
        except Exception:
            pass

    final_deals_list = []
    for rd in raw_deals:
        parsed = parse_deal(rd, all_scraped_stores)
        if parsed and parsed.get("title"):
            final_deals_list.append(parsed)

    print(f"[+] Processed {len(final_deals_list)} valid deals & vouchers.")
    save_deals(final_deals_list, discovered_tags, args.output_dir, args.home_url)
    print("\n[SUCCESS] Deals import completed successfully!")


def import_cards_from_file(args):
    """Import and process raw cards from a JSON file directly without Playwright."""
    import_path = Path(args.import_cards)
    if not import_path.exists():
        print(f"[ERROR] Import file not found: {import_path}")
        sys.exit(1)

    print(f"[*] Importing raw cards from: {import_path} ...")
    with open(import_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    results = data.get("results", []) if isinstance(data, dict) else (data if isinstance(data, list) else [])
    if not results and isinstance(data, dict) and "data" in data:
        results = data["data"].get("results", []) or data["data"].get("wallets", [])

    discovered_cards = []
    all_scraped_stores = {}

    for item in results:
        w = item.get("wallet", {})
        wid = str(w.get("walletID") or item.get("walletID", ""))
        wname = (w.get("walletName") or item.get("walletName") or f"כרטיס ארנק {wid}").strip()
        disc_num = extract_discount_percent(w.get("discountRate", 0))
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

        categories = item.get("categories", [])
        stores = parse_chains_from_categories(categories, card_entry)
        print(f"    [*] Card '{wname}' (walletId {wid}): {len(stores)} participating stores (הנחה: {disc_str})")
        merge_stores_into_catalog(all_scraped_stores, stores, card_entry)

    final_stores_list = list(all_scraped_stores.values())
    final_stores_list.sort(key=lambda s: s["name"])
    print(f"[+] Total unique participating stores saved: {len(final_stores_list)}")
    save_catalog(final_stores_list, discovered_cards, args.output_dir, args.card_url)
    print("\n[SUCCESS] Cards import completed successfully!")


def find_downloaded_file(filename):
    """Search for a file in current directory, Linux Downloads, and WSL Windows Downloads."""
    candidates = [
        Path.cwd() / filename,
        Path.home() / "Downloads" / filename,
    ]
    try:
        wsl_users = Path("/mnt/c/Users")
        if wsl_users.exists():
            for u in wsl_users.glob("*"):
                if u.is_dir() and not u.name.startswith("Default") and u.name != "Public":
                    candidates.append(u / "Downloads" / filename)
    except Exception:
        pass

    for p in candidates:
        if p.exists():
            return str(p)
    return ""

