/**
 * Stores (Rechargeable Cards) Feature Module
 */

import { state } from './state.js';
import { normalizeHebrew } from './utils.js';

export function populateCardsFilter(cardFilterSelect) {
  if (!cardFilterSelect) return;
  cardFilterSelect.innerHTML = '<option value="all">כל הכרטיסים הנטענים</option>';
  state.availableCards.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.card_name;
    opt.textContent = `${c.card_name} (${c.store_count})`;
    cardFilterSelect.appendChild(opt);
  });
}

export function updateCategoryChips(categoryChipsContainer) {
  if (!categoryChipsContainer) return;
  const catCounts = {};
  let filteredForChips = state.allStores;
  if (state.currentCard !== 'all') {
    filteredForChips = filteredForChips.filter(s =>
      s.cards && s.cards.some(c => c.card_name === state.currentCard)
    );
  }

  filteredForChips.forEach(s => {
    const cat = s.category || 'כללי';
    catCounts[cat] = (catCounts[cat] || 0) + 1;
  });

  const categories = Object.keys(catCounts).sort((a, b) => catCounts[b] - catCounts[a]);

  categoryChipsContainer.innerHTML = '';

  const allChip = document.createElement('button');
  const isAll = state.currentCategory === 'all';
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
    const isSelected = state.currentCategory === cat;
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

export function getFilteredStores() {
  let result = state.allStores;

  if (state.currentCard !== 'all') {
    result = result.filter(s =>
      s.cards && s.cards.some(c => c.card_name === state.currentCard)
    );
  }

  if (state.currentCategory !== 'all') {
    result = result.filter(s => (s.category || 'כללי') === state.currentCategory);
  }

  if (state.searchQuery) {
    const queryNorm = normalizeHebrew(state.searchQuery);
    const queryTerms = queryNorm.split(' ').filter(Boolean);

    if (queryTerms.length > 0) {
      const matches = [];
      const isSingle = queryTerms.length === 1;

      for (let i = 0; i < result.length; i++) {
        const store = result[i];
        const searchStr = store._searchStr || '';
        let isMatch = isSingle
          ? searchStr.includes(queryNorm)
          : queryTerms.every(term => searchStr.includes(term));

        if (!isMatch && state.storesSearchInDesc) {
          const descStr = store._searchWithDescStr || '';
          if (isSingle ? descStr.includes(queryNorm) : queryTerms.every(term => descStr.includes(term))) {
            isMatch = true;
          } else if (store.linkedBillingStore && store.linkedBillingStore._descNorm) {
            const bDesc = store.linkedBillingStore._descNorm;
            if (isSingle ? bDesc.includes(queryNorm) : queryTerms.every(term => bDesc.includes(term))) {
              isMatch = true;
            }
          } else if (store.linkedDeals && store.linkedDeals.length > 0) {
            isMatch = store.linkedDeals.some(d => {
              const dDesc = d._descNorm || '';
              const dTerms = d._termsNorm || '';
              return isSingle
                ? (dDesc.includes(queryNorm) || dTerms.includes(queryNorm))
                : (queryTerms.every(term => dDesc.includes(term)) || queryTerms.every(term => dTerms.includes(term)));
            });
          }
        }

        if (isMatch) {
          const sName = store._nameNorm || '';
          store._score = sName === queryNorm ? 3 : (sName.startsWith(queryNorm) ? 2 : (sName.includes(queryNorm) ? 1 : 0));
          matches.push(store);
        }
      }

      result = matches;
      result.sort((a, b) => b._score - a._score);
    }
  }

  switch (state.currentSort) {
    case 'discount-desc':
      result.sort((a, b) => (b.max_discount || 0) - (a.max_discount || 0) || (a.name > b.name ? 1 : a.name < b.name ? -1 : 0));
      break;
    case 'name-asc':
      result.sort((a, b) => (a.name > b.name ? 1 : a.name < b.name ? -1 : 0));
      break;
    case 'cards-desc':
      result.sort((a, b) => ((b.cards && b.cards.length) || 0) - ((a.cards && a.cards.length) || 0) || (b.max_discount || 0) - (a.max_discount || 0));
      break;
  }

  return result;
}

export function createStoreCardElement(store) {
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

export function createStoreTableRow(store) {
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

export function openStoreModal(store, elements, callbacks) {
  if (!store || !elements.storeModal) return;
  state.activeModalStore = store;

  elements.modalTitle.textContent = store.name;
  elements.modalCategory.textContent = store.category || 'כללי';
  elements.modalLogo.src = store.logo || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="80">🛍️</text></svg>';
  elements.modalLogo.onerror = () => { elements.modalLogo.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="80">🛍️</text></svg>'; };

  if (store.website) {
    elements.modalWebsiteLink.href = store.website;
    elements.modalWebsiteLink.classList.remove('hidden');
  } else {
    elements.modalWebsiteLink.classList.add('hidden');
  }

  if (store.linkedDeals && store.linkedDeals.length > 0) {
    elements.modalLinkedDealBanner.classList.remove('hidden');
    elements.modalViewDealBtn.onclick = () => {
      closeStoreModal(elements.storeModal);
      if (callbacks && callbacks.onViewDeal) callbacks.onViewDeal(store);
    };
  } else {
    elements.modalLinkedDealBanner.classList.add('hidden');
  }

  if (store.linkedBillingStore && elements.modalLinkedBillingBanner) {
    elements.modalLinkedBillingBanner.classList.remove('hidden');
    if (elements.modalLinkedBillingTitle) {
      elements.modalLinkedBillingTitle.textContent = `לרשת זו קיימת גם הנחה של ${store.linkedBillingStore.discount}% במעמד החיוב!`;
    }
    if (elements.modalViewBillingBtn) {
      elements.modalViewBillingBtn.onclick = () => {
        closeStoreModal(elements.storeModal);
        if (callbacks && callbacks.onViewBilling) callbacks.onViewBilling(store);
      };
    }
  } else if (elements.modalLinkedBillingBanner) {
    elements.modalLinkedBillingBanner.classList.add('hidden');
  }

  elements.modalCardsList.innerHTML = (store.cards || []).map(c => `
    <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60">
      <div>
        <div class="font-medium text-slate-800 dark:text-slate-200 text-xs">${c.card_name}</div>
        ${c.notes ? `<div class="text-[11px] text-slate-400 mt-0.5">${c.notes}</div>` : ''}
      </div>
      <div class="font-bold text-amber-600 dark:text-amber-400 text-sm">${c.discount}</div>
    </div>
  `).join('');

  elements.modalConditions.textContent = store.conditions || 'לא צוינו תנאים מיוחדים מעבר לתקנון הכללי של המועדון.';
  elements.storeModal.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

export function closeStoreModal(storeModal) {
  if (storeModal) storeModal.classList.add('hidden');
  state.activeModalStore = null;
}
