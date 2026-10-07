"""
Dependency management, Playwright detection, and interactive repair utilities.
"""

import sys
import shutil
import subprocess
from pathlib import Path


def check_and_install_playwright(prompt_install=True):
    """Verify that playwright is installed. If missing, prompt user to auto-install."""
    try:
        import playwright
        from playwright.sync_api import sync_playwright
        return True
    except ImportError:
        pass

    print("\n" + "=" * 62)
    print(" [!] Missing Requirement: Python package 'playwright' is not installed.")
    print("=" * 62)

    if not prompt_install or not sys.stdin.isatty():
        print(f" Please run: {sys.executable} -m pip install -r requirements.txt\n")
        return False

    try:
        ans = input(" Would you like to install required packages automatically now? [Y/n]: ").strip().lower()
    except (KeyboardInterrupt, EOFError):
        print("\nCancelled.")
        return False

    if ans not in ["", "y", "yes"]:
        print("[!] Package installation skipped.")
        return False

    req_file = Path(__file__).resolve().parent.parent / "requirements.txt"
    install_targets = ["-r", str(req_file)] if req_file.exists() else ["playwright>=1.40.0", "python-dotenv>=1.0.0"]

    print("\n[*] Installing packages via pip...")
    cmd = [sys.executable, "-m", "pip", "install"] + install_targets
    result = subprocess.run(cmd)

    # In Ubuntu 24.04+ (PEP 668), standard pip install fails with externally-managed-environment
    if result.returncode != 0:
        print("[*] Retrying with --break-system-packages (for Debian/Ubuntu PEP 668 environments)...")
        cmd_break = [sys.executable, "-m", "pip", "install", "--break-system-packages"] + install_targets
        result = subprocess.run(cmd_break)

    if result.returncode != 0:
        print("\n[!] Package installation failed. Please run manually:")
        print(f"    {sys.executable} -m pip install --break-system-packages -r requirements.txt\n")
        return False

    print("[+] Python packages installed successfully!")

    # Invalidate import caches and ensure user site-packages is on sys.path if pip installed to --user
    try:
        import site
        import importlib
        if hasattr(site, "getusersitepackages"):
            usp = site.getusersitepackages()
            if usp and usp not in sys.path and Path(usp).exists():
                sys.path.append(usp)
        importlib.invalidate_caches()
    except Exception:
        pass

    try:
        import playwright
        from playwright.sync_api import sync_playwright
        return True
    except ImportError:
        print("[!] Playwright was installed but requires restarting the script.")
        return False


def is_chromium_installed(p=None):
    """Check if Playwright's Chromium browser binary is present on the filesystem."""
    try:
        if p is not None:
            path = p.chromium.executable_path
            return bool(path and Path(path).exists())
        home = Path.home()
        cache_paths = [
            home / ".cache" / "ms-playwright",
            home / "AppData" / "Local" / "ms-playwright",
        ]
        for cp in cache_paths:
            if cp.exists() and any(cp.glob("chromium-*")):
                return True
    except Exception:
        pass
    return False


def install_chromium_browser():
    """Download and install Playwright's Chromium browser binary."""
    print("\n[*] Downloading and installing Playwright Chromium browser binary...")
    print(f"[*] Running: {sys.executable} -m playwright install chromium")
    result = subprocess.run([sys.executable, "-m", "playwright", "install", "chromium"])
    if result.returncode == 0:
        print("[+] Playwright Chromium installed successfully!\n")
        return True
    else:
        print(f"\n[!] Browser download failed (code {result.returncode}).")
        print(f"    Please run manually: {sys.executable} -m playwright install chromium\n")
        return False


def check_and_install_chromium(p=None, prompt_install=True):
    """Verify Chromium is installed. If missing, prompt to install."""
    if is_chromium_installed(p):
        return True

    print("\n" + "=" * 62)
    print(" [!] Missing Requirement: Playwright Chromium browser binary is not installed.")
    print("=" * 62)

    if not prompt_install or not sys.stdin.isatty():
        print(f" Please run: {sys.executable} -m playwright install chromium\n")
        return False

    try:
        ans = input(" Would you like to download and install Chromium now? [Y/n]: ").strip().lower()
    except (KeyboardInterrupt, EOFError):
        print("\nCancelled.")
        return False

    if ans in ["", "y", "yes"]:
        return install_chromium_browser()
    else:
        print("[!] Chromium installation skipped.")
        return False


def check_all_requirements():
    """Diagnostic check and interactive repair for all scraper dependencies."""
    print("\n" + "=" * 62)
    print("        🔧 Checking Scraper Environment & Requirements")
    print("=" * 62)

    # 1. Python package: playwright
    has_playwright = False
    try:
        import playwright
        print("  [✓] Python package 'playwright': Installed")
        has_playwright = True
    except ImportError:
        print("  [✗] Python package 'playwright': NOT installed")
        if check_and_install_playwright(prompt_install=True):
            has_playwright = True

    # 2. System browsers (Chrome / Edge)
    has_chrome = bool(shutil.which("google-chrome") or shutil.which("google-chrome-stable") or shutil.which("chrome"))
    has_edge = bool(shutil.which("microsoft-edge") or shutil.which("msedge"))
    print(f"  [{'✓' if has_chrome else '−'}] System Google Chrome: {'Found' if has_chrome else 'Not found'}")
    print(f"  [{'✓' if has_edge else '−'}] System Microsoft Edge: {'Found' if has_edge else 'Not found'}")

    # 3. Playwright Chromium binary
    if has_playwright:
        try:
            from playwright.sync_api import sync_playwright
            with sync_playwright() as p:
                if is_chromium_installed(p):
                    print("  [✓] Playwright Chromium browser: Installed")
                else:
                    print("  [✗] Playwright Chromium browser: NOT installed")
                    check_and_install_chromium(p, prompt_install=True)
        except Exception as e:
            print(f"  [!] Could not inspect Playwright Chromium: {e}")
    else:
        print("  [−] Playwright Chromium check: Skipped (install 'playwright' first)")

    print("=" * 62 + "\n")

