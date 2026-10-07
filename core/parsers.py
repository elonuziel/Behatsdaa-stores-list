"""
Data parsing, normalization, and catalog merging logic for Behatsdaa stores and deals.
"""

import re
from datetime import datetime, timezone
from urllib.parse import urljoin

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
    """Safely convert a string, int, or float into a float, cleaning non-numeric symbols."""
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
    if raw_cat and raw_cat != title and (raw_cat in _SUPER_CATS or len(raw_cat) <= 30):
        cat_name = raw_cat.strip()
    else:
        cat_name = (raw_deal.get("parentCategoryName") or "").strip()
        if not cat_name and raw_deal.get("breadcrumbs"):
            crumbs = raw_deal.get("breadcrumbs")
            if isinstance(crumbs, list) and crumbs:
                cat_name = crumbs[0].get("name", "")
        if not cat_name:
            tags_list = raw_deal.get("sourceTags") or []
            if tags_list:
                cat_name = tags_list[0]
        if not cat_name:
            cat_name = "כללי"

    # Determine deal type
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

    # Locations & Shipping
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

    # Cross-link with stores in catalog
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

