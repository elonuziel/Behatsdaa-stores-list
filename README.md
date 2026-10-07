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

### Method 1: In-Browser JavaScript Extractor (`extract_behatsdaa_deals.js`) 🚀 *(Recommended)*

The fastest, simplest, and most reliable method to capture the full live catalog (**1,700+ deals** across all 99 sub-categories and 28+ campaign tags). Because it executes directly inside your authenticated browser session, it bypasses Imperva WAF / Cloudflare bot protections instantly with zero setup.

#### Step-by-Step Instructions:
1. **Open & Log In**: In your standard browser (Chrome, Edge, Brave, etc.), navigate to [https://www.behatsdaa.org.il/](https://www.behatsdaa.org.il/) and log into your account.
2. **Open Developer Console**: Press `F12` (or right-click $\rightarrow$ **Inspect**) and click the **Console** tab.
3. **Run the Script**: Copy the entire contents of [`extract_behatsdaa_deals.js`](extract_behatsdaa_deals.js), paste it into the console, and press `Enter`.
4. **Automatic Extraction**: The script will crawl:
   - All 28+ campaign carousels (*"החמים של ספטמבר"*, *"מבצעי צרכנות לחג"*, *"אטרקציות"*, etc.)
   - All 99 sub-categories across the entire navigation tree.
   - Upon completion, it automatically triggers a download of `deals_raw.json` to your browser's Downloads folder.
5. **Import into the Project Catalog**:
   Run the normalization pipeline to process the raw file:
   ```bash
   python scraper.py --import-deals ~/Downloads/deals_raw.json
   ```
   **What the import pipeline handles automatically**:
   - **Filters Dead Ghost Shells**: Removes empty category nodes that have no products or inventory.
   - **Direct Partner URLs**: Resolves external partner links with club discount keys (e.g. hotel booking portals on `ananas.holiday`, car rental, telecom).
   - **Normalized Pricing**: Computes member prices, crossed-out original prices, savings %, and variant breakdowns.
   - **Cross-Linking**: Matches deals with stores on rechargeable cards.
   - **Catalog Generation**: Updates production-ready `data/deals.json` and `data/deals.csv`.

---

### Method 2: Automated Playwright Python Scraper (`scraper.py`) 🤖

Automated scraper powered by Python and Playwright with anti-detection flags.

#### 1. Prerequisites & Dependencies:
Ensure Python 3.10+ is installed:
```bash
pip install -r requirements.txt
playwright install chromium
```

#### 2. Running the Scraper:
```bash
# Scrape BOTH rechargeable cards and rotating deals:
python scraper.py --browser chrome

# Scrape ONLY rotating deals and vouchers:
python scraper.py --deals-only

# Scrape ONLY rechargeable card stores (980+ chains across 8 cards):
python scraper.py --cards-only

# Quick test run with a limited number of deals:
python scraper.py --deals-only --max-deals 10
```

#### 3. Authentication & Imperva WAF Bypass:
- Behatsdaa's backend API (`back.behatsdaa.org.il`) is protected by Imperva Incapsula WAF.
- When running `scraper.py` interactively, a browser window opens. Log in once with your credentials / SMS verification.
- The scraper automatically saves session cookies and browser tokens into `./behatsdaa_profile`.
- Subsequent runs reuse the persistent profile without requiring repeated logins.

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
