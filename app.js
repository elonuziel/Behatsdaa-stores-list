/**
 * Behatsdaa Multi-Card Participating Stores & Deals Web Application
 */

(function () {
  'use strict';

  // Application State - Stores
  let storeData = null;
  let allStores = [];
  let availableCards = [];
  let currentCard = 'all';
  let currentCategory = 'all';
  let searchQuery = '';
  let currentSort = 'discount-desc';
  let currentView = localStorage.getItem('behatsdaa_view') || 'grid';

  // Application State - Deals & Vouchers
  let dealsData = null;
  let allDeals = [];
  let availableTags = [];
  let currentDealTag = 'all';
  let currentDealCategory = 'all';
  let dealsSearchQuery = '';
  let currentDealSort = 'discount-desc';
  let currentDealMaxPrice = 'all';

  // Navigation State
  let currentTab = window.location.hash === '#deals' ? 'deals' : 'stores';

  // DOM Elements - Navigation Tabs
  const tabStoresBtn = document.getElementById('tab-stores-btn');
  const tabDealsBtn = document.getElementById('tab-deals-btn');
  const tabStoresCount = document.getElementById('tab-stores-count');
  const tabDealsCount = document.getElementById('tab-deals-count');
  const storesTabSection = document.getElementById('stores-tab-section');
  const dealsTabSection = document.getElementById('deals-tab-section');
  const viewModeToggleWrapper = document.getElementById('view-mode-toggle-wrapper');

  // DOM Elements - Stores
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');
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

  // Progressive Rendering (Page size of 60 items for instant 60fps responsiveness)
  const STORES_PAGE_SIZE = 60;
  let storesVisibleCount = STORES_PAGE_SIZE;
  const DEALS_PAGE_SIZE = 60;
  let dealsVisibleCount = DEALS_PAGE_SIZE;

  const storesLoadMoreContainer = document.getElementById('stores-load-more-container');
  const storesLoadMoreBtn = document.getElementById('stores-load-more-btn');
  const dealsLoadMoreContainer = document.getElementById('deals-load-more-container');
  const dealsLoadMoreBtn = document.getElementById('deals-load-more-btn');

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

  // DOM Elements - Deals
  const dealsSearchInput = document.getElementById('deals-search-input');
  const clearDealsSearchBtn = document.getElementById('clear-deals-search-btn');
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
  const noDealsResults = document.getElementById('no-deals-results');
  const clearDealsFiltersBtn = document.getElementById('clear-deals-filters-btn');

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

  let activeModalStore = null;

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
    window.location.hash = tab === 'deals' ? 'deals' : 'stores';

    if (tab === 'deals') {
      tabStoresBtn.className = 'main-tab-btn flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800';
      tabDealsBtn.className = 'main-tab-btn flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-xs bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white';
      storesTabSection.classList.add('hidden');
      dealsTabSection.classList.remove('hidden');
      viewModeToggleWrapper.classList.add('hidden');
      renderDeals();
    } else {
      tabStoresBtn.className = 'main-tab-btn flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-xs bg-blue-600 text-white dark:bg-blue-600 dark:text-white';
      tabDealsBtn.className = 'main-tab-btn flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800';
      storesTabSection.classList.remove('hidden');
      dealsTabSection.classList.add('hidden');
      viewModeToggleWrapper.classList.remove('hidden');
      renderStores();
    }
  }

  // Cross-link Stores with Deals
  function linkStoresWithDeals() {
    if (!allStores.length || !allDeals.length) return;

    allStores.forEach(store => {
      const sNorm = normalizeHebrew(store.name);
      store.linkedDeals = allDeals.filter(d => {
        if (d.matched_store_id && d.matched_store_id === store.id) return true;
        if (d.matched_store_name && d.matched_store_name === store.name) return true;
        const suppNorm = normalizeHebrew(d.supplier);
        return suppNorm && (sNorm.includes(suppNorm) || suppNorm.includes(sNorm));
      });
    });
  }

  // Load both Stores & Deals data
  async function loadAllData() {
    // 1. Fetch Stores
    try {
      const response = await fetch(`data/stores.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to load stores.json');
      storeData = await response.json();
    } catch (err) {
      console.warn('Stores fallback:', err);
      storeData = { metadata: { total_stores: 0, available_cards: [] }, stores: [] };
    }

    allStores = storeData.stores || [];
    availableCards = storeData.metadata?.available_cards || [];
    totalCountEl.textContent = allStores.length;
    tabStoresCount.textContent = allStores.length;

    if (storeData.metadata?.last_updated) {
      const d = new Date(storeData.metadata.last_updated);
      lastUpdatedDateEl.textContent = d.toLocaleDateString('he-IL');
    }

    // 2. Fetch Deals
    try {
      const dResponse = await fetch(`data/deals.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!dResponse.ok) throw new Error('Failed to load deals.json');
      dealsData = await dResponse.json();
    } catch (err) {
      console.warn('Deals fallback:', err);
      dealsData = { metadata: { total_deals: 0, tags: [], categories: [] }, deals: [] };
    }

    allDeals = dealsData.deals || [];
    availableTags = dealsData.metadata?.tags || [];
    totalDealsCountEl.textContent = allDeals.length;
    tabDealsCount.textContent = allDeals.length;

    if (dealsData.metadata?.last_updated) {
      const d = new Date(dealsData.metadata.last_updated);
      dealsLastUpdatedDateEl.textContent = d.toLocaleDateString('he-IL');
    }

    // Cross-link
    linkStoresWithDeals();

    // Populate Filters
    populateCardsFilter();
    updateCategoryChips();
    populateDealsTagsFilter();
    updateDealsCategoryChips();

    applyViewMode(currentView);

    // Initial Tab Render
    switchTab(currentTab);
  }

  // ==========================================
  // STORES LOGIC & RENDERING
  // ==========================================

  function populateCardsFilter() {
    cardFilterSelect.innerHTML = '<option value="all">כל הכרטיסים (הכל)</option>';
    availableCards.forEach(card => {
      const option = document.createElement('option');
      option.value = card.id || card.name;
      option.textContent = card.name + (card.discount_default ? ` (${card.discount_default})` : '');
      cardFilterSelect.appendChild(option);
    });
  }

  function updateCategoryChips() {
    const catCounts = {};
    const relevantStores = currentCard === 'all' 
      ? allStores 
      : allStores.filter(s => s.cards?.some(c => (c.card_id === currentCard || c.card_name === currentCard)));

    relevantStores.forEach(s => {
      const cat = s.category || 'אחר';
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });

    const categories = Object.keys(catCounts).sort((a, b) => catCounts[b] - catCounts[a]);

    categoryChipsContainer.innerHTML = '';
    const allBtn = document.createElement('button');
    const isAllActive = currentCategory === 'all';
    allBtn.className = `category-chip px-3.5 py-1.5 rounded-full font-medium transition text-xs flex items-center gap-1.5 whitespace-nowrap ${
      isAllActive ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
    }`;
    allBtn.dataset.category = 'all';
    allBtn.innerHTML = `<span>הכל</span><span class="category-count ${isAllActive ? 'bg-blue-700 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300'} text-[10px] px-1.5 py-0.2 rounded-full">${relevantStores.length}</span>`;
    categoryChipsContainer.appendChild(allBtn);

    categories.forEach(cat => {
      const count = catCounts[cat];
      const isActive = currentCategory === cat;
      const btn = document.createElement('button');
      btn.className = `category-chip px-3.5 py-1.5 rounded-full font-medium transition text-xs flex items-center gap-1.5 whitespace-nowrap ${
        isActive ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
      }`;
      btn.dataset.category = cat;
      btn.innerHTML = `<span>${cat}</span><span class="category-count ${isActive ? 'bg-blue-700 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300'} text-[10px] px-1.5 py-0.2 rounded-full">${count}</span>`;
      categoryChipsContainer.appendChild(btn);
    });
  }

  function filterAndSortStores() {
    let result = [...allStores];

    if (currentCard !== 'all') {
      result = result.filter(store => 
        store.cards && store.cards.some(c => (c.card_id === currentCard || c.card_name === currentCard))
      );
    }

    if (currentCategory !== 'all') {
      result = result.filter(store => store.category === currentCategory);
    }

    if (searchQuery) {
      const queryNorm = normalizeHebrew(searchQuery);
      result = result.filter(store => {
        const nameNorm = normalizeHebrew(store.name);
        const catNorm = normalizeHebrew(store.category);
        const condNorm = normalizeHebrew(store.conditions);
        const cardsMatch = store.cards && store.cards.some(c => 
          normalizeHebrew(c.card_name).includes(queryNorm) || 
          normalizeHebrew(c.discount).includes(queryNorm)
        );
        return nameNorm.includes(queryNorm) || 
               catNorm.includes(queryNorm) || 
               condNorm.includes(queryNorm) || 
               cardsMatch;
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
      <div class="mt-2.5 pt-2 border-t border-emerald-100 dark:border-emerald-900/50 flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1.5 rounded-xl hover:bg-emerald-100 transition-colors" data-action="view-linked-deal" data-store-name="${encodeURIComponent(store.name)}">
        <span class="flex items-center gap-1 font-semibold">
          <i data-lucide="tag" class="w-3.5 h-3.5 text-emerald-600"></i>
          <span>שובר/מבצע פעיל (${store.linkedDeals.length})</span>
        </span>
        <span class="text-[11px] underline">הצג</span>
      </div>
    ` : '';

    card.innerHTML = `
      <div>
        <div class="flex items-start justify-between gap-3 mb-3">
          <div class="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-700 p-1.5 border border-slate-100 dark:border-slate-600 flex items-center justify-center flex-shrink-0">
            ${store.logo ? `<img src="${store.logo}" alt="${store.name}" class="max-h-full max-w-full object-contain" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2280%22>🛍️</text></svg>'"/>` : `<i data-lucide="shopping-bag" class="w-6 h-6 text-slate-400"></i>`}
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
        <div class="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700/60">
          <span class="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
            <span>לפרטים מלאים</span>
            <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i>
          </span>
          ${store.website ? `<span class="text-[11px] text-slate-400">אתר רשת</span>` : ''}
        </div>
      </div>
    `;

    card.addEventListener('click', (e) => {
      const dealAction = e.target.closest('[data-action="view-linked-deal"]');
      if (dealAction) {
        e.stopPropagation();
        const storeName = decodeURIComponent(dealAction.dataset.storeName);
        dealsSearchInput.value = storeName;
        dealsSearchQuery = storeName;
        clearDealsSearchBtn.classList.remove('hidden');
        switchTab('deals');
        return;
      }
      openStoreModal(store);
    });

    return card;
  }

  function renderStores() {
    const filteredStores = filterAndSortStores();
    matchingCountEl.textContent = filteredStores.length;

    if (currentCard !== 'all' || currentCategory !== 'all' || searchQuery) {
      activeFilterBadge.classList.remove('hidden');
      const parts = [];
      if (currentCard !== 'all') {
        const cardObj = availableCards.find(c => c.id === currentCard || c.name === currentCard);
        parts.push(cardObj ? cardObj.name : currentCard);
      }
      if (currentCategory !== 'all') parts.push(currentCategory);
      if (searchQuery) parts.push(`"${searchQuery}"`);
      activeFilterText.textContent = parts.join(' | ');
    } else {
      activeFilterBadge.classList.add('hidden');
    }

    if (filteredStores.length === 0) {
      cardsView.classList.add('hidden');
      tableView.classList.add('hidden');
      noResultsEl.classList.remove('hidden');
      return;
    }

    noResultsEl.classList.add('hidden');

    const storesToRender = filteredStores.slice(0, storesVisibleCount);

    if (currentView === 'grid') {
      cardsView.classList.remove('hidden');
      tableView.classList.add('hidden');
      cardsView.innerHTML = '';
      const fragment = document.createDocumentFragment();
      storesToRender.forEach(s => fragment.appendChild(createStoreCardElement(s)));
      cardsView.appendChild(fragment);
    } else {
      cardsView.classList.add('hidden');
      tableView.classList.remove('hidden');
      tableTbody.innerHTML = '';
      const fragment = document.createDocumentFragment();

      storesToRender.forEach(s => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50/80 dark:hover:bg-slate-750 transition cursor-pointer';

        const cardsText = (s.cards || []).map(c => `${c.card_name} (${c.discount})`).join(', ');
        const hasDeals = s.linkedDeals && s.linkedDeals.length > 0;
        const dealBadge = hasDeals ? `<span class="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">קיים שובר/מבצע (${s.linkedDeals.length})</span>` : '';

        tr.innerHTML = `
          <td class="py-3 px-4 font-semibold text-slate-900 dark:text-white">${s.name}</td>
          <td class="py-3 px-4 text-slate-500 dark:text-slate-400 text-xs">${s.category || 'כללי'}</td>
          <td class="py-3 px-4 text-center font-bold text-amber-600 dark:text-amber-400">${s.max_discount}%</td>
          <td class="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
            <div>${cardsText}</div>
            ${dealBadge}
          </td>
          <td class="py-3 px-4 text-center">
            <button class="px-2.5 py-1 text-xs rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 hover:bg-blue-100 font-medium">פרטים</button>
          </td>
        `;
        tr.addEventListener('click', () => openStoreModal(s));
        fragment.appendChild(tr);
      });
      tableTbody.appendChild(fragment);
    }

    if (storesLoadMoreContainer) {
      if (storesVisibleCount < filteredStores.length) {
        storesLoadMoreContainer.classList.remove('hidden');
      } else {
        storesLoadMoreContainer.classList.add('hidden');
      }
    }

    if (window.lucide) lucide.createIcons();
  }

  function openStoreModal(store) {
    activeModalStore = store;
    modalLogo.src = store.logo || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2280%22>🛍️</text></svg>';
    modalLogo.alt = store.name;
    modalCategory.textContent = store.category || 'כללי';
    modalTitle.textContent = store.name;

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
      const c = d.category || 'כללי';
      catCounts[c] = (catCounts[c] || 0) + 1;
    });

    const categories = Object.keys(catCounts).sort((a, b) => catCounts[b] - catCounts[a]);

    dealsCategoryChipsContainer.innerHTML = '';
    const allBtn = document.createElement('button');
    const isAllActive = currentDealCategory === 'all';
    allBtn.className = `deal-category-chip px-3.5 py-1.5 rounded-full font-medium transition text-xs flex items-center gap-1.5 whitespace-nowrap ${
      isAllActive ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
    }`;
    allBtn.dataset.category = 'all';
    allBtn.innerHTML = `<span>הכל</span><span class="deal-category-count ${isAllActive ? 'bg-emerald-700 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300'} text-[10px] px-1.5 py-0.2 rounded-full">${allDeals.length}</span>`;
    dealsCategoryChipsContainer.appendChild(allBtn);

    categories.forEach(cat => {
      const count = catCounts[cat];
      const isActive = currentDealCategory === cat;
      const btn = document.createElement('button');
      btn.className = `deal-category-chip px-3.5 py-1.5 rounded-full font-medium transition text-xs flex items-center gap-1.5 whitespace-nowrap ${
        isActive ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
      }`;
      btn.dataset.category = cat;
      btn.innerHTML = `<span>${cat}</span><span class="deal-category-count ${isActive ? 'bg-emerald-700 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300'} text-[10px] px-1.5 py-0.2 rounded-full">${count}</span>`;
      dealsCategoryChipsContainer.appendChild(btn);
    });
  }

  function filterAndSortDeals() {
    let result = [...allDeals];

    if (currentDealTag !== 'all') {
      result = result.filter(d => d.tags && d.tags.includes(currentDealTag));
    }

    if (currentDealCategory !== 'all') {
      result = result.filter(d => d.category === currentDealCategory);
    }

    if (currentDealMaxPrice !== 'all') {
      if (currentDealMaxPrice === 'over-500') {
        result = result.filter(d => (d.price || 0) > 500);
      } else {
        const maxVal = Number(currentDealMaxPrice);
        result = result.filter(d => (d.price || 0) <= maxVal);
      }
    }

    if (dealsSearchQuery) {
      const qNorm = normalizeHebrew(dealsSearchQuery);
      result = result.filter(d => {
        const titleNorm = normalizeHebrew(d.title);
        const suppNorm = normalizeHebrew(d.supplier);
        const catNorm = normalizeHebrew(d.category);
        const descNorm = normalizeHebrew(d.description);
        const termsNorm = normalizeHebrew(d.terms_of_use);
        return titleNorm.includes(qNorm) || 
               suppNorm.includes(qNorm) || 
               catNorm.includes(qNorm) || 
               descNorm.includes(qNorm) || 
               termsNorm.includes(qNorm);
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

    const matchedStore = allStores.find(s => 
      (deal.matched_store_id && s.id === deal.matched_store_id) || 
      (deal.matched_store_name && s.name === deal.matched_store_name) || 
      normalizeHebrew(s.name) === normalizeHebrew(deal.supplier)
    );

    const storeLinkBadge = matchedStore ? `
      <div class="mt-2 pt-2 border-t border-blue-100 dark:border-blue-900/50 flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1.5 rounded-xl hover:bg-blue-100 transition-colors mb-2.5" data-action="view-linked-store" data-store-name="${encodeURIComponent(matchedStore.name)}">
        <span class="flex items-center gap-1 font-semibold truncate">
          <i data-lucide="credit-card" class="w-3.5 h-3.5 text-blue-600 flex-shrink-0"></i>
          <span class="truncate">מכבד כרטיסים (עד ${matchedStore.max_discount}% הנחה)</span>
        </span>
        <span class="text-[11px] underline flex-shrink-0 mr-1">לרשת</span>
      </div>
    ` : '';

    card.innerHTML = `
      <div>
        <!-- Deal Image Container -->
        <div class="w-full h-44 rounded-xl bg-slate-50 dark:bg-slate-900/60 p-2 mb-3 flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-700/50 relative">
          <img 
            src="${deal.image || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2280%22>🎁</text></svg>'}" 
            alt="${deal.title}" 
            class="max-h-full max-w-full object-contain transition-transform duration-300 hover:scale-105"
            onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2280%22>🎁</text></svg>'"
          />
          <div class="absolute top-2 right-2 flex flex-col gap-1 items-end">
            ${discountBadge}
            ${tagPill}
          </div>
        </div>

        <!-- Supplier & Category -->
        <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
          <span class="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">${deal.supplier || 'בהצדעה'}</span>
          <span class="text-[11px]">${deal.category || 'כללי'}</span>
        </div>

        <!-- Title -->
        <h3 class="font-bold text-sm text-slate-900 dark:text-white leading-snug mb-2 line-clamp-2" title="${deal.title}">
          ${deal.title}
        </h3>
      </div>

      <div>
        <!-- Price section -->
        <div class="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-baseline justify-between mb-2.5">
          <div class="flex items-baseline gap-1.5">
            <span class="text-lg font-black text-emerald-600 dark:text-emerald-400">${formatILS(deal.price)}</span>
            ${origPriceHtml}
          </div>
          <span class="text-[11px] text-slate-500 dark:text-slate-400">${deal.shipping_included ? 'כולל משלוח' : (deal.locations || 'מגוון סניפים')}</span>
        </div>

        <!-- Linked Store on Rechargeable Cards (if matched) -->
        ${storeLinkBadge}

        <!-- Action Button -->
        <button class="w-full py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition flex items-center justify-center gap-1.5">
          <span>פרטים ואפשרויות רכישה</span>
          <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i>
        </button>
      </div>
    `;

    card.addEventListener('click', (e) => {
      const storeAction = e.target.closest('[data-action="view-linked-store"]');
      if (storeAction) {
        e.stopPropagation();
        const storeName = decodeURIComponent(storeAction.dataset.storeName);
        searchInput.value = storeName;
        searchQuery = storeName;
        clearSearchBtn.classList.remove('hidden');
        switchTab('stores');
        const st = allStores.find(s => s.name === storeName);
        if (st) setTimeout(() => openStoreModal(st), 100);
        return;
      }
      openDealModal(deal);
    });
    return card;
  }

  function renderDeals() {
    const filteredDeals = filterAndSortDeals();
    matchingDealsCountEl.textContent = filteredDeals.length;

    if (currentDealTag !== 'all' || currentDealCategory !== 'all' || currentDealMaxPrice !== 'all' || dealsSearchQuery) {
      activeDealsFilterBadge.classList.remove('hidden');
      const parts = [];
      if (currentDealTag !== 'all') parts.push(currentDealTag);
      if (currentDealCategory !== 'all') parts.push(currentDealCategory);
      if (currentDealMaxPrice !== 'all') parts.push(currentDealMaxPrice === 'over-500' ? 'מעל 500 ₪' : `עד ${currentDealMaxPrice} ₪`);
      if (dealsSearchQuery) parts.push(`"${dealsSearchQuery}"`);
      activeDealsFilterText.textContent = parts.join(' | ');
    } else {
      activeDealsFilterBadge.classList.add('hidden');
    }

    if (filteredDeals.length === 0) {
      dealsGrid.classList.add('hidden');
      noDealsResults.classList.remove('hidden');
      return;
    }

    noDealsResults.classList.add('hidden');
    dealsGrid.classList.remove('hidden');
    dealsGrid.innerHTML = '';
    const fragment = document.createDocumentFragment();
    const dealsToRender = filteredDeals.slice(0, dealsVisibleCount);
    dealsToRender.forEach(d => fragment.appendChild(createDealCardElement(d)));
    dealsGrid.appendChild(fragment);

    if (dealsLoadMoreContainer) {
      if (dealsVisibleCount < filteredDeals.length) {
        dealsLoadMoreContainer.classList.remove('hidden');
      } else {
        dealsLoadMoreContainer.classList.add('hidden');
      }
    }

    if (window.lucide) lucide.createIcons();
  }

  function openDealModal(deal) {
    dealModalImg.src = deal.image || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2280%22>🎁</text></svg>';
    dealModalImg.alt = deal.title;
    dealModalCategory.textContent = deal.category || 'כללי';

    if (deal.tags && deal.tags.length > 0) {
      dealModalTag.textContent = deal.tags[0];
      dealModalTag.classList.remove('hidden');
    } else {
      dealModalTag.classList.add('hidden');
    }

    dealModalTitle.textContent = deal.title;
    dealModalSupplier.textContent = deal.supplier || 'בהצדעה';
    dealModalPrice.textContent = formatILS(deal.price);

    if (deal.original_price && deal.original_price > deal.price) {
      dealModalOrigPrice.textContent = formatILS(deal.original_price);
      dealModalOrigPrice.classList.remove('hidden');
    } else {
      dealModalOrigPrice.classList.add('hidden');
    }

    if (deal.discount_percent > 0) {
      dealModalSavingsBadge.classList.remove('hidden');
      dealModalSavingsText.textContent = `חיסכון של ${deal.discount_percent}%`;
    } else {
      dealModalSavingsBadge.classList.add('hidden');
    }

    // Linked Store on Cards Banner
    const matchedStore = allStores.find(s => 
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
  // EVENT LISTENERS
  // ==========================================

  // Tab Switching
  tabStoresBtn.addEventListener('click', () => switchTab('stores'));
  tabDealsBtn.addEventListener('click', () => switchTab('deals'));

  window.addEventListener('hashchange', () => {
    const hash = window.location.hash;
    switchTab(hash === '#deals' ? 'deals' : 'stores');
  });

  // Stores Search & Filter Listeners
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    clearSearchBtn.classList.toggle('hidden', !searchQuery);
    storesVisibleCount = STORES_PAGE_SIZE;
    renderStores();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.classList.add('hidden');
    storesVisibleCount = STORES_PAGE_SIZE;
    renderStores();
  });

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
  dealsSearchInput.addEventListener('input', (e) => {
    dealsSearchQuery = e.target.value.trim();
    clearDealsSearchBtn.classList.toggle('hidden', !dealsSearchQuery);
    dealsVisibleCount = DEALS_PAGE_SIZE;
    renderDeals();
  });

  clearDealsSearchBtn.addEventListener('click', () => {
    dealsSearchInput.value = '';
    dealsSearchQuery = '';
    clearDealsSearchBtn.classList.add('hidden');
    dealsVisibleCount = DEALS_PAGE_SIZE;
    renderDeals();
  });

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

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeStoreModal();
      closeDealModal();
    }
  });

  // Initialize
  initTheme();
  loadAllData();

})();
