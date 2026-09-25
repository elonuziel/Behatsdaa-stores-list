#!/usr/bin/env python3
"""
Be-Plus (Behatsdaa Billing Discounts) Standalone Scraper
Extracts all participating businesses offering automatic credit card billing discounts
(הנחות במעמד החיוב) from https://be-plus.co.il/ into data/billing_stores.json & .csv.
"""

import os
import sys
import json
import csv
import re
import html
import time
import argparse
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
from concurrent.futures import ThreadPoolExecutor, as_completed

# Ensure UTF-8 stdout encoding on Windows / Linux terminals
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_URL = "https://be-plus.co.il"
CATEGORIES_URL = f"{BASE_URL}/index.php?option=com_crm&task=products.getCategories"
ITEMS_URL_TEMPLATE = f"{BASE_URL}/index.php?option=com_crm&task=products.getItems&start={{start}}"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"


def clean_html_text(raw_html: str) -> str:
    """Strips HTML tags, decodes entities, and cleans whitespace."""
    if not raw_html:
        return ""
    # Strip HTML tags
    text = re.sub(r'<[^>]+>', ' ', raw_html)
    # Decode HTML entities like &nbsp;, &quot;, &#39;
    text = html.unescape(text)
    # Normalize unicode whitespace & multiple spaces
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def clean_hebrew_name(name: str) -> str:
    """Normalizes store name whitespace and typography."""
    if not name:
        return ""
    name = html.unescape(name)
    name = re.sub(r'\s+', ' ', name).strip()
    return name


def fetch_url(url: str, timeout: int = 15, retries: int = 3, backoff: float = 1.0) -> dict | list | None:
    """Fetches JSON from URL with exponential retries."""
    headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    for attempt in range(1, retries + 1):
        try:
            req = Request(url, headers=headers)
            with urlopen(req, timeout=timeout) as resp:
                data = resp.read().decode('utf-8', errors='replace')
                return json.loads(data)
        except (URLError, HTTPError, json.JSONDecodeError) as e:
            if attempt < retries:
                time.sleep(backoff * (2 ** (attempt - 1)))
            else:
                print(f"[WARN] Failed to fetch {url}: {e}", file=sys.stderr)
                return None
    return None


def fetch_categories(timeout: int = 15) -> dict[int, dict]:
    """Fetches category hierarchy and maps IDs to names and parent categories."""
    data = fetch_url(CATEGORIES_URL, timeout=timeout)
    if not data or 'items' not in data:
        print("[WARN] Could not fetch categories from Be-Plus, using fallback", file=sys.stderr)
        return {}

    raw_cats = data['items']
    cat_lookup = {}
    for c in raw_cats:
        c_id = c.get('id')
        name = clean_html_text(c.get('cat_name', ''))
        # Remove leading hyphen used for subcategories (e.g. "- הלבשת נשים")
        clean_name = re.sub(r'^\s*-\s*', '', name)
        parent_id = c.get('parent_id', 0)
        color = c.get('color', '')
        cat_lookup[c_id] = {
            'id': c_id,
            'name': clean_name,
            'parent_id': parent_id,
            'color': color
        }

    # Second pass: resolve top-level category name
    for c_id, cat_info in cat_lookup.items():
        parent_id = cat_info['parent_id']
        if parent_id and parent_id in cat_lookup:
            cat_info['top_name'] = cat_lookup[parent_id]['name']
            cat_info['sub_name'] = cat_info['name']
        else:
            cat_info['top_name'] = cat_info['name']
            cat_info['sub_name'] = ""

    return cat_lookup


def parse_business_item(item: dict, cat_lookup: dict[int, dict]) -> dict:
    """Parses and normalizes a single business record into our clean schema."""
    raw_id = item.get('id')
    try:
        item_id = int(raw_id)
    except (ValueError, TypeError):
        item_id = raw_id

    name = clean_hebrew_name(item.get('model', ''))
    city = clean_html_text(item.get('city', ''))
    address = clean_html_text(item.get('address', ''))
    description = clean_html_text(item.get('free_text', ''))

    # Discount parsing (price represents percentage discount in this API)
    raw_price = item.get('price', 0)
    try:
        discount = float(raw_price)
        if discount.is_integer():
            discount = int(discount)
    except (ValueError, TypeError):
        discount = 0

    # Category resolution
    raw_cat_id = item.get('cat_id') or item.get('display_cat_id')
    try:
        cat_id = int(raw_cat_id)
    except (ValueError, TypeError):
        cat_id = 0

    cat_info = cat_lookup.get(cat_id, {})
    category = cat_info.get('top_name') or 'כללי'
    subcategory = cat_info.get('sub_name') or ''
    color = item.get('color') or cat_info.get('color') or '#8B5CF6'

    # Logo/Image URLs
    icon = item.get('icon', '')
    image = item.get('image', '')
    logo_filename = icon or image
    logo_url = f"{BASE_URL}/media/com_product/images/{logo_filename}" if logo_filename else ""

    return {
        "id": item_id,
        "name": name,
        "discount": discount,
        "city": city or "online",
        "address": address,
        "category": category,
        "subcategory": subcategory,
        "category_id": cat_id,
        "color": color,
        "description": description,
        "logo": logo_url,
        "detail_url": f"{BASE_URL}/product/{item_id}" if item_id else ""
    }


def fetch_page_worker(page_idx: int, batch_size: int, cat_lookup: dict[int, dict], timeout: int) -> list[dict]:
    """Fetches a single page and parses items."""
    start = page_idx * batch_size
    url = ITEMS_URL_TEMPLATE.format(start=start)
    res = fetch_url(url, timeout=timeout)
    if not res or 'items' not in res:
        return []

    parsed = []
    for raw_item in res['items']:
        if not raw_item:
            continue
        parsed_item = parse_business_item(raw_item, cat_lookup)
        if parsed_item['name']:  # valid business
            parsed.append(parsed_item)
    return parsed


def scrape_all_billing_stores(output_dir: str = "data", max_workers: int = 8, limit_pages: int | None = None, timeout: int = 15) -> tuple[Path, Path]:
    """Scrapes all Be-Plus billing discount stores and exports to JSON and CSV."""
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    print(f"[*] Starting Be-Plus Billing Discounts Scraper...")
    t0 = time.time()

    # 1. Fetch categories
    print("[*] Fetching category taxonomy...")
    cat_lookup = fetch_categories(timeout=timeout)
    print(f"[+] Loaded {len(cat_lookup)} categories.")

    # 2. Get pagination metadata from page 0
    print("[*] Reading initial page metadata...")
    first_page_res = fetch_url(ITEMS_URL_TEMPLATE.format(start=0), timeout=timeout)
    if not first_page_res:
        raise RuntimeError("Failed to connect to Be-Plus API at page 0.")

    total_pages = first_page_res.get('pagination', 445)
    batch_size = first_page_res.get('limit', 24)
    print(f"[+] API reported {total_pages} total pages (~{total_pages * batch_size} potential items, batch_size={batch_size}).")

    if limit_pages is not None:
        total_pages = min(total_pages, limit_pages)
        print(f"[*] Limiting crawl to {total_pages} pages as requested.")

    # 3. Concurrent fetching
    print(f"[*] Fetching {total_pages} pages using {max_workers} concurrent workers...")
    all_items = []
    completed_pages = 0

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_page = {
            executor.submit(fetch_page_worker, p, batch_size, cat_lookup, timeout): p
            for p in range(total_pages)
        }

        for future in as_completed(future_to_page):
            page_idx = future_to_page[future]
            try:
                page_items = future.result()
                all_items.extend(page_items)
            except Exception as e:
                print(f"[WARN] Error processing page {page_idx}: {e}", file=sys.stderr)

            completed_pages += 1
            if completed_pages % 50 == 0 or completed_pages == total_pages:
                elapsed = time.time() - t0
                print(f"    -> Progress: {completed_pages}/{total_pages} pages fetched ({len(all_items)} raw items, {elapsed:.1f}s)")

    # 4. Deduplication & Sorting
    print("[*] Deduplicating and indexing businesses...")
    seen_ids = set()
    unique_stores = []
    for store in all_items:
        s_id = store['id']
        if s_id and s_id in seen_ids:
            continue
        seen_ids.add(s_id)
        unique_stores.append(store)

    # Sort primarily by name and discount
    unique_stores.sort(key=lambda s: (s['name'], -s['discount']))
    print(f"[+] Found {len(unique_stores)} unique businesses across Israel.")

    # Compute top cities and summary stats
    city_counts = {}
    for s in unique_stores:
        c = s['city'] or 'online'
        city_counts[c] = city_counts.get(c, 0) + 1

    top_cities = sorted(city_counts.items(), key=lambda x: -x[1])[:10]
    print(f"[*] Top cities by merchant count: {', '.join(f'{c}: {cnt}' for c, cnt in top_cities)}")

    # 5. Export JSON
    json_path = out_path / "billing_stores.json"
    now_iso = datetime.now(timezone.utc).isoformat()
    json_payload = {
        "metadata": {
            "scraped_at": now_iso,
            "total_stores": len(unique_stores),
            "source": BASE_URL,
            "description": "הנחות במעמד החיוב למחזיקי כרטיס אשראי מועדון בהצדעה (Be-Plus)"
        },
        "stores": unique_stores
    }

    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(json_payload, f, ensure_ascii=False, indent=2)
    print(f"[+] Exported JSON to {json_path} ({json_path.stat().st_size / 1024:.1f} KB)")

    # 6. Export CSV
    csv_path = out_path / "billing_stores.csv"
    csv_headers = [
        "id", "name", "discount", "city", "address", 
        "category", "subcategory", "description", "detail_url"
    ]

    with open(csv_path, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=csv_headers, extrasaction='ignore')
        writer.writeheader()
        for store in unique_stores:
            writer.writerow(store)
    print(f"[+] Exported CSV to {csv_path} ({csv_path.stat().st_size / 1024:.1f} KB)")

    total_time = time.time() - t0
    print(f"[✓] Complete! Successfully scraped {len(unique_stores)} businesses in {total_time:.1f}s.")
    return json_path, csv_path


def parse_args():
    parser = argparse.ArgumentParser(description="Scrape Be-Plus credit card billing discounts for Behatsdaa.")
    parser.add_argument(
        "--output-dir",
        default="data",
        help="Directory to save billing_stores.json and billing_stores.csv (default: 'data')"
    )
    parser.add_argument(
        "--max-workers",
        type=int,
        default=8,
        help="Concurrent worker threads (default: 8)"
    )
    parser.add_argument(
        "--limit-pages",
        type=int,
        default=None,
        help="Limit number of pages to fetch (for testing/dry-run, default: None = all pages)"
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=15,
        help="Request timeout in seconds (default: 15)"
    )
    return parser.parse_args()


if __name__ == '__main__':
    args = parse_args()
    scrape_all_billing_stores(
        output_dir=args.output_dir,
        max_workers=args.max_workers,
        limit_pages=args.limit_pages,
        timeout=args.timeout
    )
