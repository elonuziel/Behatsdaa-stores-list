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
import re
import csv
import time
import argparse
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin

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

# ---------------------------------------------------------------------------
# Module-level constants shared by parse_deal() — defined once, never rebuilt
# ---------------------------------------------------------------------------

# Words/tokens that must NOT be accepted as supplier names (dietary labels,
# generic adjectives, distribution words, etc.)
_GENERIC_TOKENS: set[str] = {
    'כשר', 'כשרה', 'חלבי', 'בשרי', 'פרווה', 'אנרגיה', 'אילת', 'אונליין', 'online',
    'חינם', 'מבצע', 'חדש', 'חדשה', 'ישן', 'מוגבל', 'בלבד', 'כולל', 'ללא',
    'גדול', 'קטן', 'ממוחזר', 'עץ', 'פלסטיק', 'גב', 'רשת', 'סט', 'ערכת',
}
# Pre-normalised forms of _GENERIC_TOKENS (strip non-alnum, lower-case)
_GENERIC_NORMS: set[str] = {re.sub(r'[^א-תa-zA-Z0-9]+', '', t).lower() for t in _GENERIC_TOKENS}

# Top-level Behatsdaa category names — short, well-known super-categories
_SUPER_CATS: set[str] = {
    'צרכנות', 'אטרקציות', 'קולינריה', 'בילוי ופנאי', 'מופעים והצגות',
    'תיירות ונופש', 'כושר וספורט', 'מבצעי רכב', 'ביטוח ושירותים',
    'מחשבים ואלקטרוניקה', 'מרהטים את הבית', 'חשמל לבית ולמטבח',
    'ריהוט ואביזרים לגן ולמרפסת', 'טקסטיל והלבשה', 'קמפינג, מחנאות וטיולים',
    'מכינים את המטבח', 'נופש בארץ', 'מבצעי צרכנות לחג',
}

# ---------------------------------------------------------------------------


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
        "--import-deals",
        default=None,
        help="Path to raw deals JSON file (e.g. extracted from browser console) to process and save directly"
    )
    return parser.parse_args()


def extract_discount_percent(text):
    """Extract numeric percentage from discount strings like '20%', 'עד 15% הנחה'"""
    if not text:
        return 0
    if isinstance(text, (int, float)):
        return int(text)
    match = re.search(r'(\d+(?:\.\d+)?)\s*%', str(text))
    if match:
        try:
            return int(float(match.group(1)))
        except ValueError:
            pass
    match = re.search(r'(\d+)', str(text))
    if match:
        val = int(match.group(1))
        if 1 <= val <= 100:
            return val
    return 0


def generate_store_id(name, fallback_index=0):
    """Generate a clean URL-friendly identifier for a store."""
    slug = re.sub(r'[^a-zA-Z0-9\u0590-\u05FF]+', '-', str(name)).strip('-').lower()
    return slug or f"store-{fallback_index}"


def parse_chains_from_categories(categories, card_info):
    """Parse list of categories and chains returned by GetWalletChain API."""
    stores = []
    card_id = card_info["id"]
    card_name = card_info["name"]
    card_discount_str = card_info["discount_default"]
    card_discount_num = card_info["discount_numeric"]

    for cat in categories:
        cat_name = (cat.get("tagName") or "כללי").strip()
        chains = cat.get("walletChainData") or []

        for chain in chains:
            name = (chain.get("chainName") or "").strip()
            if not name:
                continue

            # Filter out UI anomalies
            if any(bad in name for bad in ["סל קניות", "תעודת זהות", "לטעינה", "תשלום בקופה", "ביטול טעינה", "מספר כרטיס המועדון"]):
                continue

            stores.append({
                "name": name,
                "chain_id": str(chain.get("chainID") or ""),
                "category": cat_name,
                "logo": chain.get("logoURL") or "",
                "website": chain.get("webSite") or "",
                "card_id": card_id,
                "card_name": card_name,
                "discount": card_discount_str,
                "discount_numeric": card_discount_num,
                "conditions": ""
            })

    return stores


def merge_stores_into_catalog(catalog, stores, card_info):
    """Merge scraped stores into unified catalog with deduplication across cards."""
    card_id = card_info["id"]
    card_name = card_info["name"]
    discount_str = card_info["discount_default"]
    discount_num = card_info["discount_numeric"]

    for s in stores:
        sname = s["name"]
        if sname not in catalog:
            catalog[sname] = {
                "id": generate_store_id(sname, len(catalog) + 1),
                "name": sname,
                "category": s.get("category") or "כללי",
                "logo": s.get("logo") or "",
                "website": s.get("website") or "",
                "conditions": s.get("conditions") or "",
                "cards": [],
                "max_discount": 0
            }

        store_entry = catalog[sname]

        # Add card if not already linked
        linked_card_ids = {c["card_id"] for c in store_entry["cards"]}
        if card_id not in linked_card_ids:
            store_entry["cards"].append({
                "card_id": card_id,
                "card_name": card_name,
                "discount": discount_str,
                "discount_numeric": discount_num,
                "notes": s.get("conditions") or ""
            })

        # Update maximum discount
        if discount_num > store_entry["max_discount"]:
            store_entry["max_discount"] = discount_num

        # Update category if previously unclassified
        if store_entry["category"] in ["כללי", "אחר"] and s.get("category"):
            store_entry["category"] = s["category"]

        # Backfill logo and website if missing
        if not store_entry["logo"] and s.get("logo"):
            store_entry["logo"] = s["logo"]
        if not store_entry["website"] and s.get("website"):
            store_entry["website"] = s["website"]


def safe_float(val, default=0.0):
    if val is None or val == "":
        return default
    if isinstance(val, (int, float)):
        return float(val)
    val_clean = re.sub(r'[^\d.]+', '', str(val).replace(',', ''))
    try:
        return float(val_clean) if val_clean else default
    except Exception:
        return default


def parse_deal(raw_deal, stores_catalog=None):
    """Normalize a raw deal/category/variant JSON object from Behatsdaa into a clean deal dict."""
    category_id = str(raw_deal.get("categoryId") or raw_deal.get("id") or "")
    title = (raw_deal.get("title") or raw_deal.get("categoryName") or raw_deal.get("name") or "").strip()
    if not title:
        return None

    # Variants & Pricing
    variants_raw = raw_deal.get("variants") or []
    parsed_variants = []
    prices = []
    original_prices = []

    for idx, v in enumerate(variants_raw):
        v_price = safe_float(v.get("price"))
        v_orig = safe_float(v.get("original_price") or v.get("discount"))
        v_name = (v.get("name") or title).strip()
        v_barcode = str(v.get("barCode") or v.get("barcode") or "")
        v_stock = v.get("stock") or ("אזל במלאי" if v.get("outofStock") else "במלאי")

        # v_orig is the ORIGINAL (pre-discount) price from the API.
        # On Behatsdaa the "discount" field actually stores the original price, not a reduction amount.
        # Only accept v_orig as original when it is strictly greater than the sale price.
        orig_price = v_orig if v_orig > v_price else v_price
        disc_pct = round(((orig_price - v_price) / orig_price) * 100) if orig_price > v_price else 0

        parsed_variants.append({
            "id": str(v.get("id") or f"v-{category_id}-{idx}"),
            "name": v_name,
            "price": v_price,
            "original_price": orig_price,
            "discount_percent": disc_pct,
            "barcode": v_barcode,
            "stock": v_stock,
            "expire_date": v.get("expireDate") or v.get("expire_date") or raw_deal.get("eventDate") or ""
        })
        if v_price > 0:
            prices.append(v_price)
        if orig_price > 0:
            original_prices.append(orig_price)

    # Support top-level prices list from category catalog responses.
    # Behatsdaa encodes prices as a flat array where the values represent
    # different variants/tiers — min() = cheapest sale price, max() = highest
    # original (pre-discount) price shown as crossed-out.
    if not prices and raw_deal.get("prices") and isinstance(raw_deal["prices"], list):
        raw_prices = [safe_float(p) for p in raw_deal["prices"] if safe_float(p) > 0]
        if raw_prices:
            prices.append(min(raw_prices))               # sale / member price
            if max(raw_prices) > min(raw_prices):
                original_prices.append(max(raw_prices))  # original / non-member price

    # Support top-level single price & discount field
    single_price = safe_float(raw_deal.get("price") or raw_deal.get("fromPrice") or raw_deal.get("minPrice"))
    if not prices and single_price > 0:
        prices.append(single_price)

    single_orig = safe_float(raw_deal.get("original_price") or raw_deal.get("discount"))
    if not original_prices and single_orig > 0:
        original_prices.append(single_orig)

    category_url = (raw_deal.get("categoryUrl") or "").strip()
    is_free = "חינם" in title or "מוזיאון" in title

    # Filter out category folders or empty ghost shells that have no prices, no variants, no external url, and are not free
    if not prices and not parsed_variants and not category_url and not is_free:
        return None

    # Skip intermediate category folder nodes that contain no products/prices
    if raw_deal.get("isLeaf") is False and not prices and not parsed_variants and not category_url:
        return None

    supplier = (raw_deal.get("supplier") or raw_deal.get("supplierName") or "").strip()

    # Extract supplier from title if missing from API fields
    if not supplier:
        # Try "מבית <Brand>" pattern first (most reliable)
        supplier_match = re.search(r'מבית\s+[\'"]?([א-תA-Za-z0-9\s]{3,}?)[\'"]?(?:\s*[-–]|\s*$)', title)
        if supplier_match:
            supplier = supplier_match.group(1).strip()
        else:
            # Take FIRST segment before a dash — it is usually the brand name
            # Require ≥4 normalised chars and not a known generic token
            first_seg_match = re.match(r'^([^\-–]{4,50}?)\s*[-–]', title)
            if first_seg_match:
                candidate = first_seg_match.group(1).strip()
                norm_candidate = re.sub(r'[^א-תa-zA-Z0-9]+', '', candidate).lower()
                if len(norm_candidate) >= 4 and norm_candidate not in _GENERIC_NORMS:
                    supplier = candidate

    # Fallback to category if supplier is still empty or too short
    if not supplier or len(re.sub(r'[^א-תa-zA-Z0-9]+', '', supplier)) < 3:
        supplier = (raw_deal.get("category") or "בהצדעה").strip()

    # Clear generic tokens that slipped through (e.g. "כשר")
    if re.sub(r'[^א-תa-zA-Z0-9]+', '', supplier).lower() in _GENERIC_NORMS:
        supplier = (raw_deal.get("category") or "בהצדעה").strip()

    # Image extraction (including CDN prefix for Behatsdaa media)
    image = raw_deal.get("image") or ""
    if not image and raw_deal.get("images") and isinstance(raw_deal["images"], list) and raw_deal["images"]:
        first_img = raw_deal["images"][0]
        if isinstance(first_img, dict):
            fpath = first_img.get("file") or first_img.get("externalUrl") or ""
            if fpath:
                image = fpath if fpath.startswith("http") else f"https://pics.k4a.co.il/share/{fpath}"
        elif isinstance(first_img, str):
            image = first_img if first_img.startswith("http") else f"https://pics.k4a.co.il/share/{first_img}"

    # Category name — prefer structured API fields; never let category equal the full deal title
    raw_cat = raw_deal.get("category") or ""
    # Only use the "category" field if it's a proper super-category, not if it accidentally equals the title
    if raw_cat and raw_cat != title and (raw_cat in _SUPER_CATS or len(raw_cat) <= 30):
        cat_name = raw_cat.strip()
    else:
        # Try parent/breadcrumb fields
        cat_name = (raw_deal.get("parentCategoryName") or "").strip()
        if not cat_name and raw_deal.get("breadcrumbs"):
            crumbs = raw_deal.get("breadcrumbs")
            if isinstance(crumbs, list) and crumbs:
                cat_name = crumbs[0].get("name", "")
        # Derive from sourceTags if available
        if not cat_name:
            tags_list = raw_deal.get("sourceTags") or []
            if tags_list:
                cat_name = tags_list[0]
        if not cat_name:
            cat_name = "כללי"

    # Determine deal type
    # is_free: "חינם" explicitly in title OR every listed price is 0
    # Do NOT use "מוזיאון" — museums can cost money (e.g. מוזיאון האשליות = 85 ₪)
    all_prices_free = bool(prices) and all(p == 0.0 for p in prices)
    is_free = "חינם" in title or all_prices_free

    is_external = bool(category_url and not prices and not parsed_variants)
    if is_external:
        deal_type = "external_partner"
        deal_url = category_url
        main_price = 0.0
        main_orig = 0.0
        discount_pct = 0
    elif is_free and not prices:
        deal_type = "free_benefit"
        deal_url = f"https://www.behatsdaa.org.il/category/productPage/{category_id}"
        main_price = 0.0
        main_orig = 0.0
        discount_pct = 100
    else:
        deal_type = "voucher"
        deal_url = f"https://www.behatsdaa.org.il/category/productPage/{category_id}"
        main_price = min(prices) if prices else safe_float(raw_deal.get("price") or raw_deal.get("fromPrice") or raw_deal.get("minPrice"))
        if is_free:
            main_price = 0.0
        main_orig = max(original_prices) if original_prices else safe_float(raw_deal.get("original_price") or raw_deal.get("discount") or main_price)
        if main_orig < main_price:
            main_orig = main_price
        discount_pct = round(((main_orig - main_price) / main_orig) * 100) if main_orig > main_price else 0

    # Locations & Shipping (support business.address or locations list)
    locs = raw_deal.get("locations") or []
    loc_str = "מגוון סניפים"
    shipping_included = False
    business = raw_deal.get("business") or {}
    if isinstance(business, dict) and business.get("address"):
        loc_str = business["address"].strip()
    elif isinstance(locs, list) and locs:
        loc_str = ", ".join([l.get("address", "") for l in locs if l.get("address")]) or "מגוון סניפים"

    raw_desc = raw_deal.get("description") or raw_deal.get("shortDescription") or raw_deal.get("categoryHTML") or ""
    clean_desc = re.sub(r'<[^>]+>', ' ', str(raw_desc)).strip()
    clean_desc = re.sub(r'\s+', ' ', clean_desc)

    raw_terms = raw_deal.get("termsOfUse") or raw_deal.get("howToUse") or raw_deal.get("redimType") or ""
    clean_terms = re.sub(r'<[^>]+>', ' ', str(raw_terms)).strip()
    clean_terms = re.sub(r'\s+', ' ', clean_terms)

    if "משלוח" in title or "משלוח" in clean_desc or "משלוח" in clean_terms:
        shipping_included = True
        if not locs and (not isinstance(business, dict) or not business.get("address")):
            loc_str = "כולל משלוח עד הבית"

    # Cross-link with stores in catalog — require meaningful match (≥4 chars, ≥40% length coverage)
    matched_store_id = None
    matched_store_name = None
    if stores_catalog and supplier:
        supp_norm = re.sub(r'[^א-תa-zA-Z0-9]+', '', supplier).lower()
        if len(supp_norm) >= 4 and supp_norm not in _GENERIC_NORMS:
            for sname, sdata in stores_catalog.items():
                sname_norm = re.sub(r'[^א-תa-zA-Z0-9]+', '', sname).lower()
                min_len = min(len(supp_norm), len(sname_norm))
                max_len = max(len(supp_norm), len(sname_norm))
                if min_len >= 4 and (supp_norm in sname_norm or sname_norm in supp_norm) and (min_len / max_len) >= 0.4:
                    matched_store_id = sdata.get("id")
                    matched_store_name = sname
                    break

    tags = raw_deal.get("sourceTags") or raw_deal.get("tags") or []
    if isinstance(tags, str):
        tags = [tags]

    return {
        "id": category_id,
        "category_id": category_id,
        "title": title,
        "supplier": supplier,
        "category": cat_name,
        "tags": tags,
        "image": image,
        "url": deal_url,
        "price": main_price,
        "original_price": main_orig,
        "discount_percent": discount_pct,
        "deal_type": deal_type,
        "is_external": is_external,
        "locations": loc_str,
        "shipping_included": shipping_included,
        "expiration_date": raw_deal.get("expireDate") or raw_deal.get("eventDate") or "",
        "limits": str(raw_deal.get("monthlyLimit") or raw_deal.get("orderLimit") or ""),
        "description": clean_desc,
        "terms_of_use": clean_terms,
        "variants": parsed_variants,
        "matched_store_id": matched_store_id,
        "matched_store_name": matched_store_name
    }


def launch_stealth_context(p, profile_dir, headless=False, channel=None):
    """Launch Chromium context with stealth flags to bypass Incapsula WAF."""
    profile_path = Path(profile_dir).resolve()
    profile_path.mkdir(parents=True, exist_ok=True)

    launch_args = [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-infobars"
    ]
    channels = [channel] if channel else ["chrome", "msedge", None]

    for ch in channels:
        try:
            kwargs = {
                "user_data_dir": str(profile_path),
                "headless": headless,
                "args": launch_args,
                "ignore_default_args": ["--enable-automation"],
                "locale": "he-IL",
                "timezone_id": "Asia/Jerusalem",
                "viewport": {"width": 1400, "height": 900}
            }
            if ch:
                kwargs["channel"] = ch
                print(f"[*] Launching persistent browser using channel '{ch}'...")
            else:
                print("[*] Launching persistent browser using bundled Chromium...")

            return p.chromium.launch_persistent_context(**kwargs)
        except Exception as e:
            msg = str(e).split('\n')[0]
            if ch:
                print(f"[*] Channel '{ch}' not available ({msg}), trying next option...")
            else:
                print(f"[!] Bundled Chromium launch failed: {msg}")

    raise RuntimeError("Could not launch any browser! Please run: playwright install chromium")


def wait_for_user_login(page):
    """Detect if page redirected to /login and wait for user authentication."""
    try:
        is_login = "/login" in page.url or page.locator("input[type='tel'], input[placeholder*='תעודת'], button:has-text('כניסה')").count() > 0
    except Exception:
        is_login = "/login" in page.url

    if is_login:
        print("\n" + "=" * 65)
        print(" [!] ACTION REQUIRED: Behatsdaa Login Needed")
        print("=" * 65)
        print(" Behatsdaa requires logging in to access cards and participating stores.")
        print(" -> Enter your ID & SMS code in the opened Chrome/Edge window.")
        try:
            input(" -> Once you are logged in on screen, press [Enter] here to continue: ")
            print("[+] Login confirmed! Resuming scraper...")
            page.wait_for_timeout(2000)
        except Exception:
            pass
        print("=" * 65 + "\n")


def fetch_wallets_via_evaluate(page):
    """Execute high-speed API extraction inside active browser session for rechargeable cards."""
    return page.evaluate("""
        async () => {
            const headers = {
                "OrganizationId": "20",
                "Accept": "application/json"
            };

            // 1. Retrieve all cards/wallets
            let wallets = [];
            try {
                const genRes = await window.fetch("https://back.behatsdaa.org.il/api/cards/GetCardGeneralInfo", {
                    headers,
                    credentials: "include"
                });
                const genJson = await genRes.json();
                wallets = genJson?.data?.wallets || [];
            } catch (e) {
                return { error: 'GetCardGeneralInfo failed: ' + e.toString() };
            }

            if (!wallets || wallets.length === 0) {
                return { error: 'No wallets returned from GetCardGeneralInfo' };
            }

            // 2. Fetch all stores for each wallet
            const results = [];
            for (const w of wallets) {
                const wid = w.walletID;
                try {
                    const chainRes = await window.fetch(`https://back.behatsdaa.org.il/api/cards/GetWalletChain?walletId=${wid}`, {
                        headers,
                        credentials: "include"
                    });
                    const chainJson = await chainRes.json();
                    results.push({
                        wallet: w,
                        categories: chainJson?.data || []
                    });
                } catch (err) {
                    results.push({
                        wallet: w,
                        error: err.toString(),
                        categories: []
                    });
                }
            }
            return { ok: true, results };
        }
    """)


def fetch_deals_via_evaluate(page, max_deals=None):
    """Execute deep catalog scraping for rotating deals, coupons, and vouchers."""
    return page.evaluate("""
        async (maxCount) => {
            const headers = {
                "OrganizationId": "20",
                "Accept": "application/json"
            };

            const dealsMap = new Map();
            const discoveredTags = [];

            function extractFromInfo(info) {
                if (!info) return [];
                if (Array.isArray(info.categories)) return info.categories;
                if (info.categories && typeof info.categories === "object") return [info.categories];
                if (info.categoryId || info.id) return [info];
                return [];
            }

            // 1. Fetch top tags from homepage (holiday specials, featured carousels)
            try {
                const topTagsRes = await window.fetch("https://back.behatsdaa.org.il/api/tags/GetCategorysByTopTag?selectTop=50&skipTags=0", {
                    headers,
                    credentials: "include"
                });
                const topTagsJson = await topTagsRes.json();
                const tagsData = topTagsJson?.data?.data || topTagsJson?.data || [];

                for (const tag of tagsData) {
                    const tagId = tag.tagId;
                    const tagName = (tag.tagName || "").trim();
                    if (tagName) discoveredTags.push({ id: tagId, name: tagName });

                    const categoryInfos = tag.tagCategoryInfo || [];
                    for (const catInfo of categoryInfos) {
                        for (const cat of extractFromInfo(catInfo)) {
                            if (cat && (cat.categoryId || cat.id)) {
                                const cid = String(cat.categoryId || cat.id);
                                if (!dealsMap.has(cid)) {
                                    cat.sourceTags = tagName ? [tagName] : [];
                                    dealsMap.set(cid, cat);
                                } else {
                                    const existing = dealsMap.get(cid);
                                    if (tagName && (!existing.sourceTags || !existing.sourceTags.includes(tagName))) {
                                        existing.sourceTags = existing.sourceTags || [];
                                        existing.sourceTags.push(tagName);
                                    }
                                }
                            }
                        }
                    }

                    // Also fetch full items under this specific tag
                    try {
                        const tagFullRes = await window.fetch(`https://back.behatsdaa.org.il/api/tags/GetCategorysByTagID?tagid=${tagId}`, {
                            headers,
                            credentials: "include"
                        });
                        const tagFullJson = await tagFullRes.json();
                        const fullInfo = tagFullJson?.data?.data?.tagCategoryInfo || tagFullJson?.data?.tagCategoryInfo || [];
                        for (const catInfo of fullInfo) {
                            for (const cat of extractFromInfo(catInfo)) {
                                if (cat && (cat.categoryId || cat.id)) {
                                    const cid = String(cat.categoryId || cat.id);
                                    if (!dealsMap.has(cid)) {
                                        cat.sourceTags = tagName ? [tagName] : [];
                                        dealsMap.set(cid, cat);
                                    } else {
                                        const existing = dealsMap.get(cid);
                                        if (tagName && (!existing.sourceTags || !existing.sourceTags.includes(tagName))) {
                                            existing.sourceTags = existing.sourceTags || [];
                                            existing.sourceTags.push(tagName);
                                        }
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        // ignore single tag error
                    }
                }
            } catch (err) {
                console.warn("Failed fetching top tags:", err);
            }

            // 2. Fetch full category hierarchy and crawl sub-categories for all products
            try {
                const catHeaderRes = await window.fetch("https://back.behatsdaa.org.il/api/category/GetCategoryHeader", {
                    headers,
                    credentials: "include"
                });
                const catHeaderJson = await catHeaderRes.json();
                const headerData = catHeaderJson?.data?.data || catHeaderJson?.data || [];

                const subCategoryList = [];
                function extractSubCategories(nodes, parentName) {
                    if (!nodes || !Array.isArray(nodes)) return;
                    for (const n of nodes) {
                        const curName = n.categoryName || parentName || "צרכנות";
                        if (n.children && n.children.length > 0) {
                            extractSubCategories(n.children, curName);
                        } else if (n.subCategories && n.subCategories.length > 0 && !n.isLeaf) {
                            extractSubCategories(n.subCategories, curName);
                        } else if (n.categoryId || n.id) {
                            subCategoryList.push({
                                id: String(n.categoryId || n.id),
                                name: curName,
                                parent: parentName || curName
                            });
                        }
                    }
                }
                extractSubCategories(headerData, "צרכנות");

                // Fetch products from each subcategory
                for (const sub of subCategoryList) {
                    try {
                        const subRes = await window.fetch(`https://back.behatsdaa.org.il/api/category/GetCategoryById?categoryId=${sub.id}`, {
                            headers,
                            credentials: "include"
                        });
                        const subJson = await subRes.json();
                        const products = subJson?.data?.subCategories || subJson?.data?.categories || [];
                        for (const p of products) {
                            if (p && (p.categoryId || p.id)) {
                                const pid = String(p.categoryId || p.id);
                                if (!dealsMap.has(pid)) {
                                    p.category = sub.parent;
                                    p.sourceTags = [sub.name];
                                    dealsMap.set(pid, p);
                                } else {
                                    const existing = dealsMap.get(pid);
                                    if (!existing.sourceTags.includes(sub.name)) {
                                        existing.sourceTags.push(sub.name);
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        // ignore single subcategory error
                    }
                }
            } catch (err) {
                console.warn("Failed fetching category header:", err);
            }

            // 3. Deep-fetch product details & variants in batches if needed
            const rawDeals = Array.from(dealsMap.values());
            const dealsToFetch = maxCount ? rawDeals.slice(0, maxCount) : rawDeals;
            const finalDeals = [];

            const batchSize = 6;
            for (let i = 0; i < dealsToFetch.length; i += batchSize) {
                const batch = dealsToFetch.slice(i, i + batchSize);
                const promises = batch.map(async (deal) => {
                    const cid = deal.categoryId || deal.id;
                    if (deal.variants && deal.variants.length > 0 && (deal.howToUse || deal.termsOfUse)) {
                        return deal;
                    }
                    try {
                        const pRes = await window.fetch(`https://back.behatsdaa.org.il/api/category/GetCategoryProducts?categoryId=${cid}`, {
                            headers,
                            credentials: "include"
                        });
                        const pJson = await pRes.json();
                        if (pJson?.data?.data) {
                            const detail = pJson.data.data;
                            detail.sourceTags = deal.sourceTags || [];
                            if (!detail.category && deal.category) detail.category = deal.category;
                            return detail;
                        }
                    } catch (err) {
                        // ignore and use shallow deal
                    }
                    return deal;
                });

                const batchResults = await Promise.all(promises);
                finalDeals.push(...batchResults);
            }

            return {
                ok: true,
                deals: finalDeals,
                tags: discoveredTags
            };
        }
    """, max_deals)


def save_catalog(final_stores_list, discovered_cards, output_dir, card_url):
    """Save finalized stores list into stores.json and stores.csv."""
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    json_path = output_dir / "stores.json"
    csv_path = output_dir / "stores.csv"

    all_categories = sorted(list({s.get("category", "כללי") for s in final_stores_list if s.get("category")}))
    if "הכל" not in all_categories:
        all_categories.insert(0, "הכל")

    output_payload = {
        "metadata": {
            "title": "רשימת רשתות מכבדות - כרטיסי בהצדעה",
            "source": card_url,
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "total_stores": len(final_stores_list),
            "available_cards": discovered_cards,
            "categories": all_categories
        },
        "stores": final_stores_list
    }

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(output_payload, f, ensure_ascii=False, indent=2)
    print(f"[+] Saved stores JSON catalog to: {json_path}")

    with open(csv_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "שם הרשת / העסק",
            "קטגוריה",
            "כרטיסים תומכים",
            "הנחה מרבית %",
            "פירוט הנחות לפי כרטיס",
            "אתר אינטרנט",
            "תנאים והגבלות"
        ])
        for s in final_stores_list:
            card_names = ", ".join([c["card_name"] for c in s.get("cards", [])])
            breakdown = " | ".join([f"{c['card_name']}: {c['discount']}" for c in s.get("cards", [])])
            writer.writerow([
                s.get("name", ""),
                s.get("category", ""),
                card_names,
                s.get("max_discount", 0),
                breakdown,
                s.get("website", ""),
                s.get("conditions", "")
            ])
    print(f"[+] Saved stores CSV catalog to: {csv_path}")


def save_deals(final_deals_list, discovered_tags, output_dir, home_url):
    """Save finalized deals and vouchers into deals.json and deals.csv."""
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    json_path = output_dir / "deals.json"
    csv_path = output_dir / "deals.csv"

    all_categories = sorted(list({d.get("category", "כללי") for d in final_deals_list if d.get("category")}))
    if "הכל" not in all_categories:
        all_categories.insert(0, "הכל")

    all_tags = sorted(list({t for d in final_deals_list for t in d.get("tags", [])}))

    output_payload = {
        "metadata": {
            "title": "מבצעים ושוברים ייעודיים - בהצדעה",
            "source": home_url,
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "total_deals": len(final_deals_list),
            "tags": all_tags,
            "categories": all_categories
        },
        "deals": final_deals_list
    }

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(output_payload, f, ensure_ascii=False, indent=2)
    print(f"[+] Saved deals JSON catalog to: {json_path}")

    with open(csv_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "מזהה",
            "שם המוצר / שובר",
            "ספק / מותג",
            "קטגוריה",
            "מחיר בהצדעה ₪",
            "מחיר מקורי ₪",
            "אחוז חיסכון %",
            "תגיות מבצע",
            "מיקום / משלוח",
            "תוקף המבצע",
            "הגבלת רכישה",
            "רשת מקושרת",
            "קישור למוצר"
        ])
        for d in final_deals_list:
            writer.writerow([
                d.get("id", ""),
                d.get("title", ""),
                d.get("supplier", ""),
                d.get("category", ""),
                d.get("price", 0),
                d.get("original_price", 0),
                f"{d.get('discount_percent', 0)}%",
                ", ".join(d.get("tags", [])),
                d.get("locations", ""),
                d.get("expiration_date", ""),
                d.get("limits", ""),
                d.get("matched_store_name") or "ללא",
                d.get("url", "")
            ])
    print(f"[+] Saved deals CSV catalog to: {csv_path}")


def scrape_with_playwright(args):
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

    # Load existing stores.json for deal cross-linking if deals-only
    stores_path = Path(args.output_dir) / "stores.json"
    if stores_path.exists():
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

        # Navigate & check authentication
        nav_url = args.home_url if args.deals_only else args.card_url
        print(f"\n[1/3] Navigating to: {nav_url}")
        try:
            page.goto(nav_url, wait_until="domcontentloaded", timeout=args.timeout)
        except Exception as e:
            print(f"[*] Navigation note: {e}")

        wait_for_user_login(page)
        time.sleep(2)

        # 1. Scrape Cards (unless deals-only)
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
                print(f"[+] Successfully retrieved data for {len(results)} cards in {time.time() - start_time:.2f}s!")

                for item in results:
                    w = item["wallet"]
                    wid = str(w.get("walletID"))
                    wname = (w.get("walletName") or f"כרטיס ארנק {wid}").strip()
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

        # 2. Scrape Deals & Vouchers (unless cards-only)
        if not args.cards_only:
            print("\n[3/3] Extracting rotating deals, coupons, and vouchers across all categories...")
            start_time = time.time()
            deals_result = None
            try:
                deals_result = fetch_deals_via_evaluate(page, max_deals=args.max_deals)
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

        context.close()

    # Save Stores Catalog
    if not args.deals_only and all_scraped_stores:
        final_stores_list = list(all_scraped_stores.values())
        print(f"\n[+] Total unique stores saved: {len(final_stores_list)}")
        save_catalog(final_stores_list, discovered_cards, args.output_dir, args.card_url)

    # Save Deals Catalog
    if not args.cards_only and final_deals_list:
        print(f"[+] Total unique deals & vouchers saved: {len(final_deals_list)}")
        save_deals(final_deals_list, discovered_tags, args.output_dir, args.home_url)

    print("\n[SUCCESS] Scraping completed successfully!")


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


def main():
    args = parse_arguments()
    if args.import_deals:
        import_deals_from_file(args)
    else:
        scrape_with_playwright(args)


if __name__ == "__main__":
    main()
