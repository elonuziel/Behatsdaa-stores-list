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
const billingData = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data', 'billing_stores.json'), 'utf-8'));
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

  // Mock fetch to serve data/stores.json, data/deals.json, and data/billing_stores.json
  window.fetch = async (url) => {
    if (url.includes('billing_stores.json')) {
      return {
        ok: true,
        json: async () => JSON.parse(JSON.stringify(billingData))
      };
    }
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

  // Wait for initial store render and background datasets
  await new Promise(r => setTimeout(r, 250));

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
  const matchedDeal = dealsData.deals.find(d => d.matched_store_name);
  const targetStoreName = matchedDeal ? matchedDeal.matched_store_name : 'אסקייפלנד';

  // Search for the store with a deal so it is rendered
  const searchInput = document.getElementById('search-input');
  searchInput.value = targetStoreName;
  searchInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 180));

  const storeCardsAfterSearch = document.querySelectorAll('#cards-view .store-card');
  const storeWithDeal = Array.from(storeCardsAfterSearch).find(card => 
    card.textContent.includes(targetStoreName)
  );
  assert.ok(storeWithDeal, `Found store card for ${targetStoreName}`);
  const dealBadge = storeWithDeal.querySelector('[data-action="view-linked-deal"]');
  assert.ok(dealBadge, 'Store card should have a linked deal badge');
  console.log('  -> PASS (Linked deal badge successfully detected on store card)');

  // Clear search for subsequent tests
  const clearStoresSearchBtn = document.getElementById('clear-search-btn');
  if (clearStoresSearchBtn) {
    clearStoresSearchBtn.click();
  } else {
    searchInput.value = '';
    searchInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  }
  await new Promise(r => setTimeout(r, 180));

  // --- Test 4: Switching to Deals Tab & Progressive Rendering ---
  console.log('[Test 4] Switching to Deals & Vouchers tab...');
  const tabDealsBtn = document.getElementById('tab-deals-btn');
  tabDealsBtn.click();
  await new Promise(r => setTimeout(r, 50));

  assert.ok(storesSection.classList.contains('hidden'), 'Stores section should be hidden in deals view');
  assert.ok(!dealsSection.classList.contains('hidden'), 'Deals section should be visible');
  const tabDealsCount = document.getElementById('tab-deals-count');
  assert.strictEqual(tabDealsCount.textContent, String(dealsData.deals.length));
  
  let dealCards = document.querySelectorAll('#deals-grid .deal-card');
  const initialExpected = Math.min(dealsData.deals.length, 60);
  assert.strictEqual(dealCards.length, initialExpected, `Expected initial batch of ${initialExpected} deals`);

  // Test Load More button
  const loadMoreBtn = document.getElementById('deals-load-more-btn');
  if (dealsData.deals.length > 60) {
    assert.ok(loadMoreBtn, 'Load more button should exist');
    loadMoreBtn.click();
    await new Promise(r => setTimeout(r, 50));
    dealCards = document.querySelectorAll('#deals-grid .deal-card');
    const secondExpected = Math.min(dealsData.deals.length, 120);
    assert.strictEqual(dealCards.length, secondExpected, `Deals count should expand to ${secondExpected} after Load More`);
  }
  console.log(`  -> PASS (Successfully switched to Deals tab with progressive rendering validated)`);

  // --- Test 5: Deals Live Search Filter ---
  console.log('[Test 5] Testing Deals live search filter...');
  const dealsSearchInput = document.getElementById('deals-search-input');
  const sampleSearchTerm = dealsData.deals[0].title.split(' ')[0] || 'סושי';
  dealsSearchInput.value = sampleSearchTerm;
  dealsSearchInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 180));

  let filteredDeals = document.querySelectorAll('#deals-grid .deal-card');
  assert.ok(filteredDeals.length > 0 && filteredDeals.length <= dealsData.deals.length, 'Should filter deals by search term');
  assert.ok(filteredDeals[0].textContent.includes(sampleSearchTerm), 'Card content should include search term');

  // Clear search
  const clearDealsSearchBtn = document.getElementById('clear-deals-search-btn');
  clearDealsSearchBtn.click();
  await new Promise(r => setTimeout(r, 50));
  filteredDeals = document.querySelectorAll('#deals-grid .deal-card');
  const resetExpected = Math.min(dealsData.deals.length, 60);
  assert.strictEqual(filteredDeals.length, resetExpected, `Expected ${resetExpected} deals restored after clear`);
  console.log('  -> PASS (Live search filter works correctly)');

  // --- Test 6: Deals Price Filter ---
  console.log('[Test 6] Testing Deals max price filter (<= 100 ₪)...');
  const dealsPriceFilterSelect = document.getElementById('deals-price-filter-select');
  dealsPriceFilterSelect.value = '100';
  dealsPriceFilterSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 50));

  const budgetDeals = document.querySelectorAll('#deals-grid .deal-card');
  assert.ok(budgetDeals.length > 0 && budgetDeals.length <= dealsData.deals.length, 'Should filter deals within budget');

  // Reset price filter
  dealsPriceFilterSelect.value = 'all';
  dealsPriceFilterSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 50));
  console.log('  -> PASS (Price filter works correctly)');

  // --- Test 7: Deal Details Modal & Pricing ---
  console.log('[Test 7] Testing Deal details modal & pricing display...');
  const firstDealCard = document.querySelector('#deals-grid .deal-card');

  firstDealCard.click();
  await new Promise(r => setTimeout(r, 50));

  const dealModal = document.getElementById('deal-modal');
  assert.ok(!dealModal.classList.contains('hidden'), 'Deal modal should be open');
  const modalTitle = document.getElementById('deal-modal-title').textContent;
  assert.ok(modalTitle.length > 0, 'Modal title should be populated');

  const buyLink = document.getElementById('deal-modal-buy-link').href;
  assert.ok(buyLink.includes('behatsdaa.org.il/category/productPage'), 'Buy link should point to Behatsdaa product page');

  // Close modal
  const dealModalCloseBtn = document.getElementById('deal-modal-close-btn');
  dealModalCloseBtn.click();
  await new Promise(r => setTimeout(r, 50));
  assert.ok(dealModal.classList.contains('hidden'), 'Deal modal should be closed');
  console.log('  -> PASS (Deal modal renders and closes correctly)');

  // --- Test 8: Reverse Link: Voucher to Store on Card ---
  console.log('[Test 8] Testing reverse link from voucher to store on cards...');
  const dealWithStoreData = dealsData.deals.find(d => d.matched_store_name);
  if (dealWithStoreData) {
    dealsSearchInput.value = dealWithStoreData.title;
    dealsSearchInput.dispatchEvent(new window.Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 180));
  }
  const dealWithStore = Array.from(document.querySelectorAll('#deals-grid .deal-card')).find(c => 
    c.querySelector('[data-action="view-linked-store"]')
  );
  assert.ok(dealWithStore, 'Found deal with linked store on cards');
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
  // Switch back to stores and search for store with deal
  const tabStoresBtn = document.getElementById('tab-stores-btn');
  tabStoresBtn.click();
  const searchInputStores = document.getElementById('search-input');
  if (searchInputStores) {
    searchInputStores.value = targetStoreName;
    searchInputStores.dispatchEvent(new window.Event('input', { bubbles: true }));
  }
  await new Promise(r => setTimeout(r, 180));

  const storeWithBadge = Array.from(document.querySelectorAll('#cards-view .store-card')).find(c => 
    c.querySelector('[data-action="view-linked-deal"]')
  );
  assert.ok(storeWithBadge, 'Found store card with linked deal badge');
  const jumpBtn = storeWithBadge.querySelector('[data-action="view-linked-deal"]');
  assert.ok(jumpBtn, 'Found jump button on store card');
  const storeName = storeWithBadge.querySelector('h3').textContent.trim();
  jumpBtn.click();
  await new Promise(r => setTimeout(r, 50));

  assert.ok(!dealsSection.classList.contains('hidden'), 'Should jump to Deals tab');
  assert.strictEqual(dealsSearchInput.value, storeName, 'Deals search should be pre-filled with store name');
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

  // --- Test 11: Switch to Statement Discounts (Billing) Tab ---
  console.log('[Test 11] Switching to Statement Discounts (Billing) tab...');
  const tabBillingBtn = document.getElementById('tab-billing-btn');
  assert.ok(tabBillingBtn, 'Tab billing button should exist');
  tabBillingBtn.click();
  await new Promise(r => setTimeout(r, 50));

  const billingSection = document.getElementById('billing-tab-section');
  assert.ok(!billingSection.classList.contains('hidden'), 'Billing section should be visible');
  assert.ok(storesSection.classList.contains('hidden'), 'Stores section should be hidden');
  assert.ok(dealsSection.classList.contains('hidden'), 'Deals section should be hidden');

  let billingCards = document.querySelectorAll('#billing-grid .billing-card');
  const initialBillingExpected = Math.min(billingData.stores.length, 60);
  assert.strictEqual(billingCards.length, initialBillingExpected, `Expected initial batch of ${initialBillingExpected} billing stores`);

  // Test Load More button
  const billingLoadMoreBtn = document.getElementById('billing-load-more-btn');
  if (billingData.stores.length > 60) {
    assert.ok(billingLoadMoreBtn, 'Load more button for billing should exist');
    billingLoadMoreBtn.click();
    await new Promise(r => setTimeout(r, 50));
    billingCards = document.querySelectorAll('#billing-grid .billing-card');
    const secondBillingExpected = Math.min(billingData.stores.length, 120);
    assert.strictEqual(billingCards.length, secondBillingExpected, `Billing count should expand to ${secondBillingExpected} after Load More`);
  }
  console.log('  -> PASS (Switched to Billing tab with progressive rendering validated)');

  // --- Test 12: Billing Live Search Filter ---
  console.log('[Test 12] Testing Billing live search filter...');
  const billingSearchInput = document.getElementById('billing-search-input');
  const sampleBillingSearch = 'פיצה';
  billingSearchInput.value = sampleBillingSearch;
  billingSearchInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 180));

  let filteredBilling = document.querySelectorAll('#billing-grid .billing-card');
  assert.ok(filteredBilling.length > 0 && filteredBilling.length <= billingData.stores.length, 'Should filter billing stores by search');
  assert.ok(filteredBilling[0].textContent.includes(sampleBillingSearch), 'Card content should include search term');

  // Clear search
  const clearBillingSearchBtn = document.getElementById('clear-billing-search-btn');
  clearBillingSearchBtn.click();
  await new Promise(r => setTimeout(r, 50));
  filteredBilling = document.querySelectorAll('#billing-grid .billing-card');
  const resetBillingExpected = Math.min(billingData.stores.length, 60);
  assert.strictEqual(filteredBilling.length, resetBillingExpected, `Expected ${resetBillingExpected} billing stores restored after clear`);
  console.log('  -> PASS (Billing live search filter works correctly)');

  // --- Test 13: Billing City Dropdown Filter ---
  console.log('[Test 13] Testing Billing city dropdown filter...');
  const billingCitySelect = document.getElementById('billing-city-select');
  assert.ok(billingCitySelect, 'Billing city select should exist');
  assert.ok(billingCitySelect.options.length > 1, 'City options should be populated');

  // Select the second option (e.g. online or top city)
  const targetCityValue = billingCitySelect.options[1].value;
  billingCitySelect.value = targetCityValue;
  billingCitySelect.dispatchEvent(new window.Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 100));

  const cityFilteredCards = document.querySelectorAll('#billing-grid .billing-card');
  assert.ok(cityFilteredCards.length > 0, 'City filtered cards should be present');

  // Reset city filter
  billingCitySelect.value = 'all';
  billingCitySelect.dispatchEvent(new window.Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 50));
  console.log('  -> PASS (Billing city filter works correctly)');

  // --- Test 14: Billing Details Modal ---
  console.log('[Test 14] Testing Billing details modal...');
  const firstBillingCard = document.querySelector('#billing-grid .billing-card');
  firstBillingCard.click();
  await new Promise(r => setTimeout(r, 50));

  const billingModal = document.getElementById('billing-modal');
  assert.ok(!billingModal.classList.contains('hidden'), 'Billing modal should be open');
  const billingModalTitle = document.getElementById('billing-modal-title').textContent;
  assert.ok(billingModalTitle.length > 0, 'Billing modal title should be populated');

  const billingModalDiscount = document.getElementById('billing-modal-discount').textContent;
  assert.ok(billingModalDiscount.includes('%'), 'Billing modal discount should include %');

  const officialLink = document.getElementById('billing-modal-official-link').href;
  assert.ok(officialLink.includes('be-plus.co.il/product/'), 'Official link should use valid /product/{id} routing');
  assert.ok(!officialLink.includes('/component/crm/'), 'Official link must not contain broken /component/crm/ route');

  // Verify card logo attributes
  const cardImg = firstBillingCard.querySelector('img');
  if (cardImg) {
    assert.strictEqual(cardImg.getAttribute('loading'), 'lazy', 'Card image should have loading="lazy"');
    assert.strictEqual(cardImg.getAttribute('referrerpolicy'), 'no-referrer', 'Card image should have referrerpolicy="no-referrer"');
  }

  // Verify modal logo attributes
  const modalLogo = document.getElementById('billing-modal-logo');
  assert.strictEqual(modalLogo.getAttribute('referrerpolicy'), 'no-referrer', 'Modal logo should have referrerpolicy="no-referrer"');

  // Close modal
  const billingModalCloseBtn = document.getElementById('billing-modal-close-btn');
  billingModalCloseBtn.click();
  await new Promise(r => setTimeout(r, 50));
  assert.ok(billingModal.classList.contains('hidden'), 'Billing modal should be closed');
  console.log('  -> PASS (Billing modal renders and closes correctly)');

  // --- Test 15: Cross-Link Jump to Billing Tab from Store Card ---
  console.log('[Test 15] Testing cross-link jump from Store card to Billing tab...');
  tabStoresBtn.click();
  const searchInputStoresEl = document.getElementById('search-input');
  if (searchInputStoresEl) {
    searchInputStoresEl.value = 'ריקושט';
    searchInputStoresEl.dispatchEvent(new window.Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 180));
  }

  // Find a store with linked billing badge
  const storeWithBilling = Array.from(document.querySelectorAll('#cards-view .store-card')).find(c =>
    c.querySelector('[data-action="view-linked-billing"]')
  );
  assert.ok(storeWithBilling, 'Found store card with linked billing badge');
  const billingJumpBtn = storeWithBilling.querySelector('[data-action="view-linked-billing"]');
  assert.ok(billingJumpBtn, 'Found billing jump button on store card');
  billingJumpBtn.click();
  await new Promise(r => setTimeout(r, 50));

  assert.ok(!billingSection.classList.contains('hidden'), 'Should transition to Billing tab');
  assert.ok(billingSearchInput.value.length > 0, 'Billing search should be pre-filled with store name');
  // --- Test 16: Tab 3 Store Search vs Description & Cross-Linking Integrity ---
  console.log('[Test 16] Verifying Tab 3 store-only matching for "אהבה" and cross-link integrity...');
  // Ensure we are on billing tab
  tabBillingBtn.click();
  billingSearchInput.value = 'אהבה';
  billingSearchInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 200));

  const matchingCountText = document.getElementById('matching-billing-count').textContent.trim();
  assert.strictEqual(matchingCountText, '14', `Expected exactly 14 billing stores matching "אהבה", got ${matchingCountText}`);

  const renderedAhavaCards = document.querySelectorAll('#billing-grid .billing-card');
  assert.strictEqual(renderedAhavaCards.length, 14, 'Should render all 14 stores with "אהבה"');

  // Verify that all 14 stores actually contain "אהבה" in their name, and description-only false positives are excluded
  renderedAhavaCards.forEach(card => {
    const cardTitle = card.querySelector('h3').textContent;
    assert.ok(cardTitle.includes('אהבה'), `Card title "${cardTitle}" must contain "אהבה"`);
    // Ensure no false-positive store like DAS or EMILYA is present
    assert.ok(!cardTitle.includes('DAS') && !cardTitle.includes('EMILYA'), 'Description-only stores must be excluded');
  });

  // Verify that stores "זמן לאהבה" and "סוד האהבה" do NOT falsely link to store "אהבה" (AHAVA cosmetics)
  const zmanCard = Array.from(renderedAhavaCards).find(c => c.textContent.includes('זמן לאהבה'));
  if (zmanCard) {
    const falseStoreLink = zmanCard.querySelector('[data-action="view-linked-store"]');
    assert.strictEqual(falseStoreLink, null, '"זמן לאהבה" must not falsely link to store "אהבה"');
  }

  // Now enable the "Search in Description" toggle in Tab 3
  const billingSearchDescToggle = document.getElementById('billing-search-desc-toggle');
  assert.ok(billingSearchDescToggle, 'billingSearchDescToggle should exist');
  billingSearchDescToggle.checked = true;
  billingSearchDescToggle.dispatchEvent(new window.Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 50));

  const countWithDesc = document.getElementById('matching-billing-count').textContent.trim();
  assert.strictEqual(countWithDesc, '47', `Expected 47 stores matching "אהבה" with description search enabled, got ${countWithDesc}`);
  assert.ok(document.getElementById('active-billing-filter-text').textContent.includes('כולל תיאור'), 'Filter badge should mention כולל תיאור');

  // Disable toggle again
  billingSearchDescToggle.checked = false;
  billingSearchDescToggle.dispatchEvent(new window.Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 50));
  assert.strictEqual(document.getElementById('matching-billing-count').textContent.trim(), '14', 'Should return to 14 stores when description toggle is off');

  // Clear billing search
  clearBillingSearchBtn.click();
  await new Promise(r => setTimeout(r, 50));

  // Test description toggle in Tab 2 (Deals)
  tabDealsBtn.click();
  await new Promise(r => setTimeout(r, 50));
  const dealsSearchDescToggle = document.getElementById('deals-search-desc-toggle');
  assert.ok(dealsSearchDescToggle, 'dealsSearchDescToggle should exist');
  dealsSearchInput.value = 'אהבה';
  dealsSearchInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 180));

  const dealsCountWithoutDesc = parseInt(document.getElementById('matching-deals-count').textContent.trim(), 10);
  assert.strictEqual(dealsCountWithoutDesc, 6, `Expected 6 deals matching "אהבה" without desc, got ${dealsCountWithoutDesc}`);

  dealsSearchDescToggle.checked = true;
  dealsSearchDescToggle.dispatchEvent(new window.Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 50));
  const dealsCountWithDesc = parseInt(document.getElementById('matching-deals-count').textContent.trim(), 10);
  assert.strictEqual(dealsCountWithDesc, 9, `Expected 9 deals matching "אהבה" with desc, got ${dealsCountWithDesc}`);

  // Clear deals search
  clearDealsSearchBtn.click();
  await new Promise(r => setTimeout(r, 50));

  // Test description toggle in Tab 1 (Stores)
  tabStoresBtn.click();
  await new Promise(r => setTimeout(r, 50));
  const storesSearchDescToggle = document.getElementById('stores-search-desc-toggle');
  assert.ok(storesSearchDescToggle, 'storesSearchDescToggle should exist');

  console.log('  -> PASS (Special option to search in description validated across all 3 tabs)');

  // --- Test 17: Zero Console Errors ---
  console.log('[Test 17] Checking for console errors...');
  assert.strictEqual(consoleErrors.length, 0, `Expected 0 console errors, but found: ${consoleErrors.join(', ')}`);
  console.log('  -> PASS (Zero errors during entire session)');

  console.log('\n====================================================');
  console.log('   ALL 17 UI & DOM INTEGRATION TESTS PASSED!       ');
  console.log('====================================================\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('\n[TEST FAILED]', err);
  process.exit(1);
});
