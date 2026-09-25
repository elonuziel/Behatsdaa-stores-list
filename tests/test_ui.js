/**
 * Headless UI & DOM Integration Tests for stores-list & deals dashboard.
 * Runs in Node.js using JSDOM.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Load JSDOM
let JSDOM;
try {
  JSDOM = require('jsdom').JSDOM;
} catch (e) {
  console.log('[*] Installing jsdom locally for testing...');
  require('child_process').execSync('npm install --no-save jsdom', { stdio: 'inherit' });
  JSDOM = require('jsdom').JSDOM;
}

const ROOT_DIR = path.resolve(__dirname, '..');
const htmlSource = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf-8');
const storesData = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data', 'stores.json'), 'utf-8'));
const dealsData = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data', 'deals.json'), 'utf-8'));
const appJsSource = fs.readFileSync(path.join(ROOT_DIR, 'app.js'), 'utf-8');

async function runTests() {
  console.log('====================================================');
  console.log('   Running UI & DOM Integration Tests (JSDOM)       ');
  console.log('====================================================\n');

  // Create virtual browser window without trying to load external resources
  const dom = new JSDOM(htmlSource, {
    url: 'https://elonuziel.github.io/stores-list/',
    runScripts: 'outside-only'
  });

  const { window } = dom;
  const { document } = window;

  // Polyfill Lucide icons
  window.lucide = {
    createIcons: () => {}
  };

  // Mock matchMedia
  window.matchMedia = window.matchMedia || function() {
    return {
      matches: false,
      addListener: function() {},
      removeListener: function() {}
    };
  };

  // Mock fetch to serve data/stores.json and data/deals.json
  window.fetch = async (url) => {
    if (url.includes('stores.json')) {
      return {
        ok: true,
        json: async () => JSON.parse(JSON.stringify(storesData))
      };
    }
    if (url.includes('deals.json')) {
      return {
        ok: true,
        json: async () => JSON.parse(JSON.stringify(dealsData))
      };
    }
    return { ok: false, status: 404 };
  };

  // Intercept uncaught console errors
  const consoleErrors = [];
  const originalError = window.console.error;
  window.console.error = (...args) => {
    consoleErrors.push(args.join(' '));
    originalError.apply(window.console, args);
  };

  // Execute app.js in window context
  window.eval(appJsSource);

  // Wait for data load and DOM render
  await new Promise(r => setTimeout(r, 200));

  // --- Test 1: Page Title and Initial Tab State ---
  console.log('[Test 1] Verifying page title and initial tab state...');
  assert.ok(document.title.includes('רשתות'), 'Page title should mention stores');
  const storesSection = document.getElementById('stores-tab-section');
  const dealsSection = document.getElementById('deals-tab-section');
  assert.ok(!storesSection.classList.contains('hidden'), 'Stores section should be visible initially');
  assert.ok(dealsSection.classList.contains('hidden'), 'Deals section should be hidden initially');
  console.log('  -> PASS');

  // --- Test 2: Store Counts and Card Rendering ---
  console.log('[Test 2] Verifying store count and cards rendering...');
  const tabStoresCount = document.getElementById('tab-stores-count');
  assert.strictEqual(tabStoresCount.textContent, String(storesData.stores.length));
  const storeCards = document.querySelectorAll('#cards-view .store-card');
  assert.ok(storeCards.length > 0, 'Store cards should be rendered in grid');
  console.log(`  -> PASS (${storeCards.length} store cards rendered)`);

  // --- Test 3: Cross-Linking: Store with Active Deal has Badge ---
  console.log('[Test 3] Verifying cross-linking badge on stores with deals...');
  const storeWithDeal = Array.from(storeCards).find(card => 
    card.textContent.includes('ורדינון') || card.textContent.includes('אצה')
  );
  assert.ok(storeWithDeal, 'Found store card for Vardinon or Atza');
  const dealBadge = storeWithDeal.querySelector('[data-action="view-linked-deal"]');
  assert.ok(dealBadge, 'Store card should have a linked deal badge');
  console.log('  -> PASS (Linked deal badge successfully detected on store card)');

  // --- Test 4: Switching to Deals Tab ---
  console.log('[Test 4] Switching to Deals & Vouchers tab...');
  const tabDealsBtn = document.getElementById('tab-deals-btn');
  tabDealsBtn.click();
  await new Promise(r => setTimeout(r, 50));

  assert.ok(storesSection.classList.contains('hidden'), 'Stores section should be hidden in deals view');
  assert.ok(!dealsSection.classList.contains('hidden'), 'Deals section should be visible');
  const tabDealsCount = document.getElementById('tab-deals-count');
  assert.strictEqual(tabDealsCount.textContent, String(dealsData.deals.length));
  const dealCards = document.querySelectorAll('#deals-grid .deal-card');
  assert.strictEqual(dealCards.length, dealsData.deals.length, 'All deals should be rendered');
  console.log(`  -> PASS (Successfully switched to Deals tab with ${dealCards.length} deals)`);

  // --- Test 5: Deals Live Search Filter ---
  console.log('[Test 5] Testing Deals live search filter...');
  const dealsSearchInput = document.getElementById('deals-search-input');
  dealsSearchInput.value = 'Dreame';
  dealsSearchInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 50));

  let filteredDeals = document.querySelectorAll('#deals-grid .deal-card');
  assert.strictEqual(filteredDeals.length, 1, 'Only Dreame deal should match search');
  assert.ok(filteredDeals[0].textContent.includes('Dreame'), 'Card content should include Dreame');

  // Clear search
  const clearDealsSearchBtn = document.getElementById('clear-deals-search-btn');
  clearDealsSearchBtn.click();
  await new Promise(r => setTimeout(r, 50));
  filteredDeals = document.querySelectorAll('#deals-grid .deal-card');
  assert.strictEqual(filteredDeals.length, dealsData.deals.length, 'All deals restored after clear');
  console.log('  -> PASS (Live search filter works correctly)');

  // --- Test 6: Deals Price Filter ---
  console.log('[Test 6] Testing Deals max price filter (<= 100 ₪)...');
  const dealsPriceFilterSelect = document.getElementById('deals-price-filter-select');
  dealsPriceFilterSelect.value = '100';
  dealsPriceFilterSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 50));

  const budgetDeals = document.querySelectorAll('#deals-grid .deal-card');
  assert.ok(budgetDeals.length > 0 && budgetDeals.length < dealsData.deals.length, 'Should filter out expensive deals');
  assert.ok(Array.from(budgetDeals).some(d => d.textContent.includes('כפר בלום')), 'Includes Kayaks (59 ₪)');

  // Reset price filter
  dealsPriceFilterSelect.value = 'all';
  dealsPriceFilterSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 50));
  console.log('  -> PASS (Price filter works correctly)');

  // --- Test 7: Deal Details Modal & Crossed-Out Price ---
  console.log('[Test 7] Testing Deal details modal & crossed-out original price...');
  const firstDealCard = document.querySelector('#deals-grid .deal-card');
  
  // Check that deal card shows both discounted and strikethrough original price
  const cardOrigPrice = firstDealCard.querySelector('.line-through');
  assert.ok(cardOrigPrice, 'Deal card should show crossed-out original price');
  assert.ok(cardOrigPrice.textContent.includes('₪'), 'Crossed price should have currency symbol');

  firstDealCard.click();
  await new Promise(r => setTimeout(r, 50));

  const dealModal = document.getElementById('deal-modal');
  assert.ok(!dealModal.classList.contains('hidden'), 'Deal modal should be open');
  const modalTitle = document.getElementById('deal-modal-title').textContent;
  assert.ok(modalTitle.length > 0, 'Modal title should be populated');
  const modalOrigPrice = document.getElementById('deal-modal-orig-price');
  assert.ok(!modalOrigPrice.classList.contains('hidden'), 'Modal should show crossed-out original price');
  assert.ok(modalOrigPrice.classList.contains('line-through'), 'Original price should have line-through class');

  const buyLink = document.getElementById('deal-modal-buy-link').href;
  assert.ok(buyLink.includes('behatsdaa.org.il/category/productPage'), 'Buy link should point to Behatsdaa product page');

  // Close modal
  const dealModalCloseBtn = document.getElementById('deal-modal-close-btn');
  dealModalCloseBtn.click();
  assert.ok(dealModal.classList.contains('hidden'), 'Deal modal should be closed');
  console.log('  -> PASS (Both discounted and crossed-out original prices shown on card & modal)');

  // --- Test 8: Reverse Link: Voucher to Store on Card ---
  console.log('[Test 8] Testing reverse link from voucher to store on cards...');
  const dealWithStore = Array.from(document.querySelectorAll('#deals-grid .deal-card')).find(c => 
    c.textContent.includes('ורדינון') || c.textContent.includes('אצה')
  );
  assert.ok(dealWithStore, 'Found deal for Vardinon or Atza');
  const storeLinkBtn = dealWithStore.querySelector('[data-action="view-linked-store"]');
  assert.ok(storeLinkBtn, 'Deal card should have link to store on cards');

  // Open deal modal for this deal and verify banner
  dealWithStore.click();
  await new Promise(r => setTimeout(r, 50));
  const modalStoreBanner = document.getElementById('deal-modal-linked-store-banner');
  assert.ok(!modalStoreBanner.classList.contains('hidden'), 'Deal modal should show linked store banner');

  // Click banner button to jump to store
  const viewStoreBtn = document.getElementById('deal-modal-view-store-btn');
  viewStoreBtn.click();
  await new Promise(r => setTimeout(r, 50));
  assert.ok(!storesSection.classList.contains('hidden'), 'Should transition to Stores tab');
  assert.ok(document.getElementById('search-input').value.length > 0, 'Store search should be pre-filled');
  console.log('  -> PASS (Reverse link from voucher to store works on both card and modal)');

  // --- Test 9: Store Card to Deals Jump Navigation ---
  console.log('[Test 9] Testing cross-link jump from store card to deals...');
  // Switch back to stores
  const tabStoresBtn = document.getElementById('tab-stores-btn');
  tabStoresBtn.click();
  await new Promise(r => setTimeout(r, 50));

  const vardinonCard = Array.from(document.querySelectorAll('#cards-view .store-card')).find(c => c.textContent.includes('ורדינון'));
  assert.ok(vardinonCard, 'Found Vardinon store card');
  const jumpBtn = vardinonCard.querySelector('[data-action="view-linked-deal"]');
  assert.ok(jumpBtn, 'Found jump button on Vardinon card');
  jumpBtn.click();
  await new Promise(r => setTimeout(r, 50));

  assert.ok(!dealsSection.classList.contains('hidden'), 'Should jump to Deals tab');
  assert.strictEqual(dealsSearchInput.value, 'ורדינון', 'Deals search should be pre-filled with store name');
  console.log('  -> PASS (Store badge jump successfully navigates to pre-filtered Deals tab)');

  // --- Test 10: Dark / Light Mode Toggle ---
  console.log('[Test 10] Testing Theme Toggle...');
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const wasDark = document.documentElement.classList.contains('dark');
  themeToggleBtn.click();
  assert.notStrictEqual(document.documentElement.classList.contains('dark'), wasDark);
  themeToggleBtn.click();
  assert.strictEqual(document.documentElement.classList.contains('dark'), wasDark);
  console.log('  -> PASS (Theme toggle switches light/dark classes properly)');

  // --- Test 11: Zero Console Errors ---
  console.log('[Test 11] Checking for console errors...');
  assert.strictEqual(consoleErrors.length, 0, `Expected 0 console errors, but found: ${consoleErrors.join(', ')}`);
  console.log('  -> PASS (Zero errors during entire session)');

  console.log('\n====================================================');
  console.log('   ALL 11 UI & DOM INTEGRATION TESTS PASSED!       ');
  console.log('====================================================\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('\n[TEST FAILED]', err);
  process.exit(1);
});
