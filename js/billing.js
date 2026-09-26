/**
 * Billing Discounts (Be-Plus) Feature Module
 */

import { state } from './state.js';
import { normalizeHebrew, formatILS } from './utils.js';

export function populateBillingCitiesFilter(billingCitySelect) {
  if (!billingCitySelect) return;
  const cityCounts = {};
  state.allBillingStores.forEach(s => {
    const c = s.city || 'online';
    cityCounts[c] = (cityCounts[c] || 0) + 1;
  });

  const sortedCities = Object.keys(cityCounts).sort((a, b) => {
    if (a === 'online') return -1;
    if (b === 'online') return 1;
    return cityCounts[b] - cityCounts[a] || (a > b ? 1 : a < b ? -1 : 0);
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

export function updateBillingCategoryChips(billingCategoryChipsContainer) {
  if (!billingCategoryChipsContainer) return;
  const catCounts = {};
  let filteredForChips = state.allBillingStores;
  if (state.currentBillingCity !== 'all') {
    filteredForChips = filteredForChips.filter(s => s.city === state.currentBillingCity);
  }

  filteredForChips.forEach(s => {
    const cat = s.category || 'כללי';
    catCounts[cat] = (catCounts[cat] || 0) + 1;
  });

  const categories = Object.keys(catCounts).sort((a, b) => catCounts[b] - catCounts[a]);

  billingCategoryChipsContainer.innerHTML = '';

  const allChip = document.createElement('button');
  const isAll = state.currentBillingCategory === 'all';
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
    const isSelected = state.currentBillingCategory === cat;
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

export function getFilteredBillingStores() {
  let result = state.allBillingStores;

  if (state.currentBillingCity !== 'all') {
    result = result.filter(s => s.city === state.currentBillingCity);
  }

  if (state.currentBillingCategory !== 'all') {
    result = result.filter(s => (s.category || 'כללי') === state.currentBillingCategory);
  }

  if (state.billingSearchQuery) {
    const queryNorm = normalizeHebrew(state.billingSearchQuery);
    const queryTerms = queryNorm.split(' ').filter(Boolean);

    if (queryTerms.length > 0) {
      const matches = [];
      const isSingle = queryTerms.length === 1;
      const inDesc = state.billingSearchInDesc;

      for (let i = 0; i < result.length; i++) {
        const s = result[i];
        const searchStr = inDesc ? (s._searchWithDescStr || '') : (s._searchStr || '');
        const isMatch = isSingle
          ? searchStr.includes(queryNorm)
          : queryTerms.every(term => searchStr.includes(term));

        if (isMatch) {
          const sName = s._nameNorm || '';
          s._score = sName === queryNorm ? 3 : (sName.startsWith(queryNorm) ? 2 : (sName.includes(queryNorm) ? 1 : 0));
          matches.push(s);
        }
      }

      result = matches;

      const sortMode = state.currentBillingSort;
      if (sortMode === 'discount-desc') {
        result.sort((a, b) => (b._score - a._score) || (b.discount - a.discount) || (a.name > b.name ? 1 : a.name < b.name ? -1 : 0));
      } else if (sortMode === 'discount-asc') {
        result.sort((a, b) => (b._score - a._score) || (a.discount - b.discount) || (a.name > b.name ? 1 : a.name < b.name ? -1 : 0));
      } else if (sortMode === 'name-asc') {
        result.sort((a, b) => (b._score - a._score) || (a.name > b.name ? 1 : a.name < b.name ? -1 : 0));
      } else if (sortMode === 'city-asc') {
        result.sort((a, b) => (b._score - a._score) || ((a.city || '') > (b.city || '') ? 1 : (a.city || '') < (b.city || '') ? -1 : 0) || (a.name > b.name ? 1 : a.name < b.name ? -1 : 0));
      } else {
        result.sort((a, b) => (b._score - a._score) || (b.discount - a.discount) || (a.name > b.name ? 1 : a.name < b.name ? -1 : 0));
      }

      return result;
    }
  }

  switch (state.currentBillingSort) {
    case 'discount-desc':
      result.sort((a, b) => b.discount - a.discount || (a.name > b.name ? 1 : a.name < b.name ? -1 : 0));
      break;
    case 'discount-asc':
      result.sort((a, b) => a.discount - b.discount || (a.name > b.name ? 1 : a.name < b.name ? -1 : 0));
      break;
    case 'name-asc':
      result.sort((a, b) => (a.name > b.name ? 1 : a.name < b.name ? -1 : 0));
      break;
    case 'city-asc':
      result.sort((a, b) => ((a.city || '') > (b.city || '') ? 1 : (a.city || '') < (b.city || '') ? -1 : 0) || (a.name > b.name ? 1 : a.name < b.name ? -1 : 0));
      break;
  }

  return result;
}

export function getBillingCategoryIcon(category) {
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

export function createBillingCardElement(store) {
  const card = document.createElement('div');
  card.className = 'billing-card bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-700/80 shadow-xs flex flex-col justify-between hover:border-purple-400 dark:hover:border-purple-500 cursor-pointer relative';
  card.dataset.billingId = store.id;

  const discountBadge = `
    <span class="badge-savings-purple text-white px-2.5 py-1 rounded-xl text-xs font-black shadow-xs">
      ${store.discount}% הנחה
    </span>
  `;

  const cityLabel = store.city === 'online' ? 'Online / אונליין' : store.city;

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

export function openBillingModal(store, elements, callbacks) {
  if (!store || !elements.billingModal) return;
  state.activeModalBillingStore = store;

  elements.billingModalTitle.textContent = store.name;
  elements.billingModalCategory.textContent = store.category || 'כללי';
  elements.billingModalCityBadge.textContent = store.city === 'online' ? 'Online / אונליין' : (store.city || 'סניפים');

  if (store.address) {
    elements.billingModalAddressWrapper.classList.remove('hidden');
    elements.billingModalAddress.textContent = store.address;
  } else {
    elements.billingModalAddressWrapper.classList.add('hidden');
  }

  elements.billingModalDiscount.textContent = `${store.discount}%`;
  elements.billingModalDescription.textContent = store.description || 'בית עסק המעניק הנחה קבועה במעמד החיוב למחזיקי כרטיס אשראי מועדון בהצדעה (Max).';
  const rawUrl = store.detail_url || `https://be-plus.co.il/product/${store.id}`;
  elements.billingModalOfficialLink.href = rawUrl.replace('/component/crm/product/', '/product/');

  elements.billingModalLogo.referrerPolicy = 'no-referrer';
  if (store.logo) {
    elements.billingModalLogo.src = store.logo;
    elements.billingModalLogo.onerror = () => {
      if (elements.billingModalLogo.src.includes('/icons/')) {
        elements.billingModalLogo.src = elements.billingModalLogo.src.replace('/icons/', '/images/');
      } else {
        elements.billingModalLogo.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="80">💳</text></svg>';
      }
    };
  } else {
    elements.billingModalLogo.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="80">💳</text></svg>';
  }

  if (store.linkedStore) {
    elements.billingModalLinkedStoreBanner.classList.remove('hidden');
    elements.billingModalLinkedStoreTitle.textContent = `רשת "${store.linkedStore.name}" מכבדת גם כרטיסים נטענים!`;
    if (elements.billingModalLinkedStoreMaxDisc) {
      elements.billingModalLinkedStoreMaxDisc.textContent = `עד ${store.linkedStore.max_discount}% הנחה`;
    }
    if (elements.billingModalCardsList) {
      elements.billingModalCardsList.innerHTML = (store.linkedStore.cards || []).map(c => `
        <div class="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-900/60 shadow-xs">
          <span class="font-medium text-slate-800 dark:text-slate-200">${c.card_name}${c.notes ? ` <span class="text-[11px] text-slate-400 font-normal">(${c.notes})</span>` : ''}</span>
          <span class="font-bold text-blue-700 dark:text-blue-300 text-sm">${c.discount}</span>
        </div>
      `).join('');
    }
    elements.billingModalViewStoreBtn.onclick = () => {
      closeBillingModal(elements.billingModal);
      if (callbacks && callbacks.onViewStore) callbacks.onViewStore(store.linkedStore);
    };
  } else {
    elements.billingModalLinkedStoreBanner.classList.add('hidden');
  }

  if (store.linkedDeals && store.linkedDeals.length > 0) {
    elements.billingModalLinkedDealBanner.classList.remove('hidden');
    elements.billingModalLinkedDealTitle.textContent = `לרשת זו קיים שובר/מבצע ייעודי פעיל (${store.linkedDeals.length})!`;
    if (elements.billingModalDealsList) {
      const topDeals = store.linkedDeals.slice(0, 3);
      const moreDealsCount = store.linkedDeals.length > 3 ? store.linkedDeals.length - 3 : 0;
      elements.billingModalDealsList.innerHTML = topDeals.map(d => `
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
    elements.billingModalViewDealBtn.onclick = () => {
      closeBillingModal(elements.billingModal);
      if (callbacks && callbacks.onViewDeal) callbacks.onViewDeal(dealQuery);
    };
  } else {
    elements.billingModalLinkedDealBanner.classList.add('hidden');
  }

  elements.billingModal.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

export function closeBillingModal(billingModal) {
  if (billingModal) billingModal.classList.add('hidden');
  state.activeModalBillingStore = null;
}
