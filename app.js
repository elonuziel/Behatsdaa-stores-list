/**
 * Behatsdaa Multi-Card Participating Stores, Deals & Billing Discounts Web Application
 */

(function () {
  'use strict';

  // Application State - Stores (Rechargeable Cards)
  let storeData = null;
  let allStores = [];
  let availableCards = [];
  let currentCard = 'all';
  let currentCategory = 'all';
  let searchQuery = '';
  let storesSearchInDesc = false;
  let currentSort = 'discount-desc';
  let currentView = localStorage.getItem('behatsdaa_view') || 'grid';

  // Application State - Deals & Vouchers
  let dealsData = null;
  let allDeals = [];
  let availableTags = [];
  let currentDealTag = 'all';
  let currentDealCategory = 'all';
  let dealsSearchQuery = '';
  let dealsSearchInDesc = false;
  let currentDealSort = 'discount-desc';
  let currentDealMaxPrice = 'all';

  // Application State - Billing Discounts (Be-Plus)
  let billingData = null;
  let allBillingStores = [];
  let availableBillingCities = [];
  let availableBillingCategories = [];
  let currentBillingCity = 'all';
  let currentBillingCategory = 'all';
  let billingSearchQuery = '';
  let billingSearchInDesc = false;
  let currentBillingSort = 'discount-desc';

  // Navigation State
  let currentTab = 'stores';
  if (window.location.hash === '#deals') currentTab = 'deals';
  else if (window.location.hash === '#billing') currentTab = 'billing';

  // Progressive Rendering Page Sizes
  const STORES_PAGE_SIZE = 60;
  let storesVisibleCount = STORES_PAGE_SIZE;
  const DEALS_PAGE_SIZE = 60;
  let dealsVisibleCount = DEALS_PAGE_SIZE;
  const BILLING_PAGE_SIZE = 60;
  let billingVisibleCount = BILLING_PAGE_SIZE;

  // DOM Elements - Navigation Tabs
  const tabStoresBtn = document.getElementById('tab-stores-btn');
  const tabDealsBtn = document.getElementById('tab-deals-btn');
  const tabBillingBtn = document.getElementById('tab-billing-btn');
  const tabStoresCount = document.getElementById('tab-stores-count');
  const tabDealsCount = document.getElementById('tab-deals-count');
  const tabBillingCount = document.getElementById('tab-billing-count');
  const storesTabSection = document.getElementById('stores-tab-section');
  const dealsTabSection = document.getElementById('deals-tab-section');
  const billingTabSection = document.getElementById('billing-tab-section');
  const viewModeToggleWrapper = document.getElementById('view-mode-toggle-wrapper');

  // DOM Elements - Stores
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  const storesSearchDescToggle = document.getElementById('stores-search-desc-toggle');
  const cardFilterSelect = document.getElementById('card-filter-select');
  const sortSelect = document.getElementById('sort-select');
  const categoryChipsContainer = document.getElementById('category-chips-container');
  const matchingCountEl = document.getElementById('matching-count');
  const totalCountEl = document.getElementById('total-count');
  const activeFilterBadge = document.getElementById('active-filter-badge');
  const activeFilterText = document.getElementById('active-filter-text');
  const resetFiltersBtn = document.getElementById('reset-filters-btn');
  const lastUpdatedDateEl = document.getElementById('last-updated-date');

  const cardsView = document.getElementById('cards-view');
  const tableView = document.getElementById('table-view');
  const tableTbody = document.getElementById('table-tbody');
  const noResultsEl = document.getElementById('no-results');
  const clearFiltersBtn = document.getElementById('clear-filters-btn');

  const viewGridBtn = document.getElementById('view-grid-btn');
  const viewTableBtn = document.getElementById('view-table-btn');
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const storesLoadMoreContainer = document.getElementById('stores-load-more-container');
  const storesLoadMoreBtn = document.getElementById('stores-load-more-btn');

  // DOM Elements - Store Modal
  const storeModal = document.getElementById('store-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalDismissBtn = document.getElementById('modal-dismiss-btn');
  const modalLogo = document.getElementById('modal-logo');
  const modalCategory = document.getElementById('modal-category');
  const modalTitle = document.getElementById('modal-title');
  const modalWebsiteLink = document.getElementById('modal-website-link');
  const modalCardsList = document.getElementById('modal-cards-list');
  const modalConditions = document.getElementById('modal-conditions');
  const modalLinkedDealBanner = document.getElementById('modal-linked-deal-banner');
  const modalViewDealBtn = document.getElementById('modal-view-deal-btn');
  const modalLinkedBillingBanner = document.getElementById('modal-linked-billing-banner');
  const modalLinkedBillingTitle = document.getElementById('modal-linked-billing-title');
  const modalViewBillingBtn = document.getElementById('modal-view-billing-btn');

  // DOM Elements - Deals
  const dealsSearchInput = document.getElementById('deals-search-input');
  const clearDealsSearchBtn = document.getElementById('clear-deals-search-btn');
  const dealsSearchDescToggle = document.getElementById('deals-search-desc-toggle');
  const dealsTagSelect = document.getElementById('deals-tag-select');
  const dealsPriceFilterSelect = document.getElementById('deals-price-filter-select');
  const dealsSortSelect = document.getElementById('deals-sort-select');
  const dealsCategoryChipsContainer = document.getElementById('deals-category-chips-container');
  const matchingDealsCountEl = document.getElementById('matching-deals-count');
  const totalDealsCountEl = document.getElementById('total-deals-count');
  const activeDealsFilterBadge = document.getElementById('active-deals-filter-badge');
  const activeDealsFilterText = document.getElementById('active-deals-filter-text');
  const resetDealsFiltersBtn = document.getElementById('reset-deals-filters-btn');
  const dealsLastUpdatedDateEl = document.getElementById('deals-last-updated-date');
  const dealsGrid = document.getElementById('deals-grid');
  const dealsTabSpinner = document.getElementById('deals-tab-spinner');
  const noDealsResults = document.getElementById('no-deals-results');
  const clearDealsFiltersBtn = document.getElementById('clear-deals-filters-btn');
  const dealsLoadMoreContainer = document.getElementById('deals-load-more-container');
  const dealsLoadMoreBtn = document.getElementById('deals-load-more-btn');

  // DOM Elements - Deal Modal
  const dealModal = document.getElementById('deal-modal');
  const dealModalCloseBtn = document.getElementById('deal-modal-close-btn');
  const dealModalDismissBtn = document.getElementById('deal-modal-dismiss-btn');
  const dealModalImg = document.getElementById('deal-modal-img');
  const dealModalCategory = document.getElementById('deal-modal-category');
  const dealModalTag = document.getElementById('deal-modal-tag');
  const dealModalTitle = document.getElementById('deal-modal-title');
  const dealModalSupplier = document.getElementById('deal-modal-supplier');
  const dealModalPrice = document.getElementById('deal-modal-price');
  const dealModalPriceLabel = document.getElementById('deal-modal-price-label');
  const dealModalOrigPrice = document.getElementById('deal-modal-orig-price');
  const dealModalSavingsBadge = document.getElementById('deal-modal-savings-badge');
  const dealModalSavingsText = document.getElementById('deal-modal-savings-text');
  const dealModalVariantsSection = document.getElementById('deal-modal-variants-section');
  const dealModalVariantsList = document.getElementById('deal-modal-variants-list');
  const dealModalDescription = document.getElementById('deal-modal-description');
  const dealModalTerms = document.getElementById('deal-modal-terms');
  const dealModalLocations = document.getElementById('deal-modal-locations');
  const dealModalExpiration = document.getElementById('deal-modal-expiration');
  const dealModalLimits = document.getElementById('deal-modal-limits');
  const dealModalLimitsWrapper = document.getElementById('deal-modal-limits-wrapper');
  const dealModalBuyLink = document.getElementById('deal-modal-buy-link');
  const dealModalLinkedStoreBanner = document.getElementById('deal-modal-linked-store-banner');
  const dealModalLinkedStoreTitle = document.getElementById('deal-modal-linked-store-title');
  const dealModalViewStoreBtn = document.getElementById('deal-modal-view-store-btn');
  const dealModalLinkedBillingBanner = document.getElementById('deal-modal-linked-billing-banner');
  const dealModalLinkedBillingTitle = document.getElementById('deal-modal-linked-billing-title');
  const dealModalViewBillingBtn = document.getElementById('deal-modal-view-billing-btn');

  // DOM Elements - Billing Discounts
  const billingSearchInput = document.getElementById('billing-search-input');
  const clearBillingSearchBtn = document.getElementById('clear-billing-search-btn');
  const billingSearchDescToggle = document.getElementById('billing-search-desc-toggle');
  const billingCitySelect = document.getElementById('billing-city-select');
  const billingSortSelect = document.getElementById('billing-sort-select');
  const billingCategoryChipsContainer = document.getElementById('billing-category-chips-container');
  const matchingBillingCountEl = document.getElementById('matching-billing-count');
  const totalBillingCountEl = document.getElementById('total-billing-count');
  const activeBillingFilterBadge = document.getElementById('active-billing-filter-badge');
  const activeBillingFilterText = document.getElementById('active-billing-filter-text');
  const resetBillingFiltersBtn = document.getElementById('reset-billing-filters-btn');
  const billingLastUpdatedDateEl = document.getElementById('billing-last-updated-date');
  const billingGrid = document.getElementById('billing-grid');
  const billingTabSpinner = document.getElementById('billing-tab-spinner');
  const noBillingResults = document.getElementById('no-billing-results');
  const clearBillingFiltersBtn = document.getElementById('clear-billing-filters-btn');
  const billingLoadMoreContainer = document.getElementById('billing-load-more-container');
  const billingLoadMoreBtn = document.getElementById('billing-load-more-btn');

  // DOM Elements - Billing Modal
  const billingModal = document.getElementById('billing-modal');
  const billingModalCloseBtn = document.getElementById('billing-modal-close-btn');
  const billingModalDismissBtn = document.getElementById('billing-modal-dismiss-btn');
  const billingModalLogo = document.getElementById('billing-modal-logo');
  const billingModalCategory = document.getElementById('billing-modal-category');
  const billingModalCityBadge = document.getElementById('billing-modal-city-badge');
  const billingModalTitle = document.getElementById('billing-modal-title');
  const billingModalAddress = document.getElementById('billing-modal-address');
  const billingModalAddressWrapper = document.getElementById('billing-modal-address-wrapper');
  const billingModalDiscount = document.getElementById('billing-modal-discount');
   const billingModalLinkedStoreBanner = document.getElementById('billing-modal-linked-store-banner');
  const billingModalLinkedStoreTitle = document.getElementById('billing-modal-linked-store-title');
  const billingModalLinkedStoreMaxDisc = document.getElementById('billing-modal-linked-store-max-disc');
  const billingModalCardsList = document.getElementById('billing-modal-cards-list');
  const billingModalViewStoreBtn = document.getElementById('billing-modal-view-store-btn');
  const billingModalLinkedDealBanner = document.getElementById('billing-modal-linked-deal-banner');
  const billingModalLinkedDealTitle = document.getElementById('billing-modal-linked-deal-title');
  const billingModalDealsList = document.getElementById('billing-modal-deals-list');
  const billingModalViewDealBtn = document.getElementById('billing-modal-view-deal-btn');
  const billingModalDescription = document.getElementById('billing-modal-description');
  const billingModalOfficialLink = document.getElementById('billing-modal-official-link');

  let activeModalStore = null;
  let activeModalBillingStore = null;

  // Progressive loading flags
  let storesLoaded = false;
  let dealsLoaded = false;
  let billingLoaded = false;

  // Lightweight Debounce Utility
  function debounce(fn, delay = 120) {
    let timer = null;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // Initialize theme
  function initTheme() {
    const savedTheme = localStorage.getItem('behatsdaa_theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('behatsdaa_theme', isDark ? 'dark' : 'light');
  }

  // Hebrew Text Normalizer for robust search
  function normalizeHebrew(text) {
    if (!text) return '';
    return String(text)
      .toLowerCase()
      .replace(/[\u0591-\u05C7]/g, '')
      .replace(/ך/g, 'כ')
      .replace(/ם/g, 'מ')
      .replace(/ן/g, 'נ')
      .replace(/ף/g, 'פ')
      .replace(/ץ/g, 'צ')
      .replace(/["'״׳\-–_.,()/]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Format currency
  function formatILS(amount) {
    if (!amount && amount !== 0) return '';
    return `${Number(amount).toLocaleString('he-IL')} ₪`;
  }

  // Switch Main Tabs
  function switchTab(tab) {
    currentTab = tab;
    window.location.hash = tab === 'deals' ? 'deals' : (tab === 'billing' ? 'billing' : 'stores');

    // Default classes for inactive buttons
    const inactiveClass = 'main-tab-btn flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800';
    tabStoresBtn.className = inactiveClass;
    tabDealsBtn.className = inactiveClass;
    if (tabBillingBtn) tabBillingBtn.className = inactiveClass;

    storesTabSection.classList.add('hidden');
    dealsTabSection.classList.add('hidden');
    if (billingTabSection) billingTabSection.classList.add('hidden');
    viewModeToggleWrapper.classList.add('hidden');

    if (tab === 'deals') {
      tabDealsBtn.className = 'main-tab-btn flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-xs bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white';
      dealsTabSection.classList.remove('hidden');
      if (!dealsLoaded) {
        if (dealsTabSpinner) dealsTabSpinner.classList.remove('hidden');
        if (dealsGrid) dealsGrid.classList.add('hidden');
        if (noDealsResults) noDealsResults.classList.add('hidden');
        if (dealsLoadMoreContainer) dealsLoadMoreContainer.classList.add('hidden');
      } else {
        if (dealsTabSpinner) dealsTabSpinner.classList.add('hidden');
        if (dealsGrid) dealsGrid.classList.remove('hidden');
        renderDeals();
      }
    } else if (tab === 'billing') {
      if (tabBillingBtn) {
        tabBillingBtn.className = 'main-tab-btn flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-xs bg-purple-600 text-white dark:bg-purple-600 dark:text-white';
      }
      if (billingTabSection) billingTabSection.classList.remove('hidden');
      if (!billingLoaded) {
        if (billingTabSpinner) billingTabSpinner.classList.remove('hidden');
        if (billingGrid) billingGrid.classList.add('hidden');
        if (noBillingResults) noBillingResults.classList.add('hidden');
        if (billingLoadMoreContainer) billingLoadMoreContainer.classList.add('hidden');
      } else {
        if (billingTabSpinner) billingTabSpinner.classList.add('hidden');
        if (billingGrid) billingGrid.classList.remove('hidden');
        renderBillingStores();
      }
    } else {
      tabStoresBtn.className = 'main-tab-btn flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-xs bg-blue-600 text-white dark:bg-blue-600 dark:text-white';
      storesTabSection.classList.remove('hidden');
      viewModeToggleWrapper.classList.remove('hidden');
      if (storesLoaded) {
        renderStores();
      }
    }
  }

  // Cross-link Stores, Deals, and Billing Discounts
  function crossLinkAllDatasets() {
    if (!allStores.length) return;

    const cleanKey = (str) => (str || '').toLowerCase().replace(/[^א-תa-z0-9]/g, '');

    // Extract core brand name by stripping common noise/channel words & normalizing Hebrew final letters
    function getCoreBrand(name) {
      if (!name) return '';
      let s = (name || '').toLowerCase();
      s = s.replace(/\b(אונליין|online|רשת|אתר|סניף|סניפי|בע"מ|בעמ|בע'מ|ltd|ישראל|israel|shop|store)\b/gi, ' ');
      s = s.replace(/ם/g, 'מ').replace(/ן/g, 'נ').replace(/ץ/g, 'צ').replace(/ף/g, 'פ').replace(/ך/g, 'כ');
      return cleanKey(s);
    }

    // 1. Map: core brand -> array of billing stores
    const billingByCore = new Map();
    allBillingStores.forEach(b => {
      const core = getCoreBrand(b.name);
      if (!core) return;
      if (!billingByCore.has(core)) billingByCore.set(core, []);
      billingByCore.get(core).push(b);
    });

    // Helper: find best billing match for a given brand name (highest discount)
    function findBestBillingMatch(name) {
      if (!name) return null;
      const core = getCoreBrand(name);
      if (!core) return null;
      const matches = billingByCore.get(core);
      if (matches && matches.length > 0) {
        return matches.reduce((best, cur) => (cur.discount > best.discount ? cur : best), matches[0]);
      }
      return null;
    }

    // 2. Map: core brand -> store (Tab 1)
    const storeByCore = new Map();
    allStores.forEach(s => {
      const core = getCoreBrand(s.name);
      if (core && !storeByCore.has(core)) storeByCore.set(core, s);
    });

    // 3. Map: core brand -> deals (Tab 2)
    const dealsByCore = new Map();
    allDeals.forEach(d => {
      const keys = new Set();
      const k1 = getCoreBrand(d.supplier);
      if (k1) keys.add(k1);
      const k2 = getCoreBrand(d.matched_store_name);
      if (k2) keys.add(k2);
      keys.forEach(k => {
        if (!dealsByCore.has(k)) dealsByCore.set(k, []);
        if (!dealsByCore.get(k).includes(d)) dealsByCore.get(k).push(d);
      });
    });

    // Helper: find compatible store for a billing store (exact core match or verified branch/hyphen match)
    function findCompatibleStore(b) {
      if (!b || !b.name) return null;
      const bCore = getCoreBrand(b.name);
      if (bCore && storeByCore.has(bCore)) return storeByCore.get(bCore);

      // Check hyphen / en-dash split: "Brand - Location/Subtitle"
      if (b.name.includes(' - ') || b.name.includes(' – ')) {
        const parts = b.name.split(/[–\-]/);
        const leftCore = getCoreBrand(parts[0]);
        if (leftCore && storeByCore.has(leftCore)) {
          return storeByCore.get(leftCore);
        }
      }

      // Check branch patterns: starts with store name followed by branch indicator or matching city or brackets
      const bName = b.name.trim().toLowerCase();
      const bCityClean = cleanKey(b.city);
      for (const [score, s] of storeByCore.entries()) {
        if (score.length < 3) continue;
        const sName = s.name.trim().toLowerCase();
        if (bName.startsWith(sName)) {
          const rest = bName.slice(sName.length).trim().replace(/^[ \-_–/\\|,.]+/, '').trim();
          const restCore = cleanKey(rest);
          const isBranchWord = /^(סניף|סניפי|קניון|מרכז|מתחם)/.test(rest);
          const isCityMatch = Boolean(bCityClean && bCityClean !== 'online' && (restCore === bCityClean || restCore.startsWith(bCityClean)));
          const isBracketed = /^(\[|\().+(\]|\))$/.test(bName.slice(sName.length).trim());
          if (isBranchWord || isCityMatch || isBracketed) {
            return s;
          }
        }
      }

      return null;
    }

    // 1. Cross-link Billing Stores (Tab 3) first to map branch connections
    const storeToBillingMatches = new Map();
    allBillingStores.forEach(b => {
      const bCore = getCoreBrand(b.name);
      b.linkedStore = findCompatibleStore(b);

      if (b.linkedStore) {
        if (!storeToBillingMatches.has(b.linkedStore.id)) {
          storeToBillingMatches.set(b.linkedStore.id, []);
        }
        storeToBillingMatches.get(b.linkedStore.id).push(b);
      }

      // Inherit deals matching b directly or via linkedStore
      const deals = [];
      const d1 = dealsByCore.get(bCore) || [];
      d1.forEach(d => { if (!deals.includes(d)) deals.push(d); });
      if (b.linkedStore && b.linkedStore.linkedDeals) {
        b.linkedStore.linkedDeals.forEach(d => { if (!deals.includes(d)) deals.push(d); });
      }
      b.linkedDeals = deals;
    });

    // 2. Cross-link Stores (Tab 1)
    allStores.forEach(store => {
      const sCore = getCoreBrand(store.name);
      // Link Deals: matched_store_id or exact store_name or exact core brand
      store.linkedDeals = allDeals.filter(d => {
        if (d.matched_store_id && d.matched_store_id === store.id) return true;
        if (d.matched_store_name && d.matched_store_name === store.name) return true;
        const suppCore = getCoreBrand(d.supplier);
        return Boolean(suppCore && sCore && suppCore === sCore);
      });

      // Link Billing: exact core brand match OR best discount among branch matches
      let bestBilling = findBestBillingMatch(store.name);
      const branchBillings = storeToBillingMatches.get(store.id);
      if (branchBillings && branchBillings.length > 0) {
        const bestBranch = branchBillings.reduce((best, cur) => (cur.discount > best.discount ? cur : best), branchBillings[0]);
        if (!bestBilling || bestBranch.discount > bestBilling.discount) {
          bestBilling = bestBranch;
        }
      }
      store.linkedBillingStore = bestBilling;

      // Update linkedDeals for billing stores that linked to this store
      if (branchBillings && branchBillings.length > 0 && store.linkedDeals.length > 0) {
        branchBillings.forEach(b => {
          store.linkedDeals.forEach(d => {
            if (!b.linkedDeals.includes(d)) b.linkedDeals.push(d);
          });
        });
      }
    });

    // 3. Cross-link Deals (Tab 2)
    allDeals.forEach(deal => {
      // Link Store: matched_store_id, matched_store_name, or exact core brand
      const suppCore = getCoreBrand(deal.supplier);
      deal.linkedStore = allStores.find(s => 
        (deal.matched_store_id && s.id === deal.matched_store_id) || 
        (deal.matched_store_name && s.name === deal.matched_store_name) || 
        (suppCore && getCoreBrand(s.name) === suppCore)
      ) || null;

      // Link Billing: exact core brand match or inherit from deal.linkedStore
      let bestBilling = findBestBillingMatch(deal.supplier);
      if (!bestBilling && deal.linkedStore && deal.linkedStore.linkedBillingStore) {
        bestBilling = deal.linkedStore.linkedBillingStore;
      }
      deal.linkedBillingStore = bestBilling;
    });
  }

  // 1. Load Stores (Tab 1 - Primary Dataset, loads immediately)
  async function loadStores() {
    try {
      const response = await fetch('data/stores.json');
      if (!response.ok) throw new Error('Failed to load stores.json');
      storeData = await response.json();
    } catch (err) {
      console.warn('Stores fallback:', err);
      storeData = { metadata: { total_stores: 0, available_cards: [] }, stores: [] };
    }

    allStores = storeData.stores || [];
    allStores.forEach(s => {
      s._nameNorm = normalizeHebrew(s.name || '');
      s._catNorm = normalizeHebrew(s.category || '');
      s._condNorm = normalizeHebrew(s.conditions || '');
      s._cardsNorm = (s.cards || []).map(c => `${normalizeHebrew(c.card_name)} ${normalizeHebrew(c.discount)} ${normalizeHebrew(c.notes || '')}`).join(' ');
      s._searchStr = `${s._nameNorm} ${s._catNorm} ${s._cardsNorm}`.trim();
      s._searchWithDescStr = `${s._searchStr} ${s._condNorm}`.trim();
    });
    availableCards = storeData.metadata?.available_cards || [];
    totalCountEl.textContent = allStores.length;
    tabStoresCount.textContent = allStores.length;

    if (storeData.metadata?.last_updated) {
      const d = new Date(storeData.metadata.last_updated);
      lastUpdatedDateEl.textContent = d.toLocaleDateString('he-IL');
    }

    storesLoaded = true;
    populateCardsFilter();
    updateCategoryChips();
    applyViewMode(currentView);

    if (currentTab === 'stores') {
      renderStores();
    }
  }

  // 2. Load Deals (Tab 2 - Secondary Dataset, background streaming)
  async function loadDeals() {
    try {
      const dResponse = await fetch('data/deals.json');
      if (!dResponse.ok) throw new Error('Failed to load deals.json');
      dealsData = await dResponse.json();
    } catch (err) {
      console.warn('Deals fallback:', err);
      dealsData = { metadata: { total_deals: 0, tags: [], categories: [] }, deals: [] };
    }

    allDeals = dealsData.deals || [];
    allDeals.forEach(d => {
      d._titleNorm = normalizeHebrew(d.title || '');
      d._suppNorm = normalizeHebrew(d.supplier || '');
      d._catNorm = normalizeHebrew(d.category || '');
      d._tagsNorm = normalizeHebrew((d.tags || []).join(' '));
      d._descNorm = normalizeHebrew(d.description || '');
      d._termsNorm = normalizeHebrew(d.terms_of_use || '');
      d._searchStr = `${d._titleNorm} ${d._suppNorm} ${d._catNorm} ${d._tagsNorm}`.trim();
      d._searchWithDescStr = `${d._searchStr} ${d._descNorm} ${d._termsNorm}`.trim();
    });
    availableTags = dealsData.metadata?.tags || [];
    totalDealsCountEl.textContent = allDeals.length;
    tabDealsCount.textContent = allDeals.length;

    if (dealsData.metadata?.last_updated) {
      const d = new Date(dealsData.metadata.last_updated);
      dealsLastUpdatedDateEl.textContent = d.toLocaleDateString('he-IL');
    }

    dealsLoaded = true;
    populateDealsTagsFilter();
    updateDealsCategoryChips();

    if (dealsTabSpinner) dealsTabSpinner.classList.add('hidden');
    if (dealsGrid) dealsGrid.classList.remove('hidden');

    if (currentTab === 'deals') {
      renderDeals();
    }

    onDatasetsLoaded();
  }

  // 3. Load Billing Discounts (Tab 3 - Large Dataset ~6MB, background streaming)
  async function loadBilling() {
    try {
      const bResponse = await fetch('data/billing_stores.json');
      if (!bResponse.ok) throw new Error('Failed to load billing_stores.json');
      billingData = await bResponse.json();
    } catch (err) {
      console.warn('Billing fallback:', err);
      billingData = { metadata: { total_stores: 0 }, stores: [] };
    }

    allBillingStores = billingData.stores || [];
    allBillingStores.forEach(s => {
      s._nameNorm = normalizeHebrew(s.name || '');
      s._cityNorm = normalizeHebrew(s.city || '');
      s._catNorm = normalizeHebrew(`${s.category || ''} ${s.subcategory || ''}`);
      s._addressNorm = normalizeHebrew(s.address || '');
      s._descNorm = normalizeHebrew(s.description || '');
      // By default, _searchStr matches the store itself (name, category, city/address) without description
      s._searchStr = `${s._nameNorm} ${s._cityNorm} ${s._catNorm} ${s._addressNorm}`.trim();
      s._searchWithDescStr = `${s._searchStr} ${s._descNorm}`.trim();
    });

    if (totalBillingCountEl) totalBillingCountEl.textContent = allBillingStores.length.toLocaleString('he-IL');
    if (tabBillingCount) tabBillingCount.textContent = allBillingStores.length.toLocaleString('he-IL');

    if (billingData.metadata?.scraped_at && billingLastUpdatedDateEl) {
      const d = new Date(billingData.metadata.scraped_at);
      billingLastUpdatedDateEl.textContent = d.toLocaleDateString('he-IL');
    }

    billingLoaded = true;
    if (billingCitySelect) populateBillingCitiesFilter();
    if (billingCategoryChipsContainer) updateBillingCategoryChips();

    if (billingTabSpinner) billingTabSpinner.classList.add('hidden');
    if (billingGrid) billingGrid.classList.remove('hidden');

    if (currentTab === 'billing') {
      renderBillingStores();
    }

    onDatasetsLoaded();
  }

  // Dataset updates handler (updates cross-linking badges smoothly)
  function onDatasetsLoaded() {
    crossLinkAllDatasets();
    if (currentTab === 'stores') {
      renderStores();
    } else if (currentTab === 'deals' && dealsLoaded) {
      renderDeals();
    } else if (currentTab === 'billing' && billingLoaded) {
      renderBillingStores();
    }
  }

  // Decoupled Progressive Load Entrypoint
  async function loadAllData() {
    // Show subtle animated spinners in background tab counts
    if (tabDealsCount) {
      tabDealsCount.innerHTML = '<span class="inline-block w-2.5 h-2.5 border-2 border-slate-300 dark:border-slate-600 border-t-emerald-500 rounded-full animate-spin align-middle"></span>';
    }
    if (tabBillingCount) {
      tabBillingCount.innerHTML = '<span class="inline-block w-2.5 h-2.5 border-2 border-slate-300 dark:border-slate-600 border-t-purple-500 rounded-full animate-spin align-middle"></span>';
    }

    // 1. Immediately load and render Tab 1 (stores)
    await loadStores();

    // 2. Concurrently load Tab 2 (deals) and Tab 3 (billing) in background
    Promise.all([loadDeals(), loadBilling()]).catch(err => {
      console.warn('Background data load error:', err);
    });
  }

  // ==========================================
  // STORES LOGIC & RENDERING
  // ==========================================

  function populateCardsFilter() {
    cardFilterSelect.innerHTML = '<option value="all">כל הכרטיסים הנטענים</option>';
    availableCards.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.card_name;
      opt.textContent = `${c.card_name} (${c.store_count})`;
      cardFilterSelect.appendChild(opt);
    });
  }

  function updateCategoryChips() {
    const catCounts = {};
    let filteredForChips = allStores;
    if (currentCard !== 'all') {
      filteredForChips = filteredForChips.filter(s => 
        s.cards && s.cards.some(c => c.card_name === currentCard)
      );
    }

    filteredForChips.forEach(s => {
      const cat = s.category || 'כללי';
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });

    const categories = Object.keys(catCounts).sort((a, b) => catCounts[b] - catCounts[a]);

    categoryChipsContainer.innerHTML = '';

    const allChip = document.createElement('button');
    const isAll = currentCategory === 'all';
    allChip.className = `category-chip px-3.5 py-1.5 rounded-full font-medium transition text-xs flex items-center gap-1.5 whitespace-nowrap ${
      isAll 
        ? 'bg-blue-600 text-white shadow-xs' 
        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300'
    }`;
    allChip.dataset.category = 'all';
    allChip.innerHTML = `
      <span>הכל</span>
      <span class="category-count ${isAll ? 'bg-blue-700 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'} text-[10px] px-1.5 py-0.2 rounded-full">
        ${filteredForChips.length}
      </span>
    `;
    categoryChipsContainer.appendChild(allChip);

    categories.forEach(cat => {
      const isSelected = currentCategory === cat;
      const chip = document.createElement('button');
      chip.className = `category-chip px-3.5 py-1.5 rounded-full font-medium transition text-xs flex items-center gap-1.5 whitespace-nowrap ${
        isSelected 
          ? 'bg-blue-600 text-white shadow-xs' 
          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300'
      }`;
      chip.dataset.category = cat;
      chip.innerHTML = `
        <span>${cat}</span>
        <span class="category-count ${isSelected ? 'bg-blue-700 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'} text-[10px] px-1.5 py-0.2 rounded-full">
          ${catCounts[cat]}
        </span>
      `;
      categoryChipsContainer.appendChild(chip);
    });
  }

  function getFilteredStores() {
    let result = allStores;

    if (currentCard !== 'all') {
      result = result.filter(s => 
        s.cards && s.cards.some(c => c.card_name === currentCard)
      );
    }

    if (currentCategory !== 'all') {
      result = result.filter(s => (s.category || 'כללי') === currentCategory);
    }

    if (searchQuery) {
      const queryNorm = normalizeHebrew(searchQuery);
      result = result.filter(store => {
        const baseMatch = store._searchStr ? store._searchStr.includes(queryNorm) : (
          normalizeHebrew(store.name).includes(queryNorm) ||
          normalizeHebrew(store.category || '').includes(queryNorm) ||
          (store.cards && store.cards.some(c => 
            normalizeHebrew(c.card_name).includes(queryNorm) || 
            normalizeHebrew(c.discount).includes(queryNorm)
          ))
        );
        if (baseMatch) return true;
        if (storesSearchInDesc) {
          if (store._searchWithDescStr && store._searchWithDescStr.includes(queryNorm)) return true;
          if (store.linkedBillingStore && store.linkedBillingStore._descNorm && store.linkedBillingStore._descNorm.includes(queryNorm)) return true;
          if (store.linkedDeals && store.linkedDeals.some(d => (d._descNorm && d._descNorm.includes(queryNorm)) || (d._termsNorm && d._termsNorm.includes(queryNorm)))) return true;
        }
        return false;
      });

      // Prioritize store name matches (exact > startsWith > includes)
      result.sort((a, b) => {
        const aName = a._nameNorm || normalizeHebrew(a.name);
        const bName = b._nameNorm || normalizeHebrew(b.name);
        const aScore = aName === queryNorm ? 3 : (aName.startsWith(queryNorm) ? 2 : (aName.includes(queryNorm) ? 1 : 0));
        const bScore = bName === queryNorm ? 3 : (bName.startsWith(queryNorm) ? 2 : (bName.includes(queryNorm) ? 1 : 0));
        if (aScore !== bScore) return bScore - aScore;
        return 0;
      });
    }

    switch (currentSort) {
      case 'discount-desc':
        result.sort((a, b) => (b.max_discount || 0) - (a.max_discount || 0) || a.name.localeCompare(b.name, 'he'));
        break;
      case 'name-asc':
        result.sort((a, b) => a.name.localeCompare(b.name, 'he'));
        break;
      case 'cards-desc':
        result.sort((a, b) => ((b.cards && b.cards.length) || 0) - ((a.cards && a.cards.length) || 0) || (b.max_discount || 0) - (a.max_discount || 0));
        break;
    }

    return result;
  }

  function createStoreCardElement(store) {
    const card = document.createElement('div');
    card.className = 'store-card bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-700/80 shadow-xs flex flex-col justify-between hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer relative';
    card.dataset.storeId = store.id;

    const maxDisc = store.max_discount || 0;
    const badgeBg = maxDisc >= 25 ? 'badge-discount-gold text-amber-950 font-black' : 'badge-discount-blue text-white font-bold';

    const cardsHtml = (store.cards || []).slice(0, 3).map(c => `
      <div class="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
        <span class="text-slate-600 dark:text-slate-300 truncate max-w-[150px]">${c.card_name}</span>
        <span class="font-bold text-slate-800 dark:text-slate-200">${c.discount}</span>
      </div>
    `).join('');

    const extraCardsCount = (store.cards || []).length > 3 ? (store.cards || []).length - 3 : 0;
    const moreCardsTag = extraCardsCount > 0 ? `<div class="text-[11px] text-blue-600 dark:text-blue-400 font-medium text-left mt-1">+ עוד ${extraCardsCount} כרטיסים</div>` : '';

    const hasLinkedDeals = store.linkedDeals && store.linkedDeals.length > 0;
    const dealsBadgeHtml = hasLinkedDeals ? `
      <div class="mt-2 pt-2 border-t border-emerald-100 dark:border-emerald-900/50 flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1.5 rounded-xl hover:bg-emerald-100 transition-colors" data-action="view-linked-deal" data-store-name="${encodeURIComponent(store.name)}">
        <span class="flex items-center gap-1 font-semibold">
          <i data-lucide="tag" class="w-3.5 h-3.5 text-emerald-600"></i>
          <span>שובר/מבצע פעיל (${store.linkedDeals.length})</span>
        </span>
        <span class="text-[11px] underline">הצג</span>
      </div>
    ` : '';

    const linkedBilling = store.linkedBillingStore;
    const billingBadgeHtml = linkedBilling ? `
      <div class="mt-1.5 pt-1.5 border-t border-purple-100 dark:border-purple-900/50 flex items-center justify-between text-xs text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1.5 rounded-xl hover:bg-purple-100 transition-colors" data-action="view-linked-billing" data-store-name="${encodeURIComponent(store.name)}">
        <span class="flex items-center gap-1 font-semibold truncate">
          <i data-lucide="credit-card" class="w-3.5 h-3.5 text-purple-600 flex-shrink-0"></i>
          <span class="truncate">הנחה במעמד החיוב (${linkedBilling.discount}% באשראי)</span>
        </span>
        <span class="text-[11px] underline flex-shrink-0 mr-1">הצג</span>
      </div>
    ` : '';

    card.innerHTML = `
      <div>
        <div class="flex items-start justify-between gap-3 mb-3">
          <div class="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-700 p-1.5 border border-slate-100 dark:border-slate-600 flex items-center justify-center flex-shrink-0">
            ${store.logo ? `<img src="${store.logo}" alt="${store.name}" class="max-h-full max-w-full object-contain" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2280%22>🛍️</text></svg>'"/>` : `<i data-lucide="shopping-bag" class="w-6 h-6 text-slate-400"></i>`}
          </div>
          <div class="flex flex-col items-end gap-1">
            <span class="${badgeBg} px-2.5 py-1 rounded-xl text-xs shadow-xs">
              עד ${maxDisc}% הנחה
            </span>
            <span class="text-[11px] text-slate-500 dark:text-slate-400 font-medium">${store.category || 'כללי'}</span>
          </div>
        </div>

        <h3 class="font-bold text-base text-slate-900 dark:text-white leading-tight mb-2 truncate" title="${store.name}">
          ${store.name}
        </h3>

        <div class="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-2.5 mb-2">
          <div class="text-[11px] text-slate-400 dark:text-slate-500 font-medium mb-1">הנחות לפי כרטיסים:</div>
          ${cardsHtml}
          ${moreCardsTag}
        </div>
      </div>

      <div>
        ${dealsBadgeHtml}
        ${billingBadgeHtml}
        <div class="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700/60">
          <span class="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
            <span>לפרטים מלאים</span>
            <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i>
          </span>
          ${store.website ? `<span class="text-[11px] text-slate-400">אתר רשת</span>` : ''}
        </div>
      </div>
    `;

    return card;
  }

  function createStoreTableRow(store) {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 dark:hover:bg-slate-700/40 transition cursor-pointer';
    tr.dataset.storeId = store.id;

    const maxDisc = store.max_discount || 0;
    const badgeBg = maxDisc >= 25 ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200' : 'bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200';

    const cardPills = (store.cards || []).map(c => `
      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
        ${c.card_name}: <strong>${c.discount}</strong>
      </span>
    `).join(' ');

    const hasLinkedDeals = store.linkedDeals && store.linkedDeals.length > 0;
    const dealPill = hasLinkedDeals ? `
      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200">
        <i data-lucide="tag" class="w-3 h-3"></i>
        ${store.linkedDeals.length} מבצעים
      </span>
    ` : '';

    const linkedBilling = store.linkedBillingStore;
    const billingPill = linkedBilling ? `
      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200">
        <i data-lucide="credit-card" class="w-3 h-3"></i>
        ${linkedBilling.discount}% באשראי
      </span>
    ` : '';

    tr.innerHTML = `
      <td class="py-3 px-4 flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-700 p-1 border border-slate-200 dark:border-slate-600 flex items-center justify-center flex-shrink-0">
          ${store.logo ? `<img src="${store.logo}" alt="" class="max-h-full max-w-full object-contain" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2280%22>🛍️</text></svg>'"/>` : `<i data-lucide="shopping-bag" class="w-4 h-4 text-slate-400"></i>`}
        </div>
        <div class="font-bold text-slate-900 dark:text-white">${store.name}</div>
      </td>
      <td class="py-3 px-4 text-slate-600 dark:text-slate-300 text-xs">${store.category || 'כללי'}</td>
      <td class="py-3 px-4 text-center">
        <span class="inline-block px-2.5 py-1 rounded-xl text-xs font-bold ${badgeBg}">
          עד ${maxDisc}%
        </span>
      </td>
      <td class="py-3 px-4">
        <div class="flex flex-wrap gap-1 items-center">
          ${cardPills}
          ${dealPill}
          ${billingPill}
        </div>
      </td>
      <td class="py-3 px-4 text-center">
        <button class="text-blue-600 dark:text-blue-400 hover:text-blue-800 text-xs font-medium inline-flex items-center gap-1">
          <span>פרטים</span>
          <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i>
        </button>
      </td>
    `;

    return tr;
  }

  function renderStores() {
    const filtered = getFilteredStores();
    matchingCountEl.textContent = filtered.length;

    // Filter badge state
    const hasFilter = searchQuery || currentCard !== 'all' || currentCategory !== 'all' || (searchQuery && storesSearchInDesc);
    activeFilterBadge.classList.toggle('hidden', !hasFilter);

    if (hasFilter) {
      const parts = [];
      if (searchQuery) parts.push(`"${searchQuery}"${storesSearchInDesc ? ' (כולל תיאור)' : ''}`);
      if (currentCard !== 'all') parts.push(currentCard);
      if (currentCategory !== 'all') parts.push(currentCategory);
      activeFilterText.textContent = parts.join(' • ');
    }

    if (filtered.length === 0) {
      cardsView.innerHTML = '';
      tableTbody.innerHTML = '';
      noResultsEl.classList.remove('hidden');
      if (storesLoadMoreContainer) storesLoadMoreContainer.classList.add('hidden');
      return;
    }

    noResultsEl.classList.add('hidden');

    const visibleStores = filtered.slice(0, storesVisibleCount);

    if (currentView === 'grid') {
      cardsView.innerHTML = '';
      visibleStores.forEach(s => cardsView.appendChild(createStoreCardElement(s)));
      cardsView.classList.remove('hidden');
      tableView.classList.add('hidden');
    } else {
      tableTbody.innerHTML = '';
      visibleStores.forEach(s => tableTbody.appendChild(createStoreTableRow(s)));
      tableView.classList.remove('hidden');
      cardsView.classList.add('hidden');
    }

    if (storesLoadMoreContainer) {
      storesLoadMoreContainer.classList.toggle('hidden', storesVisibleCount >= filtered.length);
    }

    if (window.lucide) lucide.createIcons();
  }

  function openStoreModal(store) {
    if (!store) return;
    activeModalStore = store;

    modalTitle.textContent = store.name;
    modalCategory.textContent = store.category || 'כללי';
    modalLogo.src = store.logo || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="80">🛍️</text></svg>';
    modalLogo.onerror = () => { modalLogo.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="80">🛍️</text></svg>'; };

    if (store.website) {
      modalWebsiteLink.href = store.website;
      modalWebsiteLink.classList.remove('hidden');
    } else {
      modalWebsiteLink.classList.add('hidden');
    }

    // Linked deal banner in modal
    if (store.linkedDeals && store.linkedDeals.length > 0) {
      modalLinkedDealBanner.classList.remove('hidden');
      modalViewDealBtn.onclick = () => {
        closeStoreModal();
        dealsSearchInput.value = store.name;
        dealsSearchQuery = store.name;
        clearDealsSearchBtn.classList.remove('hidden');
        switchTab('deals');
      };
    } else {
      modalLinkedDealBanner.classList.add('hidden');
    }

    // Linked billing banner in modal
    if (store.linkedBillingStore && modalLinkedBillingBanner) {
      modalLinkedBillingBanner.classList.remove('hidden');
      if (modalLinkedBillingTitle) {
        modalLinkedBillingTitle.textContent = `לרשת זו קיימת גם הנחה של ${store.linkedBillingStore.discount}% במעמד החיוב!`;
      }
      if (modalViewBillingBtn) {
        modalViewBillingBtn.onclick = () => {
          closeStoreModal();
          billingSearchInput.value = store.name;
          billingSearchQuery = store.name;
          clearBillingSearchBtn.classList.remove('hidden');
          currentBillingCity = 'all';
          currentBillingCategory = 'all';
          if (billingCitySelect) billingCitySelect.value = 'all';
          switchTab('billing');
        };
      }
    } else if (modalLinkedBillingBanner) {
      modalLinkedBillingBanner.classList.add('hidden');
    }

    modalCardsList.innerHTML = (store.cards || []).map(c => `
      <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60">
        <div>
          <div class="font-medium text-slate-800 dark:text-slate-200 text-xs">${c.card_name}</div>
          ${c.notes ? `<div class="text-[11px] text-slate-400 mt-0.5">${c.notes}</div>` : ''}
        </div>
        <div class="font-bold text-amber-600 dark:text-amber-400 text-sm">${c.discount}</div>
      </div>
    `).join('');

    modalConditions.textContent = store.conditions || 'לא צוינו תנאים מיוחדים מעבר לתקנון הכללי של המועדון.';
    storeModal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  function closeStoreModal() {
    storeModal.classList.add('hidden');
    activeModalStore = null;
  }

  function applyViewMode(mode) {
    currentView = mode;
    localStorage.setItem('behatsdaa_view', mode);
    if (mode === 'grid') {
      viewGridBtn.className = 'p-1.5 rounded-lg text-sm font-medium transition-all bg-white dark:bg-slate-700 shadow-xs text-blue-600 dark:text-blue-400';
      viewTableBtn.className = 'p-1.5 rounded-lg text-sm font-medium transition-all text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white';
    } else {
      viewTableBtn.className = 'p-1.5 rounded-lg text-sm font-medium transition-all bg-white dark:bg-slate-700 shadow-xs text-blue-600 dark:text-blue-400';
      viewGridBtn.className = 'p-1.5 rounded-lg text-sm font-medium transition-all text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white';
    }
    renderStores();
  }

  // ==========================================
  // DEALS & VOUCHERS LOGIC & RENDERING
  // ==========================================

  function populateDealsTagsFilter() {
    dealsTagSelect.innerHTML = '<option value="all">כל המבצעים והקמפיינים</option>';
    availableTags.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      dealsTagSelect.appendChild(opt);
    });
  }

  function updateDealsCategoryChips() {
    const catCounts = {};
    allDeals.forEach(d => {
      const cat = d.category || 'כללי';
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });

    const categories = Object.keys(catCounts).sort((a, b) => catCounts[b] - catCounts[a]);

    dealsCategoryChipsContainer.innerHTML = '';

    const allChip = document.createElement('button');
    const isAll = currentDealCategory === 'all';
    allChip.className = `deal-category-chip px-3.5 py-1.5 rounded-full font-medium transition text-xs flex items-center gap-1.5 whitespace-nowrap ${
      isAll 
        ? 'bg-emerald-600 text-white shadow-xs' 
        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300'
    }`;
    allChip.dataset.category = 'all';
    allChip.innerHTML = `
      <span>הכל</span>
      <span class="deal-category-count ${isAll ? 'bg-emerald-700 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'} text-[10px] px-1.5 py-0.2 rounded-full">
        ${allDeals.length}
      </span>
    `;
    dealsCategoryChipsContainer.appendChild(allChip);

    categories.forEach(cat => {
      const isSelected = currentDealCategory === cat;
      const chip = document.createElement('button');
      chip.className = `deal-category-chip px-3.5 py-1.5 rounded-full font-medium transition text-xs flex items-center gap-1.5 whitespace-nowrap ${
        isSelected 
          ? 'bg-emerald-600 text-white shadow-xs' 
          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300'
      }`;
      chip.dataset.category = cat;
      chip.innerHTML = `
        <span>${cat}</span>
        <span class="deal-category-count ${isSelected ? 'bg-emerald-700 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'} text-[10px] px-1.5 py-0.2 rounded-full">
          ${catCounts[cat]}
        </span>
      `;
      dealsCategoryChipsContainer.appendChild(chip);
    });
  }

  function getFilteredDeals() {
    let result = allDeals;

    if (currentDealTag !== 'all') {
      result = result.filter(d => d.tags && d.tags.includes(currentDealTag));
    }

    if (currentDealCategory !== 'all') {
      result = result.filter(d => (d.category || 'כללי') === currentDealCategory);
    }

    if (currentDealMaxPrice !== 'all') {
      if (currentDealMaxPrice === 'over-500') {
        result = result.filter(d => (d.price || 0) > 500);
      } else {
        const maxVal = parseFloat(currentDealMaxPrice);
        result = result.filter(d => (d.price || 0) <= maxVal);
      }
    }

    if (dealsSearchQuery) {
      const queryNorm = normalizeHebrew(dealsSearchQuery);
      result = result.filter(d => {
        const titleNorm = d._titleNorm || normalizeHebrew(d.title);
        const suppNorm = d._suppNorm || normalizeHebrew(d.supplier || '');
        const catNorm = d._catNorm || normalizeHebrew(d.category || '');
        const tagsNorm = d._tagsNorm || normalizeHebrew((d.tags || []).join(' '));
        const baseMatch = titleNorm.includes(queryNorm) || 
                          suppNorm.includes(queryNorm) || 
                          catNorm.includes(queryNorm) || 
                          tagsNorm.includes(queryNorm);
        if (baseMatch) return true;
        if (dealsSearchInDesc) {
          const descNorm = d._descNorm || normalizeHebrew(d.description || '');
          const termsNorm = d._termsNorm || normalizeHebrew(d.terms_of_use || '');
          return descNorm.includes(queryNorm) || termsNorm.includes(queryNorm);
        }
        return false;
      });

      // Relevance sort: title / supplier matches come before description-only matches
      result.sort((a, b) => {
        const aTitle = a._titleNorm || normalizeHebrew(a.title);
        const bTitle = b._titleNorm || normalizeHebrew(b.title);
        const aSupp = a._suppNorm || normalizeHebrew(a.supplier || '');
        const bSupp = b._suppNorm || normalizeHebrew(b.supplier || '');
        const aScore = aTitle.includes(queryNorm) ? 2 : (aSupp.includes(queryNorm) ? 1 : 0);
        const bScore = bTitle.includes(queryNorm) ? 2 : (bSupp.includes(queryNorm) ? 1 : 0);
        if (aScore !== bScore) return bScore - aScore;
        return 0;
      });
    }

    switch (currentDealSort) {
      case 'discount-desc':
        result.sort((a, b) => (b.discount_percent || 0) - (a.discount_percent || 0) || (a.price || 0) - (b.price || 0));
        break;
      case 'price-asc':
        result.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price-desc':
        result.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'title-asc':
        result.sort((a, b) => a.title.localeCompare(b.title, 'he'));
        break;
    }

    return result;
  }

  function createDealCardElement(deal) {
    const card = document.createElement('div');
    card.className = 'deal-card bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-700/80 shadow-xs flex flex-col justify-between hover:border-emerald-400 dark:hover:border-emerald-500 cursor-pointer relative overflow-hidden';
    card.dataset.dealId = deal.id;

    const discountBadge = deal.discount_percent > 0 ? `
      <span class="badge-savings-emerald text-white px-2 py-0.5 rounded-lg text-xs font-bold shadow-xs">
        ${deal.discount_percent}% הנחה
      </span>
    ` : '';

    const firstTag = (deal.tags && deal.tags[0]) || '';
    const tagPill = firstTag ? `
      <span class="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
        ${firstTag}
      </span>
    ` : '';

    const origPriceHtml = (deal.original_price && deal.original_price > deal.price) ? `
      <span class="text-xs line-through text-slate-400 dark:text-slate-500">${formatILS(deal.original_price)}</span>
    ` : '';

    const matchedStore = deal.linkedStore || allStores.find(s => 
      (deal.matched_store_id && s.id === deal.matched_store_id) || 
      (deal.matched_store_name && s.name === deal.matched_store_name) || 
      normalizeHebrew(s.name) === normalizeHebrew(deal.supplier)
    );

    const storeLinkBadge = matchedStore ? `
      <div class="mt-2 pt-2 border-t border-blue-100 dark:border-blue-900/50 flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1.5 rounded-xl hover:bg-blue-100 transition-colors mb-2.5" data-action="view-linked-store" data-store-name="${encodeURIComponent(matchedStore.name)}">
        <span class="flex items-center gap-1 font-semibold truncate">
          <i data-lucide="store" class="w-3.5 h-3.5 text-blue-600 flex-shrink-0"></i>
          <span class="truncate">מכבד כרטיסים (עד ${matchedStore.max_discount}% הנחה)</span>
        </span>
        <span class="text-[11px] underline flex-shrink-0 mr-1">לרשת</span>
      </div>
    ` : '';

    const matchedBilling = deal.linkedBillingStore;
    const billingLinkBadge = matchedBilling ? `
      <div class="mt-1.5 pt-1.5 border-t border-purple-100 dark:border-purple-900/50 flex items-center justify-between text-xs text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1.5 rounded-xl hover:bg-purple-100 transition-colors mb-2.5" data-action="view-linked-billing" data-store-name="${encodeURIComponent(deal.supplier || deal.title)}">
        <span class="flex items-center gap-1 font-semibold truncate">
          <i data-lucide="credit-card" class="w-3.5 h-3.5 text-purple-600 flex-shrink-0"></i>
          <span class="truncate">הנחה במעמד החיוב (${matchedBilling.discount}% באשראי)</span>
        </span>
        <span class="text-[11px] underline flex-shrink-0 mr-1">הצג</span>
      </div>
    ` : '';

    card.innerHTML = `
      <div>
        <div class="w-full h-44 rounded-xl bg-slate-50 dark:bg-slate-900/60 p-2 mb-3 flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-700/50 relative">
          <img 
            src="${deal.image || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2280%22>🎁</text></svg>'}" 
            alt="${deal.title}" 
            class="max-h-full max-w-full object-contain transition-transform duration-300 hover:scale-105"
            loading="lazy"
            decoding="async"
            referrerpolicy="no-referrer"
            onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2280%22>🎁</text></svg>'"
          />
          <div class="absolute top-2 right-2 flex flex-col gap-1 items-end">
            ${discountBadge}
            ${tagPill}
          </div>
        </div>

        <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
          <span class="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">${deal.supplier || 'בהצדעה'}</span>
          <span class="text-[11px]">${deal.category || 'כללי'}</span>
        </div>

        <h3 class="font-bold text-sm text-slate-900 dark:text-white leading-snug mb-2 line-clamp-2" title="${deal.title}">
          ${deal.title}
        </h3>
      </div>

      <div>
        <div class="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-baseline justify-between mb-2.5">
          <div class="flex items-baseline gap-1.5">
            ${deal.is_external ? `
              <span class="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/50 px-2 py-0.5 rounded-lg">
                <i data-lucide="external-link" class="w-3 h-3"></i>
                <span>הטבת שותף</span>
              </span>
            ` : `
              <span class="text-xl font-black text-emerald-700 dark:text-emerald-400">${formatILS(deal.price)}</span>
              ${origPriceHtml}
            `}
          </div>
          ${deal.shipping_included ? `
            <span class="text-[11px] text-teal-600 dark:text-teal-400 font-medium">כולל משלוח</span>
          ` : ''}
        </div>

        ${storeLinkBadge}
        ${billingLinkBadge}

        <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700/60">
          <span class="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
            <span>לפרטים ורכישה</span>
            <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i>
          </span>
          <span class="text-[11px] text-slate-400 truncate max-w-[110px]">${deal.locations || 'לכל הארץ'}</span>
        </div>
      </div>
    `;

    return card;
  }

  function renderDeals() {
    const filtered = getFilteredDeals();
    matchingDealsCountEl.textContent = filtered.length;

    const hasFilter = dealsSearchQuery || currentDealTag !== 'all' || currentDealCategory !== 'all' || currentDealMaxPrice !== 'all' || (dealsSearchQuery && dealsSearchInDesc);
    activeDealsFilterBadge.classList.toggle('hidden', !hasFilter);

    if (hasFilter) {
      const parts = [];
      if (dealsSearchQuery) parts.push(`"${dealsSearchQuery}"${dealsSearchInDesc ? ' (כולל תיאור)' : ''}`);
      if (currentDealTag !== 'all') parts.push(currentDealTag);
      if (currentDealCategory !== 'all') parts.push(currentDealCategory);
      if (currentDealMaxPrice !== 'all') parts.push(currentDealMaxPrice === 'over-500' ? 'מעל 500 ₪' : `עד ${currentDealMaxPrice} ₪`);
      activeDealsFilterText.textContent = parts.join(' • ');
    }

    if (filtered.length === 0) {
      dealsGrid.innerHTML = '';
      noDealsResults.classList.remove('hidden');
      if (dealsLoadMoreContainer) dealsLoadMoreContainer.classList.add('hidden');
      return;
    }

    noDealsResults.classList.add('hidden');

    const visibleDeals = filtered.slice(0, dealsVisibleCount);
    dealsGrid.innerHTML = '';
    visibleDeals.forEach(d => dealsGrid.appendChild(createDealCardElement(d)));

    if (dealsLoadMoreContainer) {
      dealsLoadMoreContainer.classList.toggle('hidden', dealsVisibleCount >= filtered.length);
    }

    if (window.lucide) lucide.createIcons();
  }

  function openDealModal(deal) {
    if (!deal) return;

    dealModalTitle.textContent = deal.title;
    dealModalSupplier.textContent = deal.supplier || 'בהצדעה';
    dealModalCategory.textContent = deal.category || 'כללי';

    if (deal.tags && deal.tags.length > 0) {
      dealModalTag.textContent = deal.tags[0];
      dealModalTag.classList.remove('hidden');
    } else {
      dealModalTag.classList.add('hidden');
    }

    dealModalImg.src = deal.image || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="80">🎁</text></svg>';
    dealModalImg.onerror = () => { dealModalImg.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="80">🎁</text></svg>'; };

    if (deal.is_external) {
      dealModalPriceLabel.textContent = 'מבצע שותף בהצדעה:';
      dealModalPrice.textContent = 'הנחה באתר השותף';
      dealModalOrigPrice.textContent = '';
      dealModalSavingsBadge.classList.add('hidden');
    } else {
      dealModalPriceLabel.textContent = 'מחיר מועדון בהצדעה:';
      dealModalPrice.textContent = formatILS(deal.price);
      if (deal.original_price && deal.original_price > deal.price) {
        dealModalOrigPrice.textContent = formatILS(deal.original_price);
        dealModalSavingsBadge.classList.remove('hidden');
        dealModalSavingsText.textContent = `${deal.discount_percent}% חיסכון`;
      } else {
        dealModalOrigPrice.textContent = '';
        dealModalSavingsBadge.classList.add('hidden');
      }
    }

    // Cross-link to store on cards
    const matchedStore = deal.linkedStore || allStores.find(s => 
      (deal.matched_store_id && s.id === deal.matched_store_id) || 
      (deal.matched_store_name && s.name === deal.matched_store_name) || 
      normalizeHebrew(s.name) === normalizeHebrew(deal.supplier)
    );

    if (matchedStore) {
      dealModalLinkedStoreBanner.classList.remove('hidden');
      dealModalLinkedStoreTitle.textContent = `רשת "${matchedStore.name}" מכבדת גם כרטיסים נטענים (עד ${matchedStore.max_discount}% הנחה)!`;
      dealModalViewStoreBtn.onclick = () => {
        closeDealModal();
        searchInput.value = matchedStore.name;
        searchQuery = matchedStore.name;
        clearSearchBtn.classList.remove('hidden');
        switchTab('stores');
        setTimeout(() => openStoreModal(matchedStore), 100);
      };
    } else {
      dealModalLinkedStoreBanner.classList.add('hidden');
    }

    // Cross-link to billing discount
    if (deal.linkedBillingStore && dealModalLinkedBillingBanner) {
      dealModalLinkedBillingBanner.classList.remove('hidden');
      if (dealModalLinkedBillingTitle) {
        dealModalLinkedBillingTitle.textContent = `לספק "${deal.supplier}" קיימת גם הנחה של ${deal.linkedBillingStore.discount}% במעמד החיוב!`;
      }
      if (dealModalViewBillingBtn) {
        dealModalViewBillingBtn.onclick = () => {
          closeDealModal();
          billingSearchInput.value = deal.supplier;
          billingSearchQuery = deal.supplier;
          clearBillingSearchBtn.classList.remove('hidden');
          currentBillingCity = 'all';
          currentBillingCategory = 'all';
          if (billingCitySelect) billingCitySelect.value = 'all';
          switchTab('billing');
        };
      }
    } else if (dealModalLinkedBillingBanner) {
      dealModalLinkedBillingBanner.classList.add('hidden');
    }

    // Variants List
    if (deal.variants && deal.variants.length > 1) {
      dealModalVariantsSection.classList.remove('hidden');
      dealModalVariantsList.innerHTML = deal.variants.map(v => `
        <div class="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60">
          <span class="text-slate-800 dark:text-slate-200 font-medium">${v.name}</span>
          <div class="flex items-center gap-2">
            ${v.original_price > v.price ? `<span class="line-through text-slate-400 text-[11px]">${formatILS(v.original_price)}</span>` : ''}
            <span class="font-bold text-emerald-600 dark:text-emerald-400">${formatILS(v.price)}</span>
          </div>
        </div>
      `).join('');
    } else {
      dealModalVariantsSection.classList.add('hidden');
    }

    dealModalDescription.textContent = deal.description || 'ללא תיאור נוסף.';
    dealModalTerms.textContent = deal.terms_of_use || 'תקף בהתאם לתקנון מועדון בהצדעה.';
    dealModalLocations.textContent = deal.shipping_included ? 'כולל משלוח עד הבית' : (deal.locations || 'מגוון סניפים');
    dealModalExpiration.textContent = deal.expiration_date || 'עד גמר המלאי';

    if (deal.limits) {
      dealModalLimits.textContent = deal.limits;
      dealModalLimitsWrapper.classList.remove('hidden');
    } else {
      dealModalLimitsWrapper.classList.add('hidden');
    }

    dealModalBuyLink.href = deal.url || `https://www.behatsdaa.org.il/category/productPage/${deal.id}`;
    dealModal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  function closeDealModal() {
    dealModal.classList.add('hidden');
  }

  // ==========================================
  // BILLING DISCOUNTS (BE-PLUS) LOGIC & RENDERING
  // ==========================================

  function populateBillingCitiesFilter() {
    if (!billingCitySelect) return;
    const cityCounts = {};
    allBillingStores.forEach(s => {
      const c = s.city || 'online';
      cityCounts[c] = (cityCounts[c] || 0) + 1;
    });

    const sortedCities = Object.keys(cityCounts).sort((a, b) => {
      if (a === 'online') return -1;
      if (b === 'online') return 1;
      return cityCounts[b] - cityCounts[a] || a.localeCompare(b, 'he');
    });

    billingCitySelect.innerHTML = '<option value="all">כל הערים והמיקומים</option>';
    sortedCities.forEach(city => {
      const opt = document.createElement('option');
      opt.value = city;
      const label = city === 'online' ? 'Online / אונליין' : city;
      opt.textContent = `${label} (${cityCounts[city]})`;
      billingCitySelect.appendChild(opt);
    });
  }

  function updateBillingCategoryChips() {
    if (!billingCategoryChipsContainer) return;
    const catCounts = {};
    let filteredForChips = allBillingStores;
    if (currentBillingCity !== 'all') {
      filteredForChips = filteredForChips.filter(s => s.city === currentBillingCity);
    }

    filteredForChips.forEach(s => {
      const cat = s.category || 'כללי';
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });

    const categories = Object.keys(catCounts).sort((a, b) => catCounts[b] - catCounts[a]);

    billingCategoryChipsContainer.innerHTML = '';

    const allChip = document.createElement('button');
    const isAll = currentBillingCategory === 'all';
    allChip.className = `billing-category-chip px-3.5 py-1.5 rounded-full font-medium transition text-xs flex items-center gap-1.5 whitespace-nowrap ${
      isAll 
        ? 'bg-purple-600 text-white shadow-xs' 
        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300'
    }`;
    allChip.dataset.category = 'all';
    allChip.innerHTML = `
      <span>הכל</span>
      <span class="billing-category-count ${isAll ? 'bg-purple-700 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'} text-[10px] px-1.5 py-0.2 rounded-full">
        ${filteredForChips.length}
      </span>
    `;
    billingCategoryChipsContainer.appendChild(allChip);

    categories.forEach(cat => {
      const isSelected = currentBillingCategory === cat;
      const chip = document.createElement('button');
      chip.className = `billing-category-chip px-3.5 py-1.5 rounded-full font-medium transition text-xs flex items-center gap-1.5 whitespace-nowrap ${
        isSelected 
          ? 'bg-purple-600 text-white shadow-xs' 
          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300'
      }`;
      chip.dataset.category = cat;
      chip.innerHTML = `
        <span>${cat}</span>
        <span class="billing-category-count ${isSelected ? 'bg-purple-700 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'} text-[10px] px-1.5 py-0.2 rounded-full">
          ${catCounts[cat]}
        </span>
      `;
      billingCategoryChipsContainer.appendChild(chip);
    });
  }

  function getFilteredBillingStores() {
    let result = allBillingStores.slice();

    if (currentBillingCity !== 'all') {
      result = result.filter(s => s.city === currentBillingCity);
    }

    if (currentBillingCategory !== 'all') {
      result = result.filter(s => (s.category || 'כללי') === currentBillingCategory);
    }

    if (billingSearchQuery) {
      const queryNorm = normalizeHebrew(billingSearchQuery);
      result = result.filter(s => {
        const baseMatch = s._searchStr && s._searchStr.includes(queryNorm);
        if (baseMatch) return true;
        if (billingSearchInDesc) {
          return Boolean(s._descNorm && s._descNorm.includes(queryNorm));
        }
        return false;
      });

      // Prioritize store name matches (exact > startsWith > includes) over category/city/address/description
      result.sort((a, b) => {
        const aName = a._nameNorm || '';
        const bName = b._nameNorm || '';
        const aScore = aName === queryNorm ? 3 : (aName.startsWith(queryNorm) ? 2 : (aName.includes(queryNorm) ? 1 : 0));
        const bScore = bName === queryNorm ? 3 : (bName.startsWith(queryNorm) ? 2 : (bName.includes(queryNorm) ? 1 : 0));
        if (aScore !== bScore) return bScore - aScore;

        if (currentBillingSort === 'discount-desc') return b.discount - a.discount || a.name.localeCompare(b.name, 'he');
        if (currentBillingSort === 'discount-asc') return a.discount - b.discount || a.name.localeCompare(b.name, 'he');
        if (currentBillingSort === 'name-asc') return a.name.localeCompare(b.name, 'he');
        if (currentBillingSort === 'city-asc') return (a.city || '').localeCompare(b.city || '', 'he') || a.name.localeCompare(b.name, 'he');
        return b.discount - a.discount || a.name.localeCompare(b.name, 'he');
      });

      return result;
    }

    switch (currentBillingSort) {
      case 'discount-desc':
        result.sort((a, b) => b.discount - a.discount || a.name.localeCompare(b.name, 'he'));
        break;
      case 'discount-asc':
        result.sort((a, b) => a.discount - b.discount || a.name.localeCompare(b.name, 'he'));
        break;
      case 'name-asc':
        result.sort((a, b) => a.name.localeCompare(b.name, 'he'));
        break;
      case 'city-asc':
        result.sort((a, b) => (a.city || '').localeCompare(b.city || '', 'he') || a.name.localeCompare(b.name, 'he'));
        break;
    }

    return result;
  }

  function getBillingCategoryIcon(category) {
    if (!category) return 'credit-card';
    if (/מסעדות|בתי קפה|מאפה|מזון|סושי|פיצה|גלידה/i.test(category)) return 'utensils';
    if (/אופנה|הלבשה|הנעלה|בגדי/i.test(category)) return 'shirt';
    if (/רכב|מוסכים|דלק|תחבורה/i.test(category)) return 'car';
    if (/ספורט|כושר|מחנאות/i.test(category)) return 'dumbbell';
    if (/מחשבים|סלולר|אלקטרוניקה|צילום/i.test(category)) return 'smartphone';
    if (/בית|גן|ריהוט|כלי בית/i.test(category)) return 'home';
    if (/טיפוח|קוסמטיקה|יופי|שיער|ספא/i.test(category)) return 'sparkles';
    if (/בריאות|רפואה|רופאי|שיניים|פארם/i.test(category)) return 'heart-pulse';
    if (/תיירות|נופש|אטרקציות|מלונות|טיסות/i.test(category)) return 'palmtree';
    if (/אופטיקה|משקפיים/i.test(category)) return 'glasses';
    if (/ספרים|לימודים|חוגים/i.test(category)) return 'book-open';
    return 'credit-card';
  }

  function createBillingCardElement(store) {
    const card = document.createElement('div');
    card.className = 'billing-card bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-700/80 shadow-xs flex flex-col justify-between hover:border-purple-400 dark:hover:border-purple-500 cursor-pointer relative';
    card.dataset.billingId = store.id;

    const discountBadge = `
      <span class="badge-savings-purple text-white px-2.5 py-1 rounded-xl text-xs font-black shadow-xs">
        ${store.discount}% הנחה
      </span>
    `;

    const cityLabel = store.city === 'online' ? 'Online / אונליין' : store.city;

    // Cross-link badges if exists in Tab 1 (stores) or Tab 2 (deals)
    const linkedStore = store.linkedStore;
    let storeLinkBadge = '';
    if (linkedStore) {
      const topCards = (linkedStore.cards || []).slice(0, 2).map(c => `
        <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 text-[10px] font-medium">
          <span>${c.card_name}:</span>
          <span class="font-bold">${c.discount}</span>
        </span>
      `).join('');
      const extraCards = (linkedStore.cards || []).length > 2 ? `+${linkedStore.cards.length - 2}` : '';

      storeLinkBadge = `
        <div class="mt-2 pt-2 border-t border-blue-100 dark:border-blue-900/50 flex flex-col gap-1 text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 p-2 rounded-xl hover:bg-blue-100/80 transition-colors" data-action="view-linked-store" data-store-name="${encodeURIComponent(linkedStore.name)}">
          <div class="flex items-center justify-between">
            <span class="flex items-center gap-1 font-semibold truncate">
              <i data-lucide="store" class="w-3.5 h-3.5 text-blue-600 flex-shrink-0"></i>
              <span class="truncate">מכבד כרטיסים (עד ${linkedStore.max_discount}% הנחה)</span>
            </span>
            <span class="text-[11px] underline flex-shrink-0 mr-1 font-bold">לרשת</span>
          </div>
          <div class="flex flex-wrap items-center gap-1 mt-0.5">
            ${topCards}
            ${extraCards ? `<span class="text-[10px] text-blue-600 dark:text-blue-400 font-medium">${extraCards} עוד</span>` : ''}
          </div>
        </div>
      `;
    }

    const hasLinkedDeals = store.linkedDeals && store.linkedDeals.length > 0;
    let dealsBadgeHtml = '';
    if (hasLinkedDeals) {
      const topDeal = store.linkedDeals[0];
      const dealTitle = topDeal.title ? (topDeal.title.length > 30 ? topDeal.title.slice(0, 30) + '...' : topDeal.title) : '';
      const dealPriceText = topDeal.price ? formatILS(topDeal.price) : '';
      const dealSearchQuery = topDeal.supplier || store.name;
      dealsBadgeHtml = `
        <div class="mt-1.5 pt-1.5 border-t border-emerald-100 dark:border-emerald-900/50 flex flex-col gap-1 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-xl hover:bg-emerald-100/80 transition-colors" data-action="view-linked-deal" data-store-name="${encodeURIComponent(dealSearchQuery)}">
          <div class="flex items-center justify-between">
            <span class="flex items-center gap-1 font-semibold truncate">
              <i data-lucide="tag" class="w-3.5 h-3.5 text-emerald-600 flex-shrink-0"></i>
              <span class="truncate">שובר/מבצע פעיל (${store.linkedDeals.length})</span>
            </span>
            <span class="text-[11px] underline flex-shrink-0 mr-1 font-bold">${dealPriceText || 'הצג'}</span>
          </div>
          ${dealTitle ? `<div class="text-[11px] text-emerald-800 dark:text-emerald-200 truncate">${dealTitle}</div>` : ''}
        </div>
      `;
    }

    const catIcon = getBillingCategoryIcon(store.category);
    const logoHtml = store.logo ? `
      <img 
        src="${store.logo}" 
        alt="${store.name}" 
        class="max-h-full max-w-full object-contain" 
        loading="lazy" 
        decoding="async" 
        referrerpolicy="no-referrer"
        onerror="if(this.src.includes('/icons/')){this.src=this.src.replace('/icons/','/images/');}else{this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2280%22>💳</text></svg>';}"
      />
    ` : `<i data-lucide="${catIcon}" class="w-6 h-6 text-purple-400"></i>`;

    card.innerHTML = `
      <div>
        <div class="flex items-start justify-between gap-3 mb-3">
          <div class="w-12 h-12 rounded-xl bg-purple-50 dark:bg-slate-700 p-1.5 border border-purple-100 dark:border-slate-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
            ${logoHtml}
          </div>
          <div class="flex flex-col items-end gap-1">
            ${discountBadge}
            <span class="text-[11px] text-slate-500 dark:text-slate-400 font-medium">${store.category || 'כללי'}</span>
          </div>
        </div>

        <h3 class="font-bold text-base text-slate-900 dark:text-white leading-tight mb-1 truncate" title="${store.name}">
          ${store.name}
        </h3>

        <div class="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mb-2 truncate">
          <i data-lucide="map-pin" class="w-3.5 h-3.5 text-slate-400 flex-shrink-0"></i>
          <span class="truncate font-medium">${cityLabel}</span>
          ${store.address ? `<span class="truncate text-slate-400 dark:text-slate-500">• ${store.address}</span>` : ''}
        </div>

        ${store.description ? `
          <p class="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/50 mb-2">
            ${store.description}
          </p>
        ` : ''}
      </div>

      <div>
        ${storeLinkBadge}
        ${dealsBadgeHtml}
        <div class="mt-2.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700/60">
          <span class="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-medium">
            <span>לפרטים מלאים</span>
            <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i>
          </span>
          <span class="text-[11px] text-slate-400">מעמד החיוב (Max)</span>
        </div>
      </div>
    `;

    return card;
  }

  function renderBillingStores() {
    if (!billingGrid) return;
    const filtered = getFilteredBillingStores();
    if (matchingBillingCountEl) matchingBillingCountEl.textContent = filtered.length.toLocaleString('he-IL');

    const hasFilter = billingSearchQuery || currentBillingCity !== 'all' || currentBillingCategory !== 'all' || (billingSearchQuery && billingSearchInDesc);
    if (activeBillingFilterBadge) activeBillingFilterBadge.classList.toggle('hidden', !hasFilter);

    if (hasFilter && activeBillingFilterText) {
      const parts = [];
      if (billingSearchQuery) parts.push(`"${billingSearchQuery}"${billingSearchInDesc ? ' (כולל תיאור)' : ''}`);
      if (currentBillingCity !== 'all') parts.push(currentBillingCity === 'online' ? 'Online' : currentBillingCity);
      if (currentBillingCategory !== 'all') parts.push(currentBillingCategory);
      activeBillingFilterText.textContent = parts.join(' • ');
    }

    if (filtered.length === 0) {
      billingGrid.innerHTML = '';
      if (noBillingResults) noBillingResults.classList.remove('hidden');
      if (billingLoadMoreContainer) billingLoadMoreContainer.classList.add('hidden');
      return;
    }

    if (noBillingResults) noBillingResults.classList.add('hidden');

    const visibleStores = filtered.slice(0, billingVisibleCount);
    billingGrid.innerHTML = '';
    visibleStores.forEach(s => billingGrid.appendChild(createBillingCardElement(s)));

    if (billingLoadMoreContainer) {
      billingLoadMoreContainer.classList.toggle('hidden', billingVisibleCount >= filtered.length);
    }

    if (window.lucide) lucide.createIcons();
  }

  function openBillingModal(store) {
    if (!store || !billingModal) return;
    activeModalBillingStore = store;

    billingModalTitle.textContent = store.name;
    billingModalCategory.textContent = store.category || 'כללי';
    billingModalCityBadge.textContent = store.city === 'online' ? 'Online / אונליין' : (store.city || 'סניפים');
    
    if (store.address) {
      billingModalAddressWrapper.classList.remove('hidden');
      billingModalAddress.textContent = store.address;
    } else {
      billingModalAddressWrapper.classList.add('hidden');
    }

    billingModalDiscount.textContent = `${store.discount}%`;
    billingModalDescription.textContent = store.description || 'בית עסק המעניק הנחה קבועה במעמד החיוב למחזיקי כרטיס אשראי מועדון בהצדעה (Max).';
    const rawUrl = store.detail_url || `https://be-plus.co.il/product/${store.id}`;
    billingModalOfficialLink.href = rawUrl.replace('/component/crm/product/', '/product/');

    billingModalLogo.referrerPolicy = 'no-referrer';
    if (store.logo) {
      billingModalLogo.src = store.logo;
      billingModalLogo.onerror = () => {
        if (billingModalLogo.src.includes('/icons/')) {
          billingModalLogo.src = billingModalLogo.src.replace('/icons/', '/images/');
        } else {
          billingModalLogo.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="80">💳</text></svg>';
        }
      };
    } else {
      billingModalLogo.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="80">💳</text></svg>';
    }

    // Cross-links in Billing Modal
    if (store.linkedStore) {
      billingModalLinkedStoreBanner.classList.remove('hidden');
      billingModalLinkedStoreTitle.textContent = `רשת "${store.linkedStore.name}" מכבדת גם כרטיסים נטענים!`;
      if (billingModalLinkedStoreMaxDisc) {
        billingModalLinkedStoreMaxDisc.textContent = `עד ${store.linkedStore.max_discount}% הנחה`;
      }
      if (billingModalCardsList) {
        billingModalCardsList.innerHTML = (store.linkedStore.cards || []).map(c => `
          <div class="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-900/60 shadow-xs">
            <span class="font-medium text-slate-800 dark:text-slate-200">${c.card_name}${c.notes ? ` <span class="text-[11px] text-slate-400 font-normal">(${c.notes})</span>` : ''}</span>
            <span class="font-bold text-blue-700 dark:text-blue-300 text-sm">${c.discount}</span>
          </div>
        `).join('');
      }
      billingModalViewStoreBtn.onclick = () => {
        closeBillingModal();
        searchInput.value = store.linkedStore.name;
        searchQuery = store.linkedStore.name;
        clearSearchBtn.classList.remove('hidden');
        switchTab('stores');
        setTimeout(() => openStoreModal(store.linkedStore), 100);
      };
    } else {
      billingModalLinkedStoreBanner.classList.add('hidden');
    }

    if (store.linkedDeals && store.linkedDeals.length > 0) {
      billingModalLinkedDealBanner.classList.remove('hidden');
      billingModalLinkedDealTitle.textContent = `לרשת זו קיים שובר/מבצע ייעודי פעיל (${store.linkedDeals.length})!`;
      if (billingModalDealsList) {
        const topDeals = store.linkedDeals.slice(0, 3);
        const moreDealsCount = store.linkedDeals.length > 3 ? store.linkedDeals.length - 3 : 0;
        billingModalDealsList.innerHTML = topDeals.map(d => `
          <div class="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800 border border-emerald-100 dark:border-emerald-900/60 shadow-xs text-xs">
            <span class="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px]" title="${d.title}">${d.title}</span>
            <div class="flex items-center gap-1.5 flex-shrink-0 mr-1">
              ${d.discount_percent > 0 ? `<span class="badge-savings-emerald text-white px-1.5 py-0.5 rounded text-[10px] font-bold">${d.discount_percent}% הנחה</span>` : ''}
              <span class="font-bold text-emerald-700 dark:text-emerald-300">${formatILS(d.price)}</span>
            </div>
          </div>
        `).join('') + (moreDealsCount > 0 ? `
          <div class="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium text-left mt-0.5">+ עוד ${moreDealsCount} שוברים ומבצעים באתר בהצדעה</div>
        ` : '');
      }
      const dealQuery = (store.linkedDeals[0] && store.linkedDeals[0].supplier) || store.name;
      billingModalViewDealBtn.onclick = () => {
        closeBillingModal();
        dealsSearchInput.value = dealQuery;
        dealsSearchQuery = dealQuery;
        clearDealsSearchBtn.classList.remove('hidden');
        switchTab('deals');
      };
    } else {
      billingModalLinkedDealBanner.classList.add('hidden');
    }

    billingModal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  function closeBillingModal() {
    if (billingModal) billingModal.classList.add('hidden');
    activeModalBillingStore = null;
  }

  // ==========================================
  // EVENT LISTENERS
  // ==========================================

  // Tab Switching
  tabStoresBtn.addEventListener('click', () => switchTab('stores'));
  tabDealsBtn.addEventListener('click', () => switchTab('deals'));
  if (tabBillingBtn) tabBillingBtn.addEventListener('click', () => switchTab('billing'));

  window.addEventListener('hashchange', () => {
    const hash = window.location.hash;
    if (hash === '#deals') switchTab('deals');
    else if (hash === '#billing') switchTab('billing');
    else switchTab('stores');
  });

  // Stores Search & Filter Listeners
  const debouncedRenderStores = debounce(() => {
    storesVisibleCount = STORES_PAGE_SIZE;
    renderStores();
  }, 120);

  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    clearSearchBtn.classList.toggle('hidden', !searchQuery);
    debouncedRenderStores();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.classList.add('hidden');
    storesVisibleCount = STORES_PAGE_SIZE;
    renderStores();
  });

  if (storesSearchDescToggle) {
    storesSearchDescToggle.addEventListener('change', (e) => {
      storesSearchInDesc = e.target.checked;
      storesVisibleCount = STORES_PAGE_SIZE;
      renderStores();
    });
  }

  cardFilterSelect.addEventListener('change', (e) => {
    currentCard = e.target.value;
    storesVisibleCount = STORES_PAGE_SIZE;
    updateCategoryChips();
    renderStores();
  });

  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    storesVisibleCount = STORES_PAGE_SIZE;
    renderStores();
  });

  categoryChipsContainer.addEventListener('click', (e) => {
    const chip = e.target.closest('.category-chip');
    if (!chip) return;
    currentCategory = chip.dataset.category;
    storesVisibleCount = STORES_PAGE_SIZE;
    updateCategoryChips();
    renderStores();
  });

  resetFiltersBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    currentCard = 'all';
    cardFilterSelect.value = 'all';
    currentCategory = 'all';
    if (storesSearchDescToggle) storesSearchDescToggle.checked = false;
    storesSearchInDesc = false;
    clearSearchBtn.classList.add('hidden');
    storesVisibleCount = STORES_PAGE_SIZE;
    updateCategoryChips();
    renderStores();
  });

  clearFiltersBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    currentCard = 'all';
    cardFilterSelect.value = 'all';
    currentCategory = 'all';
    if (storesSearchDescToggle) storesSearchDescToggle.checked = false;
    storesSearchInDesc = false;
    clearSearchBtn.classList.add('hidden');
    storesVisibleCount = STORES_PAGE_SIZE;
    updateCategoryChips();
    renderStores();
  });

  viewGridBtn.addEventListener('click', () => applyViewMode('grid'));
  viewTableBtn.addEventListener('click', () => applyViewMode('table'));
  themeToggleBtn.addEventListener('click', toggleTheme);

  // Store Modal Listeners
  modalCloseBtn.addEventListener('click', closeStoreModal);
  modalDismissBtn.addEventListener('click', closeStoreModal);
  storeModal.addEventListener('click', (e) => {
    if (e.target === storeModal) closeStoreModal();
  });

  // Deals Search & Filter Listeners
  const debouncedRenderDeals = debounce(() => {
    dealsVisibleCount = DEALS_PAGE_SIZE;
    renderDeals();
  }, 120);

  dealsSearchInput.addEventListener('input', (e) => {
    dealsSearchQuery = e.target.value.trim();
    clearDealsSearchBtn.classList.toggle('hidden', !dealsSearchQuery);
    debouncedRenderDeals();
  });

  clearDealsSearchBtn.addEventListener('click', () => {
    dealsSearchInput.value = '';
    dealsSearchQuery = '';
    clearDealsSearchBtn.classList.add('hidden');
    dealsVisibleCount = DEALS_PAGE_SIZE;
    renderDeals();
  });

  if (dealsSearchDescToggle) {
    dealsSearchDescToggle.addEventListener('change', (e) => {
      dealsSearchInDesc = e.target.checked;
      dealsVisibleCount = DEALS_PAGE_SIZE;
      renderDeals();
    });
  }

  dealsTagSelect.addEventListener('change', (e) => {
    currentDealTag = e.target.value;
    dealsVisibleCount = DEALS_PAGE_SIZE;
    renderDeals();
  });

  dealsPriceFilterSelect.addEventListener('change', (e) => {
    currentDealMaxPrice = e.target.value;
    dealsVisibleCount = DEALS_PAGE_SIZE;
    renderDeals();
  });

  dealsSortSelect.addEventListener('change', (e) => {
    currentDealSort = e.target.value;
    dealsVisibleCount = DEALS_PAGE_SIZE;
    renderDeals();
  });

  dealsCategoryChipsContainer.addEventListener('click', (e) => {
    const chip = e.target.closest('.deal-category-chip');
    if (!chip) return;
    currentDealCategory = chip.dataset.category;
    dealsVisibleCount = DEALS_PAGE_SIZE;
    updateDealsCategoryChips();
    renderDeals();
  });

  resetDealsFiltersBtn.addEventListener('click', () => {
    dealsSearchInput.value = '';
    dealsSearchQuery = '';
    currentDealTag = 'all';
    dealsTagSelect.value = 'all';
    currentDealCategory = 'all';
    currentDealMaxPrice = 'all';
    dealsPriceFilterSelect.value = 'all';
    if (dealsSearchDescToggle) dealsSearchDescToggle.checked = false;
    dealsSearchInDesc = false;
    clearDealsSearchBtn.classList.add('hidden');
    dealsVisibleCount = DEALS_PAGE_SIZE;
    updateDealsCategoryChips();
    renderDeals();
  });

  clearDealsFiltersBtn.addEventListener('click', () => {
    dealsSearchInput.value = '';
    dealsSearchQuery = '';
    currentDealTag = 'all';
    dealsTagSelect.value = 'all';
    currentDealCategory = 'all';
    currentDealMaxPrice = 'all';
    dealsPriceFilterSelect.value = 'all';
    if (dealsSearchDescToggle) dealsSearchDescToggle.checked = false;
    dealsSearchInDesc = false;
    clearDealsSearchBtn.classList.add('hidden');
    dealsVisibleCount = DEALS_PAGE_SIZE;
    updateDealsCategoryChips();
    renderDeals();
  });

  // Deal Modal Listeners
  dealModalCloseBtn.addEventListener('click', closeDealModal);
  dealModalDismissBtn.addEventListener('click', closeDealModal);
  dealModal.addEventListener('click', (e) => {
    if (e.target === dealModal) closeDealModal();
  });

  // Billing Search & Filter Listeners
  const debouncedRenderBilling = debounce(() => {
    billingVisibleCount = BILLING_PAGE_SIZE;
    renderBillingStores();
  }, 120);

  if (billingSearchInput) {
    billingSearchInput.addEventListener('input', (e) => {
      billingSearchQuery = e.target.value.trim();
      if (clearBillingSearchBtn) clearBillingSearchBtn.classList.toggle('hidden', !billingSearchQuery);
      debouncedRenderBilling();
    });
  }

    if (clearBillingSearchBtn) {
    clearBillingSearchBtn.addEventListener('click', () => {
      billingSearchInput.value = '';
      billingSearchQuery = '';
      clearBillingSearchBtn.classList.add('hidden');
      billingVisibleCount = BILLING_PAGE_SIZE;
      renderBillingStores();
    });
  }

  if (billingSearchDescToggle) {
    billingSearchDescToggle.addEventListener('change', (e) => {
      billingSearchInDesc = e.target.checked;
      billingVisibleCount = BILLING_PAGE_SIZE;
      renderBillingStores();
    });
  }

  if (billingCitySelect) {
    billingCitySelect.addEventListener('change', (e) => {
      currentBillingCity = e.target.value;
      billingVisibleCount = BILLING_PAGE_SIZE;
      updateBillingCategoryChips();
      renderBillingStores();
    });
  }

  if (billingSortSelect) {
    billingSortSelect.addEventListener('change', (e) => {
      currentBillingSort = e.target.value;
      billingVisibleCount = BILLING_PAGE_SIZE;
      renderBillingStores();
    });
  }

  if (billingCategoryChipsContainer) {
    billingCategoryChipsContainer.addEventListener('click', (e) => {
      const chip = e.target.closest('.billing-category-chip');
      if (!chip) return;
      currentBillingCategory = chip.dataset.category;
      billingVisibleCount = BILLING_PAGE_SIZE;
      updateBillingCategoryChips();
      renderBillingStores();
    });
  }

  if (resetBillingFiltersBtn) {
    resetBillingFiltersBtn.addEventListener('click', () => {
      billingSearchInput.value = '';
      billingSearchQuery = '';
      currentBillingCity = 'all';
      if (billingCitySelect) billingCitySelect.value = 'all';
      currentBillingCategory = 'all';
      if (billingSearchDescToggle) billingSearchDescToggle.checked = false;
      billingSearchInDesc = false;
      if (clearBillingSearchBtn) clearBillingSearchBtn.classList.add('hidden');
      billingVisibleCount = BILLING_PAGE_SIZE;
      updateBillingCategoryChips();
      renderBillingStores();
    });
  }

  if (clearBillingFiltersBtn) {
    clearBillingFiltersBtn.addEventListener('click', () => {
      billingSearchInput.value = '';
      billingSearchQuery = '';
      currentBillingCity = 'all';
      if (billingCitySelect) billingCitySelect.value = 'all';
      currentBillingCategory = 'all';
      if (billingSearchDescToggle) billingSearchDescToggle.checked = false;
      billingSearchInDesc = false;
      if (clearBillingSearchBtn) clearBillingSearchBtn.classList.add('hidden');
      billingVisibleCount = BILLING_PAGE_SIZE;
      updateBillingCategoryChips();
      renderBillingStores();
    });
  }

  // Billing Modal Listeners
  if (billingModalCloseBtn) billingModalCloseBtn.addEventListener('click', closeBillingModal);
  if (billingModalDismissBtn) billingModalDismissBtn.addEventListener('click', closeBillingModal);
  if (billingModal) {
    billingModal.addEventListener('click', (e) => {
      if (e.target === billingModal) closeBillingModal();
    });
  }

  // Progressive Rendering - Load More Buttons
  if (storesLoadMoreBtn) {
    storesLoadMoreBtn.addEventListener('click', () => {
      storesVisibleCount += STORES_PAGE_SIZE;
      renderStores();
    });
  }

  if (dealsLoadMoreBtn) {
    dealsLoadMoreBtn.addEventListener('click', () => {
      dealsVisibleCount += DEALS_PAGE_SIZE;
      renderDeals();
    });
  }

  if (billingLoadMoreBtn) {
    billingLoadMoreBtn.addEventListener('click', () => {
      billingVisibleCount += BILLING_PAGE_SIZE;
      renderBillingStores();
    });
  }

  // Global Event Delegation for Cards & Cross-Linking Badges
  document.addEventListener('click', (e) => {
    // 1. Cross-link to Deal
    const dealBadge = e.target.closest('[data-action="view-linked-deal"]');
    if (dealBadge) {
      e.stopPropagation();
      const storeName = decodeURIComponent(dealBadge.dataset.storeName || '');
      if (storeName) {
        dealsSearchInput.value = storeName;
        dealsSearchQuery = storeName;
        clearDealsSearchBtn.classList.remove('hidden');
        currentDealTag = 'all';
        dealsTagSelect.value = 'all';
        currentDealCategory = 'all';
        currentDealMaxPrice = 'all';
        dealsPriceFilterSelect.value = 'all';
        updateDealsCategoryChips();
        switchTab('deals');
      }
      return;
    }

    // 2. Cross-link to Store Cards
    const storeBadge = e.target.closest('[data-action="view-linked-store"]');
    if (storeBadge) {
      e.stopPropagation();
      const storeName = decodeURIComponent(storeBadge.dataset.storeName || '');
      if (storeName) {
        searchInput.value = storeName;
        searchQuery = storeName;
        clearSearchBtn.classList.remove('hidden');
        currentCard = 'all';
        cardFilterSelect.value = 'all';
        currentCategory = 'all';
        updateCategoryChips();
        switchTab('stores');
      }
      return;
    }

    // 3. Cross-link to Billing Discounts
    const billingBadge = e.target.closest('[data-action="view-linked-billing"]');
    if (billingBadge) {
      e.stopPropagation();
      const storeName = decodeURIComponent(billingBadge.dataset.storeName || '');
      if (storeName) {
        if (billingSearchInput) {
          billingSearchInput.value = storeName;
          billingSearchQuery = storeName;
          if (clearBillingSearchBtn) clearBillingSearchBtn.classList.remove('hidden');
        }
        currentBillingCity = 'all';
        if (billingCitySelect) billingCitySelect.value = 'all';
        currentBillingCategory = 'all';
        if (billingCategoryChipsContainer) updateBillingCategoryChips();
        switchTab('billing');
      }
      return;
    }

    // 4. Click on Store Card -> Open Store Modal
    const storeCard = e.target.closest('.store-card, #table-tbody tr');
    if (storeCard) {
      const storeId = storeCard.dataset.storeId;
      const store = allStores.find(s => s.id === storeId);
      if (store) openStoreModal(store);
      return;
    }

    // 5. Click on Deal Card -> Open Deal Modal
    const dealCard = e.target.closest('.deal-card');
    if (dealCard) {
      const dealId = dealCard.dataset.dealId;
      const deal = allDeals.find(d => String(d.id) === String(dealId));
      if (deal) openDealModal(deal);
      return;
    }

    // 6. Click on Billing Card -> Open Billing Modal
    const billingCard = e.target.closest('.billing-card');
    if (billingCard) {
      const billingId = billingCard.dataset.billingId;
      const billingStore = allBillingStores.find(b => String(b.id) === String(billingId));
      if (billingStore) openBillingModal(billingStore);
      return;
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeStoreModal();
      closeDealModal();
      closeBillingModal();
    }
  });

  // Initialize
  initTheme();
  loadAllData();

})();
