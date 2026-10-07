"""
Data parsing, normalization, and catalog merging logic for Behatsdaa stores and deals.
"""

import re
import html
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


def clean_html(text):
    """Strip HTML tags and unescape entities, returning clean normalized plain text."""
    if not text:
        return ""
    clean = re.sub(r'<(?:br|br\s*/|p|/p|div|/div|li|/li)>', ' ', str(text), flags=re.IGNORECASE)
    clean = re.sub(r'<[^>]+>', ' ', clean)
    clean = html.unescape(clean)
    clean = re.sub(r'\s+', ' ', clean).strip()
    return clean


def get_color_theme(wallet_id):
    """Map wallet ID to CSS color theme name."""
    mapping = {
        "2809": "emerald",
        "3336": "amber",
        "3294": "blue",
        "2595": "teal",
        "2110": "indigo",
        "2868": "rose",
    }
    return mapping.get(str(wallet_id), "slate")


def get_badge_class(wallet_id):
    """Map wallet ID to CSS badge class name."""
    mapping = {
        "2809": "badge-emerald",
        "3336": "badge-amber",
        "3294": "badge-blue",
        "2595": "badge-teal",
        "2110": "badge-indigo",
        "2868": "badge-rose",
    }
    return mapping.get(str(wallet_id), "badge-slate")


def build_wallet_info_entry(w, caps_dict=None):
    """Construct a clean, normalized wallet metadata object for wallets_info.json."""
    raw_id = str(
        w.get("wallet_id")
        or w.get("walletId")
        or w.get("walletID")
        or w.get("id")
        or ""
    ).strip()
    wid = re.sub(r'^card-', '', raw_id)

    name = (w.get("walletName") or w.get("name") or "").strip()
    short_name = (w.get("short_name") or re.sub(r'^בהצדעה\s*[-–]?\s*', '', name)).strip() or name

    disc_val = w.get("discount")
    if disc_val is None:
        disc_val = w.get("discount_numeric")
    if disc_val is None:
        disc_val = w.get("discountNumeric")
    if disc_val is None:
        disc_val = w.get("discountRate")
    if disc_val is None:
        disc_val = w.get("discount_default")
    disc = extract_discount_percent(disc_val)

    # Monthly cap: if explicitly provided on wallet, use it; otherwise check fighter vs general cap
    general_monthly = caps_dict.get("monthly_cap_general", 3000) if caps_dict else 3000
    fighter_monthly = caps_dict.get("monthly_cap_fighter", 2500) if caps_dict else 2500
    instant_balance = caps_dict.get("instant_balance_cap", 1000) if caps_dict else 1000

    raw_monthly = w.get("monthly_cap") or w.get("monthlyCap") or w.get("maxMonthly")
    if raw_monthly is not None:
        monthly_cap = int(safe_float(raw_monthly, 3000))
    elif wid == "3336":
        monthly_cap = fighter_monthly
    else:
        monthly_cap = general_monthly

    raw_instant = w.get("instant_cap") or w.get("instantCap") or w.get("balanceCap")
    if raw_instant is not None and 0 < safe_float(raw_instant) <= 1500:
        instant_cap = int(safe_float(raw_instant))
    else:
        instant_cap = instant_balance

    scope = w.get("categoryScope") or w.get("scope") or w.get("category_scope") or ""
    desc = w.get("terms") or w.get("notes") or w.get("description") or ""

    KNOWN_SCOPES = {
        "2809": "רשתות אופנה, הלבשה, הנעלה, ספרים, ספורט ופנאי בפריסה ארצית",
        "3336": "כרטיס ייעודי למשרתי מילואים פעילים ולוחמים בעלי כרטיס פייטר",
        "3294": "סניפי קרפור סיטי וקרפור מרקט בלבד",
        "2595": "סופרמרקטים, רשתות מזון ואתרי אונליין נבחרים",
        "2110": "רשתות אופנה, ביגוד ומסחר בפריסה ארצית",
        "2868": "בתי קפה, מסעדות ורשתות מזון מהיר"
    }
    KNOWN_DESCS = {
        "2809": "הנחת רשתות בטעינה מראש של עד 1,000 ₪ בכל פעם עד 3,000 ₪ בחודש. תקף במגוון רשתות מובילות.",
        "3336": "ארנק בלעדי למחזיקי כרטיס פייטר. כפוף לתקרה חודשית של 2,500 ₪.",
        "3294": "הנחה ברשת קרפור בסניפי סיטי ומרקט בלבד. אינו כולל סניפי היפר או אתר האונליין.",
        "2595": "הנחה בטעינה לכרטיס עבור רשתות שיווק מזון ואתרי סחר אונליין.",
        "2110": "הנחה ברשתות נבחרות בפריסה ארצית עד לתקרה החודשית.",
        "2868": "הנחה בבתי קפה ומסעדות נבחרות בכל רחבי הארץ."
    }

    if not scope and wid in KNOWN_SCOPES:
        scope = KNOWN_SCOPES[wid]
    if not desc and wid in KNOWN_DESCS:
        desc = KNOWN_DESCS[wid]

    return {
        "id": f"card-{wid}",
        "name": name,
        "short_name": short_name,
        "discount": disc,
        "color_theme": get_color_theme(wid),
        "badge_class": get_badge_class(wid),
        "monthly_cap": monthly_cap,
        "instant_cap": instant_cap,
        "category_scope": scope,
        "description": desc
    }


def parse_caps_and_rules(extracted_caps=None, extracted_rules=None, page_text=None):
    """
    Dynamically extract and update spending caps and club rules from scraped page content and API.
    Merges live official site terms with verified baseline rules.
    """
    caps = {
        "monthly_cap_general": 3000,
        "monthly_cap_fighter": 2500,
        "instant_balance_cap": 1000,
        "min_reload": 100,
        "daily_cap": "ללא מגבלה יומית נפרדת (בכפוף לתקרה החודשית וליתרת 1,000 ₪ רגעית)"
    }
    if extracted_caps and isinstance(extracted_caps, dict):
        for k, v in extracted_caps.items():
            if v is not None and v != "":
                caps[k] = v

    if page_text:
        text = clean_html(page_text)

        # Monthly general cap: e.g. "תקרה חודשית של 3,000 ₪" or "עד 3000 ₪"
        m_gen = re.search(r'(?:תקרה חודשית|עד ל?תקרה של|תקרת הטעינה מוגבלת ל-?)[^\n.]{0,40}?\b([1-9]\d{0,1}[,\.]?\d{3})\s*₪', text)
        if m_gen:
            try:
                caps["monthly_cap_general"] = int(re.sub(r'[^\d]', '', m_gen.group(1)))
            except ValueError:
                pass

        # Fighter cap: e.g. "פייטר ... 2,500 ₪"
        m_fight = re.search(r'(?:פייטר|לוחם|fighter)[^\n.]{0,80}?(?:תקרה|עד)\s*([1-9]\d{0,1}[,\.]?\d{3})\s*₪', text, re.IGNORECASE)
        if m_fight:
            try:
                caps["monthly_cap_fighter"] = int(re.sub(r'[^\d]', '', m_fight.group(1)))
            except ValueError:
                pass

        # Instant cap: e.g. "יתרה רגעית ... 1,000 ₪"
        m_inst = re.search(r'(?:יתרה רגעית|יתרה מקסימלית|סכום כולל)[^\n.]{0,40}?\b([1-9]\d{0,1}[,\.]?\d{3})\s*₪', text)
        if m_inst:
            try:
                caps["instant_balance_cap"] = int(re.sub(r'[^\d]', '', m_inst.group(1)))
            except ValueError:
                pass

        # Min reload: e.g. "טעינה מינימלית של 100 ₪"
        m_min = re.search(r'(?:מינימום|טעינה מינימלית|החל מ-?)[^\n.]{0,40}?\b([1-9]\d{1,2})\s*₪', text)
        if m_min:
            try:
                caps["min_reload"] = int(m_min.group(1))
            except ValueError:
                pass

    rules = [
        {
            "id": "instant_cap",
            "title": f"תקרת יתרה רגעית (עד {caps['instant_balance_cap']:,} ₪)",
            "summary": f"ניתן להחזיק בכרטיס סכום כולל של עד {caps['instant_balance_cap']:,} ₪ בכל רגע נתון. לאחר ביצוע תשלום בקופה, ניתן לטעון מחדש עד {caps['instant_balance_cap']:,} ₪ נוספים בכל פעם עד לתקרה החודשית."
        },
        {
            "id": "monthly_cap",
            "title": f"תקרה חודשית קלנדרית (עד {caps['monthly_cap_general']:,} ₪)",
            "summary": f"תקרת הטעינה מוגבלת ל-{caps['monthly_cap_general']:,} ₪ בחודש קלנדרי (פייטר: {caps['monthly_cap_fighter']:,} ₪)."
        },
        {
            "id": "billing_discount",
            "title": "חיוב בניכוי ההנחה ובתשלום יחיד",
            "summary": "החיוב באשראי בהצדעה מתבצע בתשלום אחד ובסכום המוזל (למשל: 800 ₪ עבור טעינת 1,000 ₪ בארנק של 20%)."
        },
        {
            "id": "promotions_stacking",
            "title": "כפל מבצעים והנחות סוף עונה",
            "summary": "הכרטיס מכובד כולל כפל מבצעים והנחות סוף עונה במרבית הרשתות המובילות."
        }
    ]

    if extracted_rules and isinstance(extracted_rules, list):
        existing_ids = {r["id"] for r in rules}
        existing_titles = {r["title"] for r in rules}
        for idx, er in enumerate(extracted_rules, start=1):
            if not isinstance(er, dict):
                continue
            rid = er.get("id") or f"rule_{idx}"
            rtitle = er.get("title", "").strip()
            rsummary = er.get("summary", "").strip()
            if not rtitle or not rsummary:
                continue

            matched = False
            for r in rules:
                if r["id"] == rid or r["title"] == rtitle:
                    r["summary"] = rsummary
                    matched = True
                    break
            if not matched and rtitle not in existing_titles:
                rules.append({
                    "id": rid,
                    "title": rtitle,
                    "summary": rsummary
                })
                existing_titles.add(rtitle)

    return caps, rules


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
    """Parse list of categories and chains returned by GetWalletChain or GetShopsByWalletId API."""
    stores = []
    card_id = card_info["id"]
    card_name = card_info["name"]
    card_discount_str = card_info["discount_default"]
    card_discount_num = card_info["discount_numeric"]

    for cat in categories:
        cat_name = (cat.get("tagName") or cat.get("categoryName") or "כללי").strip()
        chains = cat.get("walletChainData") or cat.get("shops") or cat.get("chains") or []
        # If cat itself is a shop item
        if not chains and (cat.get("chainName") or cat.get("shopName")):
            chains = [cat]

        for chain in chains:
            name = (chain.get("chainName") or chain.get("shopName") or "").strip()
            if not name:
                continue

            # Filter out UI anomalies
            if any(bad in name for bad in ["סל קניות", "תעודת זהות", "לטעינה", "תשלום בקופה", "ביטול טעינה", "מספר כרטיס המועדון"]):
                continue

            raw_conditions = (
                chain.get("remarks")
                or chain.get("conditions")
                or chain.get("terms")
                or chain.get("restrictions")
                or chain.get("comments")
                or ""
            )
            conditions = clean_html(raw_conditions)

            raw_card_notes = (
                chain.get("cardNotes")
                or chain.get("discountRemarks")
                or chain.get("walletRemarks")
                or chain.get("notes")
                or ""
            )
            card_notes = clean_html(raw_card_notes)

            stores.append({
                "name": name,
                "chain_id": str(chain.get("chainID") or chain.get("shopId") or chain.get("id") or ""),
                "category": cat_name,
                "logo": chain.get("logoURL") or chain.get("logoUrl") or "",
                "website": chain.get("webSite") or chain.get("websiteUrl") or chain.get("website") or "",
                "card_id": card_id,
                "card_name": card_name,
                "discount": card_discount_str,
                "discount_numeric": card_discount_num,
                "conditions": conditions,
                "card_notes": card_notes
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

        # Update store-level conditions if empty or if new is longer/more detailed
        incoming_cond = s.get("conditions") or ""
        if incoming_cond:
            if not store_entry.get("conditions"):
                store_entry["conditions"] = incoming_cond
            elif incoming_cond not in store_entry["conditions"] and len(incoming_cond) > len(store_entry["conditions"]):
                store_entry["conditions"] = incoming_cond

        card_notes = s.get("card_notes") or s.get("notes") or ""

        # Add card if not already linked
        linked_card_ids = {c["card_id"] for c in store_entry["cards"]}
        if card_id not in linked_card_ids:
            store_entry["cards"].append({
                "card_id": card_id,
                "card_name": card_name,
                "discount": discount_str,
                "discount_numeric": discount_num,
                "notes": card_notes
            })
        else:
            # Backfill notes on existing card entry if empty
            for c in store_entry["cards"]:
                if c["card_id"] == card_id and not c.get("notes") and card_notes:
                    c["notes"] = card_notes

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
    variants_raw = raw_deal.get("subProducts") or raw_deal.get("variants") or raw_deal.get("pricesList") or []
    parsed_variants = []
    prices = []
    original_prices = []

    for idx, v in enumerate(variants_raw):
        v_price = safe_float(v.get("price") or v.get("memberPrice"))
        v_orig = safe_float(v.get("originalPrice") or v.get("original_price") or v.get("discount"))
        v_name = (v.get("name") or v.get("title") or title).strip()
        v_barcode = str(v.get("barCode") or v.get("barcode") or "")
        v_stock = v.get("stock") or ("אזל במלאי" if v.get("outofStock") else "במלאי")

        # v_orig is the ORIGINAL (pre-discount) price from the API.
        # On Behatsdaa the "discount" field actually stores the original price, not a reduction amount.
        orig_price = v_orig if v_orig > v_price else v_price

        explicit_pct = v.get("discountPercent") or v.get("discount_percent") or v.get("savings_percent")
        if explicit_pct is not None:
            disc_pct = extract_discount_percent(explicit_pct)
        else:
            disc_pct = round(((orig_price - v_price) / orig_price) * 100) if orig_price > v_price else 0

        parsed_variants.append({
            "id": str(v.get("id") or v.get("subProductId") or f"v-{category_id}-{idx}"),
            "name": v_name,
            "title": v_name,
            "price": v_price,
            "original_price": orig_price if orig_price > v_price else (orig_price if orig_price > 0 else None),
            "discount_percent": disc_pct,
            "savings_percent": disc_pct if disc_pct > 0 else None,
            "barcode": v_barcode,
            "stock": v_stock,
            "expire_date": v.get("expireDate") or v.get("expire_date") or v.get("validTo") or raw_deal.get("validTo") or raw_deal.get("expirationDate") or raw_deal.get("eventDate") or ""
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
    branches = raw_deal.get("branches") or raw_deal.get("redemptionLocations")
    locs = raw_deal.get("locations") or []
    loc_str = "מגוון סניפים"
    shipping_included = False
    business = raw_deal.get("business") or {}

    if isinstance(branches, list) and branches:
        branch_names = [
            (b.get("name") or b.get("address") or str(b)).strip()
            for b in branches
            if isinstance(b, dict) and (b.get("name") or b.get("address"))
        ]
        if branch_names:
            loc_str = ", ".join(branch_names)
    elif isinstance(business, dict) and business.get("address"):
        loc_str = business["address"].strip()
    elif isinstance(locs, list) and locs:
        loc_str = ", ".join([l.get("address", "") for l in locs if isinstance(l, dict) and l.get("address")]) or "מגוון סניפים"
    elif isinstance(locs, str) and locs.strip():
        loc_str = locs.strip()

    raw_desc = raw_deal.get("description") or raw_deal.get("shortDescription") or raw_deal.get("categoryHTML") or ""
    clean_desc = clean_html(raw_desc)

    raw_terms = (
        raw_deal.get("termsOfUse")
        or raw_deal.get("usageInstructions")
        or raw_deal.get("notes")
        or raw_deal.get("remarks")
        or raw_deal.get("howToUse")
        or raw_deal.get("redimType")
        or ""
    )
    clean_terms = clean_html(raw_terms)

    raw_limits = (
        raw_deal.get("purchaseLimits")
        or raw_deal.get("maxQuantityPerUser")
        or raw_deal.get("monthlyLimit")
        or raw_deal.get("orderLimit")
        or ""
    )
    if not raw_limits and raw_deal.get("maxQuantity"):
        raw_limits = f"עד {raw_deal['maxQuantity']} יחידות למנוי"
    clean_limits = clean_html(raw_limits)

    expiration_date = (
        raw_deal.get("validTo")
        or raw_deal.get("expirationDate")
        or raw_deal.get("expireDate")
        or raw_deal.get("eventDate")
        or ""
    )

    if "משלוח" in title or "משלוח" in clean_desc or "משלוח" in clean_terms:
        shipping_included = True
        if not locs and not branches and (not isinstance(business, dict) or not business.get("address")):
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
        "expiration_date": expiration_date,
        "limits": clean_limits,
        "description": clean_desc,
        "terms_of_use": clean_terms,
        "variants": parsed_variants,
        "matched_store_id": matched_store_id,
        "matched_store_name": matched_store_name
    }

