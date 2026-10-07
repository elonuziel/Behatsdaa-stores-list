"""
Behatsdaa Scraper Core Package
Provides modular parsers, authentication, browser extractors, storage, and dependency utilities.
"""

from .parsers import (
    extract_discount_percent,
    generate_store_id,
    parse_chains_from_categories,
    merge_stores_into_catalog,
    safe_float,
    parse_deal,
)
from .deps import (
    check_and_install_playwright,
    is_chromium_installed,
    install_chromium_browser,
    check_and_install_chromium,
    check_all_requirements,
)
from .auth import (
    launch_stealth_context,
    check_is_authenticated,
    wait_for_user_login,
    ensure_authenticated_session,
)
from .extractors import (
    fetch_wallets_via_evaluate,
    fetch_deals_via_evaluate,
)
from .storage import (
    save_catalog,
    save_deals,
)
from .importers import (
    import_deals_from_file,
    import_cards_from_file,
    find_downloaded_file,
)

__all__ = [
    "extract_discount_percent",
    "generate_store_id",
    "parse_chains_from_categories",
    "merge_stores_into_catalog",
    "safe_float",
    "parse_deal",
    "check_and_install_playwright",
    "is_chromium_installed",
    "install_chromium_browser",
    "check_and_install_chromium",
    "check_all_requirements",
    "launch_stealth_context",
    "check_is_authenticated",
    "wait_for_user_login",
    "ensure_authenticated_session",
    "fetch_wallets_via_evaluate",
    "fetch_deals_via_evaluate",
    "save_catalog",
    "save_deals",
    "import_deals_from_file",
    "import_cards_from_file",
    "find_downloaded_file",
]

