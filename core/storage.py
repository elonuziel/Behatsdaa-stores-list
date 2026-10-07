"""
Catalog persistence and export utilities (JSON and Excel-compatible UTF-8 BOM CSV).
"""

import json
import csv
from datetime import datetime, timezone
from pathlib import Path


DEFAULT_GENERAL_CAPS = {
    "monthly_cap_general": 3000,
    "monthly_cap_fighter": 2500,
    "instant_balance_cap": 1000,
    "min_reload": 100,
    "daily_cap": "ללא מגבלה יומית נפרדת (בכפוף לתקרה החודשית וליתרת 1,000 ₪ רגעית)"
}

DEFAULT_GENERAL_RULES = [
    {
        "id": "instant_cap",
        "title": "תקרת יתרה רגעית (עד 1,000 ₪)",
        "summary": "ניתן להחזיק בכרטיס סכום כולל של עד 1,000 ₪ בכל רגע נתון. לאחר ביצוע תשלום בקופה, ניתן לטעון מחדש עד 1,000 ₪ נוספים בכל פעם עד לתקרה החודשית."
    },
    {
        "id": "monthly_cap",
        "title": "תקרה חודשית קלנדרית (עד 3,000 ₪)",
        "summary": "תקרת הטעינה מוגבלת ל-3,000 ₪ בחודש קלנדרי (פייטר: 2,500 ₪)."
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


def save_wallets_info(wallets, general_caps=None, general_rules=None, output_dir="data"):
    """Save finalized wallets metadata, caps, and rules into wallets_info.json."""
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    json_path = output_dir / "wallets_info.json"

    payload = {
        "metadata": {
            "title": "תנאי שימוש, תקרות טעינה וכללי כרטיסים נטענים - מועדון בהצדעה",
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "general_caps": general_caps or DEFAULT_GENERAL_CAPS,
            "general_rules": general_rules or DEFAULT_GENERAL_RULES
        },
        "wallets": wallets
    }

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    print(f"[+] Saved wallets info JSON to: {json_path}")
    return json_path


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

