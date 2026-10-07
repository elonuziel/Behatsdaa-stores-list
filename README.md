# Behatsdaa Scraper Suite & Data Pipeline 💳🎁🏷️

> **Live Web Application:** [https://elonuziel.github.io/Behatsdaa-site-ai-mesh/](https://elonuziel.github.io/Behatsdaa-site-ai-mesh/)  
> **Frontend Web Repository:** [elonuziel/Behatsdaa-site-ai-mesh](https://github.com/elonuziel/Behatsdaa-site-ai-mesh)

An automated data extraction suite, anti-bot bypass pipeline, and data normalization engine for the **[Behatsdaa](https://www.behatsdaa.org.il/)** club catalog:
1. **Rechargeable Card Stores**: All stores, chains, restaurants, fashion brands, and attractions participating in **[Behatsdaa](https://www.behatsdaa.org.il/card/chargingCard)** recharge cards (Club Cards, Fighter Card, Restaurants, Carrefour, Online Grocery, etc.).
2. **Rotating Deals, Coupons & Vouchers**: Dedicated consumer goods (holiday specials, electronics, home goods), attraction tickets, and food vouchers that rotate weekly/monthly.
3. **Statement Discounts (הנחות במעמד החיוב)**: Over 10,600 local businesses, shops, and services granting automatic statement discounts when paying with a Behatsdaa credit card (Max), powered by **[Be-Plus](https://be-plus.co.il/)**.

---

## 🔄 Two-Repository Architecture & Automated Sync

```text
┌────────────────────────────────────────────────────────┐
│  Behatsdaa-stores-list (This Repository)               │
│  - Python 3.10+ & Playwright scraping suite            │
│  - Imperva Incapsula WAF & anti-bot bypass             │
│  - Normalizes & exports verified data/ (*.json, *.csv) │
└───────────────────────────┬────────────────────────────┘
                            │  git push (data/** changes)
                            ▼
┌────────────────────────────────────────────────────────┐
│  🤖 GitHub Action (.github/workflows/sync-data.yml)    │
│  - Automatically copies data/ to Behatsdaa-site-ai-mesh │
│  - Commits & pushes with SYNC_DATA_PAT                 │
└───────────────────────────┬────────────────────────────┘
                            │  triggers deploy workflow
                            ▼
┌────────────────────────────────────────────────────────┐
│  Behatsdaa-site-ai-mesh (Production Web App)           │
│  - Vite + Tailwind CSS + MiniSearch                    │
│  - Card & Table views across all 3 tabs                │
│  - Automated GitHub Pages build & deployment           │
│  👉 https://elonuziel.github.io/Behatsdaa-site-ai-mesh/ │
└────────────────────────────────────────────────────────┘
```

When you update data locally and push to `main` in this repository:
```bash
git add data/
git commit -m "chore(data): refresh catalog"
git push origin main
```
The GitHub Action automatically syncs the datasets into `Behatsdaa-site-ai-mesh`, which rebuilds and deploys the live site.

---

## 📁 Repository Structure

```text
Behatsdaa-stores-list/
├── scraper.py                 # Unified Playwright scraper for cards & rotating deals
├── scrape_beplus.py           # High-speed API scraper for Be-Plus billing discounts (10,600+ stores)
├── extract_behatsdaa_deals.js # In-browser JS extractor for logged-in sessions (1,700+ deals)
├── requirements.txt           # Python dependencies (playwright, requests, etc.)
├── data/                      # Master production datasets (JSON & Excel CSV)
│   ├── stores.json            # 980+ store chains across 8 rechargeable wallets
│   ├── stores.csv             # Excel-compatible stores CSV
│   ├── deals.json             # 1,730+ rotating deals, vouchers & holiday specials
│   ├── deals.csv              # Excel-compatible deals CSV
│   ├── billing_stores.json    # 10,600+ Be-Plus statement discounts
│   └── billing_stores.csv     # Excel-compatible billing discounts CSV
├── tests/
│   ├── test_scraper.py        # Unit tests for Behatsdaa scraper logic & normalization
│   ├── test_scrape_beplus.py  # Unit tests for Be-Plus scraper & CRM API mapping
│   └── test_data_integrity.py # Schema validation & cross-linking integrity tests
├── .github/workflows/
│   └── sync-data.yml          # Automated sync workflow pushing data/ to site repo
└── README.md                  # Documentation and scraper usage guide
```

---

## 🛠️ Scraper Usage & Data Extraction

> [!NOTE]
> **Why Scraping is Executed Locally / On-Demand**:
> - **Behatsdaa WAF**: Behatsdaa's backend is protected by Imperva Incapsula bot mitigation, which blocks datacenter IP ranges (including GitHub Actions runners) and requires SMS / authenticated session verification.
> - **On-Demand Updates**: Store catalogs and Be-Plus billing discounts do not change with every git commit, so running scrapers locally on demand prevents wasted runs and guarantees 100% data integrity.
> - **Freshness Transparency**: Each tab on the live website independently displays the exact date it was last scraped.

Three extraction workflows are supported:

---

### Method 1: In-Browser JavaScript Extractors 🚀 *(Recommended & Fastest)*

The simplest and most reliable method to capture the live catalog directly from your standard browser (Chrome, Edge, Brave). Because it runs inside your existing authenticated session, it requires **zero browser setup or GUI in WSL** and bypasses all Imperva WAF / Cloudflare protections instantly.

> [!TIP]
> **WSL Users & Downloads Folder**:
> Files downloaded from Chrome/Edge in Windows land in your Windows Downloads folder, which is directly accessible in WSL at:
> ```bash
> /mnt/c/Users/<YourWindowsUsername>/Downloads/cards_raw.json
> /mnt/c/Users/<YourWindowsUsername>/Downloads/deals_raw.json
> ```
> The interactive menu (`./scraper.py`) **automatically searches `/mnt/c/Users/*/Downloads/`** so you can just press Enter!

#### A. Extract Rechargeable Cards (`extract_behatsdaa_cards.js`):
1. Log into [behatsdaa.org.il](https://www.behatsdaa.org.il).
2. Press `F12` $\rightarrow$ **Console**.
3. Paste [`extract_behatsdaa_cards.js`](extract_behatsdaa_cards.js) and press `Enter` to download `cards_raw.json`.
4. Import directly into the catalog:
   ```bash
   python3 scraper.py --import-cards /mnt/c/Users/<YourUsername>/Downloads/cards_raw.json
   ```

#### B. Extract Deals & Vouchers (`extract_behatsdaa_deals.js`):
1. Log into [behatsdaa.org.il](https://www.behatsdaa.org.il).
2. Press `F12` $\rightarrow$ **Console**.
3. Paste [`extract_behatsdaa_deals.js`](extract_behatsdaa_deals.js) and press `Enter` to download `deals_raw.json`.
4. Import directly into the catalog:
   ```bash
   python3 scraper.py --import-deals /mnt/c/Users/<YourUsername>/Downloads/deals_raw.json
   ```

---

### Method 2: Automated Python Scraper (`scraper.py`) & Interactive Menu 🤖

Launch the interactive CLI menu:
```bash
./scraper.py
```
*(Or pass `--menu`)*

```text
==============================================================
        💳 Behatsdaa - Scraper & Data Pipeline Suite
==============================================================
 Select an action to perform:

  [1] 💳 Scrape Rechargeable Cards (Playwright headless - terminal login)
  [2] 🎁 Scrape Rotating Deals (Playwright headless - terminal login)
  [3] 🚀 Full Scrape: Cards + Deals (Playwright headless - terminal login)
  [4] 🖥️  Manual Browser Scrape (Playwright headful - enter in browser window)
  [5] 🏷️  Scrape Be-Plus Billing Discounts (10,600+ stores, no browser)
  [6] 📥 Import Cards from file (cards_raw.json)
  [7] 📥 Import Deals from file (deals_raw.json)
  [8] 🔧 Check & Install Requirements (Playwright & Chromium)
  [0] ❌ Exit
==============================================================
```

#### Automated Requirement Detection & Auto-Install:
- **Interactive Check & Repair**: Running `./scraper.py --check-deps` or selecting Option `[8]` checks Python dependencies and Playwright's Chromium browser.
- **Auto-Prompt on Missing Dependencies**: If `playwright` or the Chromium browser binary is missing when running any scraping option, the script prompts you (`[Y/n]`) and installs them automatically (including handling Ubuntu PEP 668 `--break-system-packages`), then immediately proceeds without failing!

#### Login Modes Supported:
1. **Automated Terminal Login (`--headless`)**:
   Prompts for your Israeli ID (or reads `--id`) and the SMS OTP verification code directly in your terminal, enters them automatically, and saves cookies to `./behatsdaa_profile`.
2. **Classic Manual Browser Login (`--manual-login` or Option `4`)**:
   Opens a visible Chrome/Edge browser window on screen, allows you to enter your ID and SMS code directly in the browser GUI, and resumes once you press Enter in the terminal.

---

### Method 3: Be-Plus Scraper for Statement Discounts (`scrape_beplus.py`) 💳

A standalone, high-performance scraper for the **[Be-Plus](https://be-plus.co.il/)** network (10,600+ participating businesses giving direct statement discounts on Behatsdaa credit cards):

```bash
# Run the complete Be-Plus scraper across all 445 pages (10,600+ businesses):
python scrape_beplus.py --output-dir data

# Run a quick test on the first 3 pages:
python scrape_beplus.py --max-pages 3
```

- **Direct REST API**: Queries Be-Plus CRM endpoints (`/index.php?option=com_crm&task=products.getItems`) with category tree mapping.
- **High-Throughput Concurrency**: Utilizes multi-threaded workers with automatic backoff retry logic.
- **Zero Browser Overhead**: Runs via lightweight HTTP requests without requiring Playwright or browser emulators.
- **Complete Outputs**: Automatically outputs `data/billing_stores.json` and `data/billing_stores.csv`.

---

## 🧪 Running Automated Tests

Run the full Python test suite to verify scrapers, data parsers, and dataset schema integrity:

```bash
python -m unittest discover tests
```

---

## 📄 License & Attribution
Created for the benefit of Israeli reserve soldiers (Miluim) and Behatsdaa club beneficiaries. Brand names, logos, and terms are property of [Behatsdaa](https://www.behatsdaa.org.il) and [Be-Plus](https://be-plus.co.il).
