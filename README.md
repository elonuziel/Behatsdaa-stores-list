# Behatsdaa Participating Stores, Changing Deals & Billing Discounts Catalog 💳🎁🏷️

> **Live Web Application:** [https://elonuziel.github.io/stores-list/](https://elonuziel.github.io/stores-list/)

A fast, interactive web catalog and automated scraper suite for:
1. **Rechargeable Card Stores**: All stores, chains, restaurants, fashion brands, and attractions participating in **[Behatsdaa](https://www.behatsdaa.org.il/card/chargingCard)** recharge cards (Club Cards, Fighter Card, Restaurants, Carrefour, Online Grocery, etc.).
2. **Rotating Deals, Coupons & Vouchers**: Dedicated consumer goods (holiday specials, electronics, home goods), attraction tickets, and food vouchers that rotate weekly/monthly.
3. **Statement Discounts (הנחות במעמד החיוב)**: Over 10,600 local businesses, shops, and services granting automatic statement discounts when paying with a Behatsdaa credit card (Max), powered by **[Be-Plus](https://be-plus.co.il/)**.

---

## 🚀 Live Demo & Key Features

Explore the catalog live at: **[https://elonuziel.github.io/stores-list/](https://elonuziel.github.io/stores-list/)**

- 🗂️ **Tri-Tab Dashboard**:
  - **Tab 1: רשתות וכרטיסים נטענים**: Search & filter 980+ participating store chains across 8 rechargeable wallets with accurate percentage discounts.
  - **Tab 2: מבצעים ושוברים ייעודיים**: Explore rotating, time-limited consumer deals, holiday specials, food vouchers, and attraction tickets with live pricing, savings calculation, and stock limits.
  - **Tab 3: הנחות במעמד החיוב**: Search & filter 10,600+ businesses across Israel granting automatic discounts (up to 20%+) at billing on Behatsdaa credit cards.
- 🔗 **Smart Tri-Directional Cross-Linking**:
  - Store cards in Tab 1 display badges when an active voucher (Tab 2) or a statement discount (Tab 3) exists for that merchant.
  - Deal cards in Tab 2 display badges when the supplier is also accepted on rechargeable wallets or grants credit card billing discounts.
  - Billing cards in Tab 3 link directly back to cards and vouchers.
- ⚡ **Ultra-Fast Search**: Real-time Hebrew search with diacritics, punctuation, and final-letter normalization (`ך/כ`, `ם/מ`, `ן/נ`, `ף/פ`, `ץ/צ`), with pre-indexed search tokens for instantaneous results across 10,000+ items.
- 🏙️ **City & Location Filters**: Filter billing merchants by specific cities across Israel (Tel Aviv, Jerusalem, Haifa, Rishon LeZion, etc.) or nationwide online websites.
- 🎯 **Comprehensive Deal & Category Filters**: Filter by campaign tags ("מבצעי חג", "הכי משתלם"), product category chips, maximum price presets (עד 100 ₪, עד 300 ₪, הכל), and sort by discount %, price, or title.
- 🔍 **Rich Details Modals**: Inspect full specifications, multi-variant price options, purchase limits per member, addresses, and official redemption links.
-  **Independent "Last Scraped" Timestamps**: Every tab displays its own distinct "עודכן לאחרונה" timestamp banner pulled directly from its respective JSON metadata, providing complete transparency on when each dataset was last refreshed.
- 🌙 **Dark & Light Themes**: Full dark mode support with automatic system preference detection and local persistence.
- 📥 **Export Ready**: Download the complete datasets anytime:
  - Stores: [stores.csv](data/stores.csv) & [stores.json](data/stores.json)
  - Deals: [deals.csv](data/deals.csv) & [deals.json](data/deals.json)
  - Statement Discounts: [billing_stores.csv](data/billing_stores.csv) & [billing_stores.json](data/billing_stores.json)
- 🔒 **Zero External AI Dependencies**: 100% self-contained, lightweight, fast, and runs directly on GitHub Pages.

---

## 📁 Project Structure

```text
stores-list/
├── index.html           # Main web application (GitHub Pages) with Tri-Tab dashboard
├── styles.css           # Custom RTL styling, dark theme, and animations
├── app.js               # Frontend search, progressive rendering & cross-linking logic
├── scraper.py           # Unified Python Playwright scraper for cards & rotating deals
├── scrape_beplus.py     # High-speed scraper for Be-Plus billing discounts (10,600+ stores)
├── extract_behatsdaa_deals.js # In-browser JS extractor for logged-in sessions (1,700+ deals)
├── requirements.txt     # Python dependencies
├── data/
│   ├── stores.json      # Structured JSON catalog (980+ stores, 8 cards)
│   ├── stores.csv       # Excel-compatible stores CSV
│   ├── deals.json       # Structured JSON catalog of rotating deals & vouchers
│   ├── deals.csv        # Excel-compatible deals & vouchers CSV
│   ├── billing_stores.json # Structured JSON catalog of Be-Plus billing discounts (10,600+ stores)
│   └── billing_stores.csv  # Excel-compatible billing discounts CSV
├── tests/
│   ├── test_scraper.py        # Unit tests for Behatsdaa scraper
│   ├── test_scrape_beplus.py   # Unit tests for Be-Plus scraper & data normalization
│   ├── test_data_integrity.py # Schema & cross-linking integrity tests
│   └── test_ui.js             # Headless UI & DOM integration tests (JSDOM)
└── README.md            # Documentation and usage guide
```

---

## 🛠️ Scraper Usage & Data Extraction

> [!NOTE]
> **Why Scraping is Executed Locally / Manually**:
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

Run the full Python and UI test suites:

```bash
# 1. Run Python unit & data integrity tests:
python -m unittest discover tests

# 2. Run Headless UI & DOM integration tests:
node tests/test_ui.js
```

---

## 💻 Local Web Development

Because the web application is built with standard HTML5, Tailwind CSS, and Vanilla JavaScript (Zero-Build), you can run it locally with any simple HTTP server:

```bash
python -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000) in your browser.

---

## 🌐 Automated Deployment (GitHub Pages)

The repository deploys automatically to GitHub Pages:
1. Pushing changes to the `main` branch immediately publishes the live site to `https://elonuziel.github.io/stores-list/`.
2. Scrapers are run locally on demand (bypassing Imperva WAF / Cloudflare bot protections), and refreshed datasets are committed directly to `data/`.

---

## 📄 License & Attribution
Created for the benefit of Israeli reserve soldiers (Miluim) and Behatsdaa club beneficiaries. Brand names, logos, and terms are property of [Behatsdaa](https://www.behatsdaa.org.il).
