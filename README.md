# Behatsdaa Participating Stores & Changing Deals Catalog 💳🎁

> **Live Web Application:** [https://elonuziel.github.io/stores-list/](https://elonuziel.github.io/stores-list/)

A fast, interactive web catalog and automated scraper for:
1. **Rechargeable Card Stores**: All stores, chains, restaurants, fashion brands, and attractions participating in **[Behatsdaa](https://www.behatsdaa.org.il/card/chargingCard)** recharge cards (Club Cards, Fighter Card, Restaurants, Carrefour, Online Grocery, etc.).
2. **Rotating Deals, Coupons & Vouchers**: Dedicated consumer goods (holiday specials, electronics, home goods), attraction tickets, and food vouchers that rotate weekly/monthly.

---

## 🚀 Live Demo & Key Features

Explore the catalog live at: **[https://elonuziel.github.io/stores-list/](https://elonuziel.github.io/stores-list/)**

- 🗂️ **Dual-Tab Dashboard**:
  - **Tab 1: רשתות וכרטיסים נטענים**: Search & filter 980+ participating store chains across 8 rechargeable wallets with accurate percentage discounts.
  - **Tab 2: מבצעים ושוברים ייעודיים**: Explore rotating, time-limited consumer deals, holiday specials, food vouchers, and attraction tickets with live pricing, savings calculation, and stock limits.
- 🔗 **Smart Cross-Linking**: Store cards in Tab 1 display an interactive badge whenever an active deal or voucher is available for that brand (e.g., Vardinon, Atza). Clicking the badge jumps directly to the Deals tab filtered for that brand!
- ⚡ **Ultra-Fast Search**: Real-time Hebrew search with diacritics and final-letter normalization (`ך/כ`, `ם/מ`, `ן/נ`, `ף/פ`, `ץ/צ`).
- � **Comprehensive Deal Filters**: Filter by campaign tags ("מבצעי חג", "הכי משתלם"), product category chips, maximum price presets (עד 100 ₪, עד 300 ₪, הכל), and sort by discount %, price, or title.
- 🔍 **Rich Deal Details Modal**: Inspect full specifications, multi-variant price options, purchase limits per member, expiration dates, redemption rules, and click directly through to the official Behatsdaa product page.
- 📊 **Dual Views**: Seamless toggle between responsive Grid Cards and compact Table View for stores.
- 🌙 **Dark & Light Themes**: Full dark mode support with automatic system preference detection and local persistence.
- 📥 **Export Ready**: Download the complete datasets anytime:
  - Stores: [stores.csv](data/stores.csv) & [stores.json](data/stores.json)
  - Deals: [deals.csv](data/deals.csv) & [deals.json](data/deals.json)
- 🔒 **Zero External AI Dependencies**: 100% self-contained and accurate data extracted directly from Behatsdaa's official REST API.

---

## 📁 Project Structure

```text
stores-list/
├── index.html           # Main web application (GitHub Pages) with Stores & Deals tabs
├── styles.css           # Custom RTL styling, dark theme, and animations
├── app.js               # Frontend search, filtering, and cross-linking logic
├── scraper.py           # Unified Python Playwright scraper for cards & rotating deals
├── requirements.txt     # Python dependencies
├── data/
│   ├── stores.json      # Structured JSON catalog (980+ stores, 8 cards)
│   ├── stores.csv       # Excel-compatible stores CSV
│   ├── deals.json       # Structured JSON catalog of rotating deals & vouchers
│   └── deals.csv        # Excel-compatible deals & vouchers CSV
├── tests/
│   ├── test_scraper.py  # Unit tests for scraper parsing, normalization & persistence
│   ├── test_data_integrity.py # Schema & cross-linking integrity tests
│   └── test_ui.js       # Headless UI & DOM integration tests (JSDOM)
├── .github/workflows/
│   └── scrape.yml       # Automated weekly GitHub Actions scraper workflow
└── README.md            # Documentation and usage guide
```

---

## 🛠️ Scraper Installation & Usage

### 1. Prerequisites & Dependencies
Ensure Python 3.10+ is installed, then install required packages:

```bash
pip install -r requirements.txt
playwright install chromium
```

### 2. Run the Scraper
Run the scraper using your preferred mode:

```bash
# Scrape BOTH rechargeable cards and rotating deals:
python scraper.py --browser chrome

# Scrape ONLY rotating deals and vouchers (faster weekly refresh):
python scraper.py --deals-only

# Scrape ONLY rechargeable card stores:
python scraper.py --cards-only

# Limit number of deals to deeply scrape (useful for testing):
python scraper.py --deals-only --max-deals 10
```

> **Note on Authentication:**
> The scraper connects to Behatsdaa's backend API behind Imperva WAF. When running for the first time, log in once via the opened browser window. The session is saved to `./behatsdaa_profile` so subsequent scrapes execute completely automatically.

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
1. Pushing changes to the `main` branch immediately publishes to `https://elonuziel.github.io/stores-list/`.
2. A scheduled GitHub Action (`.github/workflows/scrape.yml`) runs weekly to keep both stores and deals catalogs fresh.

---

## 📄 License & Attribution
Created for the benefit of Israeli reserve soldiers (Miluim) and Behatsdaa club beneficiaries. Brand names, logos, and terms are property of [Behatsdaa](https://www.behatsdaa.org.il).
