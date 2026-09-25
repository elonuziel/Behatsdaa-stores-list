/**
 * Behatsdaa Multi-Card Participating Stores, Deals & Billing Discounts Web Application
 * ES Module Entry Point
 */

import { state } from './js/state.js';
import { debounce, initTheme, toggleTheme } from './js/utils.js';
import { loadStores, loadDeals, loadBilling, crossLinkAllDatasets } from './js/data.js';
import { populateCardsFilter, updateCategoryChips, getFilteredStores, createStoreCardElement, createStoreTableRow, openStoreModal, closeStoreModal } from './js/stores.js';
import { populateDealsTagsFilter, updateDealsCategoryChips, getFilteredDeals, createDealCardElement, openDealModal, closeDealModal } from './js/deals.js';
import { populateBillingCitiesFilter, updateBillingCategoryChips, getFilteredBillingStores, createBillingCardElement, openBillingModal, closeBillingModal } from './js/billing.js';

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
const storeModalElements = {
  storeModal: document.getElementById('store-modal'),
  modalCloseBtn: document.getElementById('modal-close-btn'),
  modalDismissBtn: document.getElementById('modal-dismiss-btn'),
  modalLogo: document.getElementById('modal-logo'),
  modalCategory: document.getElementById('modal-category'),
  modalTitle: document.getElementById('modal-title'),
  modalWebsiteLink: document.getElementById('modal-website-link'),
  modalCardsList: document.getElementById('modal-cards-list'),
  modalConditions: document.getElementById('modal-conditions'),
  modalLinkedDealBanner: document.getElementById('modal-linked-deal-banner'),
  modalViewDealBtn: document.getElementById('modal-view-deal-btn'),
  modalLinkedBillingBanner: document.getElementById('modal-linked-billing-banner'),
  modalLinkedBillingTitle: document.getElementById('modal-linked-billing-title'),
  modalViewBillingBtn: document.getElementById('modal-view-billing-btn'),
};

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
const dealModalElements = {
  dealModal: document.getElementById('deal-modal'),
  dealModalCloseBtn: document.getElementById('deal-modal-close-btn'),
  dealModalDismissBtn: document.getElementById('deal-modal-dismiss-btn'),
  dealModalImg: document.getElementById('deal-modal-img'),
  dealModalCategory: document.getElementById('deal-modal-category'),
  dealModalTag: document.getElementById('deal-modal-tag'),
  dealModalTitle: document.getElementById('deal-modal-title'),
  dealModalSupplier: document.getElementById('deal-modal-supplier'),
  dealModalPrice: document.getElementById('deal-modal-price'),
  dealModalPriceLabel: document.getElementById('deal-modal-price-label'),
  dealModalOrigPrice: document.getElementById('deal-modal-orig-price'),
  dealModalSavingsBadge: document.getElementById('deal-modal-savings-badge'),
  dealModalSavingsText: document.getElementById('deal-modal-savings-text'),
  dealModalVariantsSection: document.getElementById('deal-modal-variants-section'),
  dealModalVariantsList: document.getElementById('deal-modal-variants-list'),
  dealModalDescription: document.getElementById('deal-modal-description'),
  dealModalTerms: document.getElementById('deal-modal-terms'),
  dealModalLocations: document.getElementById('deal-modal-locations'),
  dealModalExpiration: document.getElementById('deal-modal-expiration'),
  dealModalLimits: document.getElementById('deal-modal-limits'),
  dealModalLimitsWrapper: document.getElementById('deal-modal-limits-wrapper'),
  dealModalBuyLink: document.getElementById('deal-modal-buy-link'),
  dealModalLinkedStoreBanner: document.getElementById('deal-modal-linked-store-banner'),
  dealModalLinkedStoreTitle: document.getElementById('deal-modal-linked-store-title'),
  dealModalViewStoreBtn: document.getElementById('deal-modal-view-store-btn'),
  dealModalLinkedBillingBanner: document.getElementById('deal-modal-linked-billing-banner'),
  dealModalLinkedBillingTitle: document.getElementById('deal-modal-linked-billing-title'),
  dealModalViewBillingBtn: document.getElementById('deal-modal-view-billing-btn'),
};

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
const billingModalElements = {
  billingModal: document.getElementById('billing-modal'),
  billingModalCloseBtn: document.getElementById('billing-modal-close-btn'),
  billingModalDismissBtn: document.getElementById('billing-modal-dismiss-btn'),
  billingModalLogo: document.getElementById('billing-modal-logo'),
  billingModalCategory: document.getElementById('billing-modal-category'),
  billingModalCityBadge: document.getElementById('billing-modal-city-badge'),
  billingModalTitle: document.getElementById('billing-modal-title'),
  billingModalAddress: document.getElementById('billing-modal-address'),
  billingModalAddressWrapper: document.getElementById('billing-modal-address-wrapper'),
  billingModalDiscount: document.getElementById('billing-modal-discount'),
  billingModalLinkedStoreBanner: document.getElementById('billing-modal-linked-store-banner'),
  billingModalLinkedStoreTitle: document.getElementById('billing-modal-linked-store-title'),
  billingModalLinkedStoreMaxDisc: document.getElementById('billing-modal-linked-store-max-disc'),
  billingModalCardsList: document.getElementById('billing-modal-cards-list'),
  billingModalViewStoreBtn: document.getElementById('billing-modal-view-store-btn'),
  billingModalLinkedDealBanner: document.getElementById('billing-modal-linked-deal-banner'),
  billingModalLinkedDealTitle: document.getElementById('billing-modal-linked-deal-title'),
  billingModalDealsList: document.getElementById('billing-modal-deals-list'),
  billingModalViewDealBtn: document.getElementById('billing-modal-view-deal-btn'),
  billingModalDescription: document.getElementById('billing-modal-description'),
  billingModalOfficialLink: document.getElementById('billing-modal-official-link'),
};

// Rendering Functions
function renderStores() {
  const filtered = getFilteredStores();
  matchingCountEl.textContent = filtered.length;

  const hasFilter = state.searchQuery || state.currentCard !== 'all' || state.currentCategory !== 'all' || (state.searchQuery && state.storesSearchInDesc);
  activeFilterBadge.classList.toggle('hidden', !hasFilter);

  if (hasFilter) {
    const parts = [];
    if (state.searchQuery) parts.push(`"${state.searchQuery}"${state.storesSearchInDesc ? ' (כולל תיאור)' : ''}`);
    if (state.currentCard !== 'all') parts.push(state.currentCard);
    if (state.currentCategory !== 'all') parts.push(state.currentCategory);
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

  const visibleStores = filtered.slice(0, state.storesVisibleCount);

  if (state.currentView === 'grid') {
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
    storesLoadMoreContainer.classList.toggle('hidden', state.storesVisibleCount >= filtered.length);
  }

  if (window.lucide) lucide.createIcons();
}

function renderDeals() {
  const filtered = getFilteredDeals();
  matchingDealsCountEl.textContent = filtered.length;

  const hasFilter = state.dealsSearchQuery || state.currentDealTag !== 'all' || state.currentDealCategory !== 'all' || state.currentDealMaxPrice !== 'all' || (state.dealsSearchQuery && state.dealsSearchInDesc);
  activeDealsFilterBadge.classList.toggle('hidden', !hasFilter);

  if (hasFilter) {
    const parts = [];
    if (state.dealsSearchQuery) parts.push(`"${state.dealsSearchQuery}"${state.dealsSearchInDesc ? ' (כולל תיאור)' : ''}`);
    if (state.currentDealTag !== 'all') parts.push(state.currentDealTag);
    if (state.currentDealCategory !== 'all') parts.push(state.currentDealCategory);
    if (state.currentDealMaxPrice !== 'all') parts.push(state.currentDealMaxPrice === 'over-500' ? 'מעל 500 ₪' : `עד ${state.currentDealMaxPrice} ₪`);
    activeDealsFilterText.textContent = parts.join(' • ');
  }

  if (filtered.length === 0) {
    dealsGrid.innerHTML = '';
    noDealsResults.classList.remove('hidden');
    if (dealsLoadMoreContainer) dealsLoadMoreContainer.classList.add('hidden');
    return;
  }

  noDealsResults.classList.add('hidden');

  const visibleDeals = filtered.slice(0, state.dealsVisibleCount);
  dealsGrid.innerHTML = '';
  visibleDeals.forEach(d => dealsGrid.appendChild(createDealCardElement(d)));

  if (dealsLoadMoreContainer) {
    dealsLoadMoreContainer.classList.toggle('hidden', state.dealsVisibleCount >= filtered.length);
  }

  if (window.lucide) lucide.createIcons();
}

function renderBillingStores() {
  if (!billingGrid) return;
  const filtered = getFilteredBillingStores();
  if (matchingBillingCountEl) matchingBillingCountEl.textContent = filtered.length.toLocaleString('he-IL');

  const hasFilter = state.billingSearchQuery || state.currentBillingCity !== 'all' || state.currentBillingCategory !== 'all' || (state.billingSearchQuery && state.billingSearchInDesc);
  if (activeBillingFilterBadge) activeBillingFilterBadge.classList.toggle('hidden', !hasFilter);

  if (hasFilter && activeBillingFilterText) {
    const parts = [];
    if (state.billingSearchQuery) parts.push(`"${state.billingSearchQuery}"${state.billingSearchInDesc ? ' (כולל תיאור)' : ''}`);
    if (state.currentBillingCity !== 'all') parts.push(state.currentBillingCity === 'online' ? 'Online' : state.currentBillingCity);
    if (state.currentBillingCategory !== 'all') parts.push(state.currentBillingCategory);
    activeBillingFilterText.textContent = parts.join(' • ');
  }

  if (filtered.length === 0) {
    billingGrid.innerHTML = '';
    if (noBillingResults) noBillingResults.classList.remove('hidden');
    if (billingLoadMoreContainer) billingLoadMoreContainer.classList.add('hidden');
    return;
  }

  if (noBillingResults) noBillingResults.classList.add('hidden');

  const visibleStores = filtered.slice(0, state.billingVisibleCount);
  billingGrid.innerHTML = '';
  visibleStores.forEach(s => billingGrid.appendChild(createBillingCardElement(s)));

  if (billingLoadMoreContainer) {
    billingLoadMoreContainer.classList.toggle('hidden', state.billingVisibleCount >= filtered.length);
  }

  if (window.lucide) lucide.createIcons();
}

function applyViewMode(mode) {
  state.currentView = mode;
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

function getTabSearchQuery(tab) {
  if (tab === 'stores') return state.searchQuery || '';
  if (tab === 'deals') return state.dealsSearchQuery || '';
  if (tab === 'billing') return state.billingSearchQuery || '';
  return '';
}

function setTabSearchQuery(tab, query) {
  const term = query || '';
  if (tab === 'stores') {
    state.searchQuery = term;
    if (searchInput) searchInput.value = term;
    if (clearSearchBtn) clearSearchBtn.classList.toggle('hidden', !term);
    state.storesVisibleCount = state.STORES_PAGE_SIZE;
  } else if (tab === 'deals') {
    state.dealsSearchQuery = term;
    if (dealsSearchInput) dealsSearchInput.value = term;
    if (clearDealsSearchBtn) clearDealsSearchBtn.classList.toggle('hidden', !term);
    state.dealsVisibleCount = state.DEALS_PAGE_SIZE;
  } else if (tab === 'billing') {
    state.billingSearchQuery = term;
    if (billingSearchInput) billingSearchInput.value = term;
    if (clearBillingSearchBtn) clearBillingSearchBtn.classList.toggle('hidden', !term);
    state.billingVisibleCount = state.BILLING_PAGE_SIZE;
  }
}

function switchTab(tab, options = {}) {
  const previousTab = state.currentTab;
  state.currentTab = tab;

  if (!options.preserveSearch && previousTab && previousTab !== tab) {
    const currentQuery = getTabSearchQuery(previousTab);
    setTabSearchQuery(tab, currentQuery);
  }

  window.location.hash = tab === 'deals' ? 'deals' : (tab === 'billing' ? 'billing' : 'stores');

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
    if (!state.dealsLoaded) {
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
    if (!state.billingLoaded) {
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
    if (state.storesLoaded) {
      renderStores();
    }
  }
}

function onDatasetsLoaded() {
  crossLinkAllDatasets();
  if (state.currentTab === 'stores') {
    renderStores();
  } else if (state.currentTab === 'deals' && state.dealsLoaded) {
    renderDeals();
  } else if (state.currentTab === 'billing' && state.billingLoaded) {
    renderBillingStores();
  }
}

// Modal Callbacks
const storeModalCallbacks = {
  onViewDeal: (store) => {
    dealsSearchInput.value = store.name;
    state.dealsSearchQuery = store.name;
    clearDealsSearchBtn.classList.remove('hidden');
    switchTab('deals', { preserveSearch: true });
  },
  onViewBilling: (store) => {
    billingSearchInput.value = store.name;
    state.billingSearchQuery = store.name;
    clearBillingSearchBtn.classList.remove('hidden');
    state.currentBillingCity = 'all';
    state.currentBillingCategory = 'all';
    if (billingCitySelect) billingCitySelect.value = 'all';
    switchTab('billing', { preserveSearch: true });
  }
};

const dealModalCallbacks = {
  onViewStore: (matchedStore) => {
    searchInput.value = matchedStore.name;
    state.searchQuery = matchedStore.name;
    clearSearchBtn.classList.remove('hidden');
    switchTab('stores', { preserveSearch: true });
    setTimeout(() => openStoreModal(matchedStore, storeModalElements, storeModalCallbacks), 100);
  },
  onViewBilling: (deal) => {
    billingSearchInput.value = deal.supplier;
    state.billingSearchQuery = deal.supplier;
    clearBillingSearchBtn.classList.remove('hidden');
    state.currentBillingCity = 'all';
    state.currentBillingCategory = 'all';
    if (billingCitySelect) billingCitySelect.value = 'all';
    switchTab('billing', { preserveSearch: true });
  }
};

const billingModalCallbacks = {
  onViewStore: (linkedStore) => {
    searchInput.value = linkedStore.name;
    state.searchQuery = linkedStore.name;
    clearSearchBtn.classList.remove('hidden');
    switchTab('stores', { preserveSearch: true });
    setTimeout(() => openStoreModal(linkedStore, storeModalElements, storeModalCallbacks), 100);
  },
  onViewDeal: (dealQuery) => {
    dealsSearchInput.value = dealQuery;
    state.dealsSearchQuery = dealQuery;
    clearDealsSearchBtn.classList.remove('hidden');
    switchTab('deals', { preserveSearch: true });
  }
};

// Data Loading Initialization
async function loadAllData() {
  if (tabDealsCount) {
    tabDealsCount.innerHTML = '<span class="inline-block w-2.5 h-2.5 border-2 border-slate-300 dark:border-slate-600 border-t-emerald-500 rounded-full animate-spin align-middle"></span>';
  }
  if (tabBillingCount) {
    tabBillingCount.innerHTML = '<span class="inline-block w-2.5 h-2.5 border-2 border-slate-300 dark:border-slate-600 border-t-purple-500 rounded-full animate-spin align-middle"></span>';
  }

  await loadStores(() => {
    totalCountEl.textContent = state.allStores.length;
    tabStoresCount.textContent = state.allStores.length;

    if (state.storeData.metadata?.last_updated) {
      const d = new Date(state.storeData.metadata.last_updated);
      lastUpdatedDateEl.textContent = d.toLocaleDateString('he-IL');
    }

    populateCardsFilter(cardFilterSelect);
    updateCategoryChips(categoryChipsContainer);
    applyViewMode(state.currentView);

    if (state.currentTab === 'stores') {
      renderStores();
    }
  });

  Promise.all([
    loadDeals(() => {
      totalDealsCountEl.textContent = state.allDeals.length;
      tabDealsCount.textContent = state.allDeals.length;

      if (state.dealsData.metadata?.last_updated) {
        const d = new Date(state.dealsData.metadata.last_updated);
        dealsLastUpdatedDateEl.textContent = d.toLocaleDateString('he-IL');
      }

      populateDealsTagsFilter(dealsTagSelect);
      updateDealsCategoryChips(dealsCategoryChipsContainer);

      if (dealsTabSpinner) dealsTabSpinner.classList.add('hidden');
      if (dealsGrid) dealsGrid.classList.remove('hidden');

      if (state.currentTab === 'deals') {
        renderDeals();
      }

      onDatasetsLoaded();
    }),
    loadBilling(() => {
      if (totalBillingCountEl) totalBillingCountEl.textContent = state.allBillingStores.length.toLocaleString('he-IL');
      if (tabBillingCount) tabBillingCount.textContent = state.allBillingStores.length.toLocaleString('he-IL');

      if (state.billingData.metadata?.scraped_at && billingLastUpdatedDateEl) {
        const d = new Date(state.billingData.metadata.scraped_at);
        billingLastUpdatedDateEl.textContent = d.toLocaleDateString('he-IL');
      }

      if (billingCitySelect) populateBillingCitiesFilter(billingCitySelect);
      if (billingCategoryChipsContainer) updateBillingCategoryChips(billingCategoryChipsContainer);

      if (billingTabSpinner) billingTabSpinner.classList.add('hidden');
      if (billingGrid) billingGrid.classList.remove('hidden');

      if (state.currentTab === 'billing') {
        renderBillingStores();
      }

      onDatasetsLoaded();
    })
  ]).catch(err => {
    console.warn('Background data load error:', err);
  });
}

// Event Listeners
tabStoresBtn.addEventListener('click', () => switchTab('stores'));
tabDealsBtn.addEventListener('click', () => switchTab('deals'));
if (tabBillingBtn) tabBillingBtn.addEventListener('click', () => switchTab('billing'));

window.addEventListener('hashchange', () => {
  const hash = window.location.hash;
  if (hash === '#deals') switchTab('deals');
  else if (hash === '#billing') switchTab('billing');
  else switchTab('stores');
});

// Stores Search & Filters
const debouncedRenderStores = debounce(() => {
  state.storesVisibleCount = state.STORES_PAGE_SIZE;
  renderStores();
}, 120);

searchInput.addEventListener('input', (e) => {
  state.searchQuery = e.target.value.trim();
  clearSearchBtn.classList.toggle('hidden', !state.searchQuery);
  debouncedRenderStores();
});

clearSearchBtn.addEventListener('click', () => {
  searchInput.value = '';
  state.searchQuery = '';
  clearSearchBtn.classList.add('hidden');
  state.storesVisibleCount = state.STORES_PAGE_SIZE;
  renderStores();
});

if (storesSearchDescToggle) {
  storesSearchDescToggle.addEventListener('change', (e) => {
    state.storesSearchInDesc = e.target.checked;
    state.storesVisibleCount = state.STORES_PAGE_SIZE;
    renderStores();
  });
}

cardFilterSelect.addEventListener('change', (e) => {
  state.currentCard = e.target.value;
  state.storesVisibleCount = state.STORES_PAGE_SIZE;
  updateCategoryChips(categoryChipsContainer);
  renderStores();
});

sortSelect.addEventListener('change', (e) => {
  state.currentSort = e.target.value;
  state.storesVisibleCount = state.STORES_PAGE_SIZE;
  renderStores();
});

categoryChipsContainer.addEventListener('click', (e) => {
  const chip = e.target.closest('.category-chip');
  if (!chip) return;
  state.currentCategory = chip.dataset.category;
  state.storesVisibleCount = state.STORES_PAGE_SIZE;
  updateCategoryChips(categoryChipsContainer);
  renderStores();
});

function resetStoresFilters() {
  searchInput.value = '';
  state.searchQuery = '';
  state.currentCard = 'all';
  cardFilterSelect.value = 'all';
  state.currentCategory = 'all';
  if (storesSearchDescToggle) storesSearchDescToggle.checked = false;
  state.storesSearchInDesc = false;
  clearSearchBtn.classList.add('hidden');
  state.storesVisibleCount = state.STORES_PAGE_SIZE;
  updateCategoryChips(categoryChipsContainer);
  renderStores();
}

resetFiltersBtn.addEventListener('click', resetStoresFilters);
clearFiltersBtn.addEventListener('click', resetStoresFilters);

viewGridBtn.addEventListener('click', () => applyViewMode('grid'));
viewTableBtn.addEventListener('click', () => applyViewMode('table'));
themeToggleBtn.addEventListener('click', toggleTheme);

// Store Modal
storeModalElements.modalCloseBtn.addEventListener('click', () => closeStoreModal(storeModalElements.storeModal));
storeModalElements.modalDismissBtn.addEventListener('click', () => closeStoreModal(storeModalElements.storeModal));
storeModalElements.storeModal.addEventListener('click', (e) => {
  if (e.target === storeModalElements.storeModal) closeStoreModal(storeModalElements.storeModal);
});

// Deals Search & Filters
const debouncedRenderDeals = debounce(() => {
  state.dealsVisibleCount = state.DEALS_PAGE_SIZE;
  renderDeals();
}, 120);

dealsSearchInput.addEventListener('input', (e) => {
  state.dealsSearchQuery = e.target.value.trim();
  clearDealsSearchBtn.classList.toggle('hidden', !state.dealsSearchQuery);
  debouncedRenderDeals();
});

clearDealsSearchBtn.addEventListener('click', () => {
  dealsSearchInput.value = '';
  state.dealsSearchQuery = '';
  clearDealsSearchBtn.classList.add('hidden');
  state.dealsVisibleCount = state.DEALS_PAGE_SIZE;
  renderDeals();
});

if (dealsSearchDescToggle) {
  dealsSearchDescToggle.addEventListener('change', (e) => {
    state.dealsSearchInDesc = e.target.checked;
    state.dealsVisibleCount = state.DEALS_PAGE_SIZE;
    renderDeals();
  });
}

dealsTagSelect.addEventListener('change', (e) => {
  state.currentDealTag = e.target.value;
  state.dealsVisibleCount = state.DEALS_PAGE_SIZE;
  renderDeals();
});

dealsPriceFilterSelect.addEventListener('change', (e) => {
  state.currentDealMaxPrice = e.target.value;
  state.dealsVisibleCount = state.DEALS_PAGE_SIZE;
  renderDeals();
});

dealsSortSelect.addEventListener('change', (e) => {
  state.currentDealSort = e.target.value;
  state.dealsVisibleCount = state.DEALS_PAGE_SIZE;
  renderDeals();
});

dealsCategoryChipsContainer.addEventListener('click', (e) => {
  const chip = e.target.closest('.deal-category-chip');
  if (!chip) return;
  state.currentDealCategory = chip.dataset.category;
  state.dealsVisibleCount = state.DEALS_PAGE_SIZE;
  updateDealsCategoryChips(dealsCategoryChipsContainer);
  renderDeals();
});

function resetDealsFilters() {
  dealsSearchInput.value = '';
  state.dealsSearchQuery = '';
  state.currentDealTag = 'all';
  dealsTagSelect.value = 'all';
  state.currentDealCategory = 'all';
  state.currentDealMaxPrice = 'all';
  dealsPriceFilterSelect.value = 'all';
  if (dealsSearchDescToggle) dealsSearchDescToggle.checked = false;
  state.dealsSearchInDesc = false;
  clearDealsSearchBtn.classList.add('hidden');
  state.dealsVisibleCount = state.DEALS_PAGE_SIZE;
  updateDealsCategoryChips(dealsCategoryChipsContainer);
  renderDeals();
}

resetDealsFiltersBtn.addEventListener('click', resetDealsFilters);
clearDealsFiltersBtn.addEventListener('click', resetDealsFilters);

// Deal Modal
dealModalElements.dealModalCloseBtn.addEventListener('click', () => closeDealModal(dealModalElements.dealModal));
dealModalElements.dealModalDismissBtn.addEventListener('click', () => closeDealModal(dealModalElements.dealModal));
dealModalElements.dealModal.addEventListener('click', (e) => {
  if (e.target === dealModalElements.dealModal) closeDealModal(dealModalElements.dealModal);
});

// Billing Search & Filters
const debouncedRenderBilling = debounce(() => {
  state.billingVisibleCount = state.BILLING_PAGE_SIZE;
  renderBillingStores();
}, 120);

if (billingSearchInput) {
  billingSearchInput.addEventListener('input', (e) => {
    state.billingSearchQuery = e.target.value.trim();
    if (clearBillingSearchBtn) clearBillingSearchBtn.classList.toggle('hidden', !state.billingSearchQuery);
    debouncedRenderBilling();
  });
}

if (clearBillingSearchBtn) {
  clearBillingSearchBtn.addEventListener('click', () => {
    billingSearchInput.value = '';
    state.billingSearchQuery = '';
    clearBillingSearchBtn.classList.add('hidden');
    state.billingVisibleCount = state.BILLING_PAGE_SIZE;
    renderBillingStores();
  });
}

if (billingSearchDescToggle) {
  billingSearchDescToggle.addEventListener('change', (e) => {
    state.billingSearchInDesc = e.target.checked;
    state.billingVisibleCount = state.BILLING_PAGE_SIZE;
    renderBillingStores();
  });
}

if (billingCitySelect) {
  billingCitySelect.addEventListener('change', (e) => {
    state.currentBillingCity = e.target.value;
    state.billingVisibleCount = state.BILLING_PAGE_SIZE;
    updateBillingCategoryChips(billingCategoryChipsContainer);
    renderBillingStores();
  });
}

if (billingSortSelect) {
  billingSortSelect.addEventListener('change', (e) => {
    state.currentBillingSort = e.target.value;
    state.billingVisibleCount = state.BILLING_PAGE_SIZE;
    renderBillingStores();
  });
}

if (billingCategoryChipsContainer) {
  billingCategoryChipsContainer.addEventListener('click', (e) => {
    const chip = e.target.closest('.billing-category-chip');
    if (!chip) return;
    state.currentBillingCategory = chip.dataset.category;
    state.billingVisibleCount = state.BILLING_PAGE_SIZE;
    updateBillingCategoryChips(billingCategoryChipsContainer);
    renderBillingStores();
  });
}

function resetBillingFilters() {
  billingSearchInput.value = '';
  state.billingSearchQuery = '';
  state.currentBillingCity = 'all';
  if (billingCitySelect) billingCitySelect.value = 'all';
  state.currentBillingCategory = 'all';
  if (billingSearchDescToggle) billingSearchDescToggle.checked = false;
  state.billingSearchInDesc = false;
  if (clearBillingSearchBtn) clearBillingSearchBtn.classList.add('hidden');
  state.billingVisibleCount = state.BILLING_PAGE_SIZE;
  updateBillingCategoryChips(billingCategoryChipsContainer);
  renderBillingStores();
}

if (resetBillingFiltersBtn) resetBillingFiltersBtn.addEventListener('click', resetBillingFilters);
if (clearBillingFiltersBtn) clearBillingFiltersBtn.addEventListener('click', resetBillingFilters);

// Billing Modal
if (billingModalElements.billingModalCloseBtn) billingModalElements.billingModalCloseBtn.addEventListener('click', () => closeBillingModal(billingModalElements.billingModal));
if (billingModalElements.billingModalDismissBtn) billingModalElements.billingModalDismissBtn.addEventListener('click', () => closeBillingModal(billingModalElements.billingModal));
if (billingModalElements.billingModal) {
  billingModalElements.billingModal.addEventListener('click', (e) => {
    if (e.target === billingModalElements.billingModal) closeBillingModal(billingModalElements.billingModal);
  });
}

// Progressive Load More Buttons
if (storesLoadMoreBtn) {
  storesLoadMoreBtn.addEventListener('click', () => {
    state.storesVisibleCount += state.STORES_PAGE_SIZE;
    renderStores();
  });
}

if (dealsLoadMoreBtn) {
  dealsLoadMoreBtn.addEventListener('click', () => {
    state.dealsVisibleCount += state.DEALS_PAGE_SIZE;
    renderDeals();
  });
}

if (billingLoadMoreBtn) {
  billingLoadMoreBtn.addEventListener('click', () => {
    state.billingVisibleCount += state.BILLING_PAGE_SIZE;
    renderBillingStores();
  });
}

// Global Event Delegation
document.addEventListener('click', (e) => {
  const dealBadge = e.target.closest('[data-action="view-linked-deal"]');
  if (dealBadge) {
    e.stopPropagation();
    const storeName = decodeURIComponent(dealBadge.dataset.storeName || '');
    if (storeName) {
      dealsSearchInput.value = storeName;
      state.dealsSearchQuery = storeName;
      clearDealsSearchBtn.classList.remove('hidden');
      state.currentDealTag = 'all';
      dealsTagSelect.value = 'all';
      state.currentDealCategory = 'all';
      state.currentDealMaxPrice = 'all';
      dealsPriceFilterSelect.value = 'all';
      updateDealsCategoryChips(dealsCategoryChipsContainer);
      switchTab('deals', { preserveSearch: true });
    }
    return;
  }

  const storeBadge = e.target.closest('[data-action="view-linked-store"]');
  if (storeBadge) {
    e.stopPropagation();
    const storeName = decodeURIComponent(storeBadge.dataset.storeName || '');
    if (storeName) {
      searchInput.value = storeName;
      state.searchQuery = storeName;
      clearSearchBtn.classList.remove('hidden');
      state.currentCard = 'all';
      cardFilterSelect.value = 'all';
      state.currentCategory = 'all';
      updateCategoryChips(categoryChipsContainer);
      switchTab('stores', { preserveSearch: true });
    }
    return;
  }

  const billingBadge = e.target.closest('[data-action="view-linked-billing"]');
  if (billingBadge) {
    e.stopPropagation();
    const storeName = decodeURIComponent(billingBadge.dataset.storeName || '');
    if (storeName) {
      if (billingSearchInput) {
        billingSearchInput.value = storeName;
        state.billingSearchQuery = storeName;
        if (clearBillingSearchBtn) clearBillingSearchBtn.classList.remove('hidden');
      }
      state.currentBillingCity = 'all';
      if (billingCitySelect) billingCitySelect.value = 'all';
      state.currentBillingCategory = 'all';
      if (billingCategoryChipsContainer) updateBillingCategoryChips(billingCategoryChipsContainer);
      switchTab('billing', { preserveSearch: true });
    }
    return;
  }

  const storeCard = e.target.closest('.store-card, #table-tbody tr');
  if (storeCard) {
    const storeId = storeCard.dataset.storeId;
    const store = state.allStores.find(s => s.id === storeId);
    if (store) openStoreModal(store, storeModalElements, storeModalCallbacks);
    return;
  }

  const dealCard = e.target.closest('.deal-card');
  if (dealCard) {
    const dealId = dealCard.dataset.dealId;
    const deal = state.allDeals.find(d => String(d.id) === String(dealId));
    if (deal) openDealModal(deal, dealModalElements, dealModalCallbacks);
    return;
  }

  const billingCard = e.target.closest('.billing-card');
  if (billingCard) {
    const billingId = billingCard.dataset.billingId;
    const billingStore = state.allBillingStores.find(b => String(b.id) === String(billingId));
    if (billingStore) openBillingModal(billingStore, billingModalElements, billingModalCallbacks);
    return;
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeStoreModal(storeModalElements.storeModal);
    closeDealModal(dealModalElements.dealModal);
    closeBillingModal(billingModalElements.billingModal);
  }
});

// Initialize
initTheme();
loadAllData();
