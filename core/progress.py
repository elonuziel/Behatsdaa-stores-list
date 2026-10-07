"""
Zero-dependency terminal progress bar utility for CLI operations.
"""

import sys


def render_progress_bar(current, total, prefix="", suffix="", bar_length=30, done=False):
    """Render a smooth, modern terminal progress bar with carriage return."""
    if total <= 0:
        total = 1
    pct = min(max(current / total, 0.0), 1.0)
    filled_len = int(bar_length * pct)
    bar = "█" * filled_len + "░" * (bar_length - filled_len)
    pct_str = f"{pct * 100:5.1f}%"

    msg = f"\r  {prefix} [{bar}] {pct_str} ({current}/{total}) {suffix}"

    if sys.stdout.isatty():
        # Pad with spaces to overwrite any previous longer suffix
        sys.stdout.write(msg.ljust(95))
        if done:
            sys.stdout.write("\n")
        sys.stdout.flush()
    else:
        # For non-TTY output (piped or redirected), log milestone increments
        step = max(1, total // 5)
        if done or current == 1 or current == total or current % step == 0:
            print(f"  {prefix} [{bar}] {pct_str} ({current}/{total}) {suffix}")

