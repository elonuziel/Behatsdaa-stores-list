"""
Browser session lifecycle, stealth launcher, and authentication management for Behatsdaa.
"""

import os
import sys
import time
from pathlib import Path
from core.deps import check_and_install_chromium


def launch_stealth_context(p, profile_dir, headless=False, channel=None):
    """Launch Chromium context with stealth flags to bypass Incapsula WAF."""
    profile_path = Path(profile_dir).resolve()
    profile_path.mkdir(parents=True, exist_ok=True)

    launch_args = [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-infobars"
    ]
    if channel:
        channels = [channel, None] if channel not in [None, "chromium"] else [None]
    else:
        channels = ["chrome", "msedge", None]

    for ch in channels:
        try:
            kwargs = {
                "user_data_dir": str(profile_path),
                "headless": headless,
                "args": launch_args,
                "ignore_default_args": ["--enable-automation"],
                "locale": "he-IL",
                "timezone_id": "Asia/Jerusalem",
                "viewport": {"width": 1400, "height": 900},
                "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
            }
            if ch:
                kwargs["channel"] = ch
                print(f"[*] Launching persistent browser using channel '{ch}'...")
            else:
                print("[*] Launching persistent browser using bundled Chromium...")

            context = p.chromium.launch_persistent_context(**kwargs)
            context.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
                Object.defineProperty(navigator, 'languages', { get: () => ['he-IL', 'he', 'en-US', 'en'] });
                window.chrome = { runtime: {} };
            """)
            return context
        except Exception as e:
            msg = str(e).split('\n')[0]
            if ch:
                print(f"[*] Channel '{ch}' not available ({msg}), trying next option...")
            else:
                print(f"[!] Bundled Chromium launch failed: {msg}")
                err_str = str(e).lower()
                if "executable doesn't exist" in err_str or "playwright install" in err_str:
                    if check_and_install_chromium(p, prompt_install=True):
                        try:
                            print("[*] Retrying persistent browser launch with newly installed Chromium...")
                            context = p.chromium.launch_persistent_context(**kwargs)
                            context.add_init_script("""
                                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                                Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
                                Object.defineProperty(navigator, 'languages', { get: () => ['he-IL', 'he', 'en-US', 'en'] });
                                window.chrome = { runtime: {} };
                            """)
                            return context
                        except Exception as retry_err:
                            print(f"[!] Retry failed: {retry_err}")

    raise RuntimeError(f"Could not launch any browser! Please run: {sys.executable} -m playwright install chromium")


def check_is_authenticated(page):
    """Check if the current browser session is authenticated on Behatsdaa."""
    try:
        if "/login" in page.url:
            return False

        login_btn = page.locator("a[href*='/login'], button:has-text('התחברות'), button:has-text('כניסה')")
        if login_btn.count() > 0:
            for i in range(min(login_btn.count(), 3)):
                if login_btn.nth(i).is_visible():
                    return False

        auth_test = page.evaluate("""
            async () => {
                try {
                    const res = await window.fetch("https://back.behatsdaa.org.il/api/cards/GetCardGeneralInfo", {
                        headers: { "OrganizationId": "20", "Accept": "application/json" },
                        credentials: "include"
                    });
                    const json = await res.json();
                    return { ok: true, hasWallets: Boolean(json?.data?.wallets && json.data.wallets.length > 0) };
                } catch(e) {
                    return { ok: false, error: e.toString() };
                }
            }
        """)
        if auth_test and auth_test.get("ok"):
            return auth_test.get("hasWallets", False)
    except Exception:
        pass
    return False


def find_visible_element(page, selectors, timeout_ms=15000):
    """Wait for and return the first matching visible element across a list of selectors."""
    start = time.time()
    while (time.time() - start) * 1000 < timeout_ms:
        for sel in selectors:
            try:
                loc = page.locator(sel)
                count = loc.count()
                for i in range(count):
                    el = loc.nth(i)
                    if el.is_visible():
                        return el
            except Exception:
                continue
        page.wait_for_timeout(300)
    return None


def wait_for_user_login(page, user_id=None, manual=False):
    """Execute automated CLI or manual authentication on the /login page."""
    # Check if manual window login requested
    if manual:
        print("\n" + "=" * 65)
        print(" [!] ACTION REQUIRED: Manual Behatsdaa Login in Browser Window")
        print("=" * 65)
        print(" Behatsdaa requires logging in to access cards and participating stores.")
        print(" -> Enter your ID & SMS code directly in the opened Chrome/Edge window.")
        try:
            input(" -> Once you are logged in on screen, press [Enter] here to continue: ")
            print("[+] Login confirmed! Resuming scraper...")
            page.wait_for_timeout(2000)
        except Exception:
            pass
        print("=" * 65 + "\n")
        return

    print("\n" + "=" * 65)
    print(" [!] ACTION REQUIRED: Behatsdaa Login Needed")
    print("=" * 65)
    print(" Behatsdaa requires logging in with your Israeli ID and an SMS code.")

    try:
        # Step 1: Obtain Israeli ID (from args, env, or terminal prompt)
        id_val = (user_id or os.environ.get("BEHATSDAA_ID") or "").strip()
        if not id_val:
            if not sys.stdin.isatty():
                print("[!] Non-interactive session: no Israeli ID provided. Set --id or BEHATSDAA_ID.")
                return
            try:
                id_val = input(" -> Enter your Israeli ID (תעודת זהות - 9 digits, or press Enter for manual window login): ").strip()
            except (EOFError, KeyboardInterrupt):
                id_val = ""

        if not id_val:
            print("[!] Switching to manual login in browser window...")
            print(" -> Enter your ID & SMS code in the opened browser window.")
            if sys.stdin.isatty():
                input(" -> Press [Enter] once logged in on screen to continue: ")
            print("[+] Login confirmed! Resuming scraper...")
            page.wait_for_timeout(2000)
            return

        print("[*] Locating Israeli ID input field...")
        id_selectors = [
            "input[placeholder*='תעודת']",
            "input[placeholder*='זהות']",
            "input[placeholder*='ספרות']",
            "input[name*='tz' i]",
            "input[name*='id' i]",
            "input[type='tel']",
            "input[type='number']",
            "input",
        ]
        id_locator = find_visible_element(page, id_selectors, timeout_ms=15000)
        if not id_locator:
            debug_img = "login_debug.png"
            try:
                page.screenshot(path=debug_img)
                print(f"[!] Could not find ID input field on {page.url} (Title: '{page.title()}')")
                print(f"[*] Saved diagnostic screenshot to {debug_img}")
                if "incapsula" in page.content().lower() or "iframe" in page.content().lower():
                    print("[!] Detected anti-bot security check on page.")
            except Exception:
                pass
            raise RuntimeError(f"ID input field not found on {page.url}")

        print("[*] Entering ID into login form...")
        id_locator.click()
        id_locator.fill("")
        id_locator.type(id_val, delay=60)
        page.wait_for_timeout(500)

        # Step 2: Click 'שלחו לי קוד חד פעמי'
        send_btn_selectors = [
            "button:has-text('שלחו לי קוד')",
            "button:has-text('קוד חד פעמי')",
            "button:has-text('שלחו')",
            "button[type='submit']",
            "button",
        ]
        send_btn = find_visible_element(page, send_btn_selectors, timeout_ms=5000)
        if not send_btn:
            raise RuntimeError("Button 'שלחו לי קוד' not found")
        print("[*] Clicking 'שלחו לי קוד חד פעמי' ...")
        send_btn.click()

        # Step 3: Wait for OTP input screen (/login/withCode)
        print("[*] Waiting for verification code input screen...")
        otp_selectors = [
            "input[placeholder*='קוד התחברות']",
            "input[placeholder*='קוד']",
            "input[name*='code' i]",
            "input[name*='otp' i]",
            "input[type='tel']",
            "input[type='number']",
            "input",
        ]
        code_locator = find_visible_element(page, otp_selectors, timeout_ms=15000)
        if not code_locator:
            try:
                page.screenshot(path="otp_debug.png")
            except Exception:
                pass
            raise RuntimeError(f"OTP code input not found on {page.url}")
        print("[+] SMS/Email verification code sent by Behatsdaa!")

        # Step 4: Prompt user for OTP code in terminal
        otp_val = ""
        if not sys.stdin.isatty():
            print("[!] Non-interactive session: cannot prompt for SMS OTP.")
            return
        while not otp_val:
            try:
                otp_val = input(" -> Enter the SMS OTP code you received (קוד התחברות): ").strip()
            except (EOFError, KeyboardInterrupt):
                break

        if not otp_val:
            print("[!] No verification code entered.")
            return

        print("[*] Submitting verification code...")
        code_locator.click()
        code_locator.fill("")
        code_locator.type(otp_val, delay=60)
        page.wait_for_timeout(500)

        # Step 5: Click login submit button ('התחברות')
        login_btn_selectors = [
            "button:has-text('התחברות')",
            "button:has-text('התחבר')",
            "button[type='submit']",
            "button",
        ]
        login_btn = find_visible_element(page, login_btn_selectors, timeout_ms=5000)
        if login_btn:
            login_btn.click()
        else:
            page.keyboard.press("Enter")

        print("[*] Verifying authentication...")
        try:
            page.wait_for_url(lambda u: "/login" not in u, timeout=20000)
            print("[+] Login confirmed! Session cookies saved to profile.")
        except Exception:
            page.wait_for_timeout(3000)
            if "/login" not in page.url:
                print("[+] Login confirmed! Session cookies saved to profile.")
            else:
                print("[!] Still on login page. Please check if the OTP code was valid.")

        page.wait_for_timeout(2000)
        print("=" * 65 + "\n")

    except Exception as err:
        print(f"\n[!] Automated CLI login note: {err}")
        print(" -> If running headful, you can complete login in the browser window.")
        try:
            if sys.stdin.isatty():
                input(" -> Press [Enter] once logged in to continue: ")
        except Exception:
            pass
        print("=" * 65 + "\n")


def ensure_authenticated_session(page, user_id=None, manual=False, target_url=None):
    """Ensure the user is logged into Behatsdaa. If not, navigate to /login and handle authentication."""
    print("[*] Verifying Behatsdaa session authentication...")
    if check_is_authenticated(page):
        print("[+] Session is authenticated. Proceeding...")
        return True

    print("[!] Session is NOT authenticated. Initiating Behatsdaa login...")
    login_url = "https://www.behatsdaa.org.il/login"
    try:
        page.goto(login_url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(2000)
    except Exception as e:
        print(f"[*] Note during navigation to login: {e}")

    # Perform automated CLI or manual window login
    wait_for_user_login(page, user_id=user_id, manual=manual)

    # After login, return to target page
    if target_url and target_url not in page.url:
        print(f"[*] Navigating to target page: {target_url}")
        try:
            page.goto(target_url, wait_until="domcontentloaded", timeout=30000)
            page.wait_for_timeout(2000)
        except Exception:
            pass

    return True

