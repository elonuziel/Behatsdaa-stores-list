/**
 * Deals & Vouchers Feature Module
 */

import { state } from './state.js';
import { normalizeHebrew, formatILS } from './utils.js';

export function populateDealsTagsFilter(dealsTagSelect) {
  if (!dealsTagSelect) return;
  dealsTagSelect.innerHTML = '<option value="all">כל המבצעים והקמפיינים</option>';
  state.availableTags.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    dealsTagSelect.appendChild(opt);
  });
}

export function updateDealsCategoryChips(dealsCategoryChipsContainer) {
  if (!dealsCategoryChipsContainer) return;
  const catCounts = {};
  state.allDeals.forEach(d => {
    const cat = d.category || 'כללי';
    catCounts[cat] = (catCounts[cat] || 0) + 1;
  });

  const categories = Object.keys(catCounts).sort((a, b) => catCounts[b] - catCounts[a]);

  dealsCategoryChipsContainer.innerHTML = '';

  const allChip = document.createElement('button');
  const isAll = state.currentDealCategory === 'all';
  allChip.className = `deal-category-chip px-3.5 py-1.5 rounded-full font-medium transition text-xs flex items-center gap-1.5 whitespace-nowrap ${
    isAll
      ? 'bg-emerald-600 text-white shadow-xs'
      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300'
  }`;
  allChip.dataset.category = 'all';
  allChip.innerHTML = `
    <span>הכל</span>
    <span class="deal-category-count ${isAll ? 'bg-emerald-700 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'} text-[10px] px-1.5 py-0.2 rounded-full">
      ${state.allDeals.length}
    </span>
  `;
  dealsCategoryChipsContainer.appendChild(allChip);

  categories.forEach(cat => {
    const isSelected = state.currentDealCategory === cat;
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

export function getFilteredDeals() {
  let result = state.allDeals;

  if (state.currentDealTag !== 'all') {
    result = result.filter(d => d.tags && d.tags.includes(state.currentDealTag));
  }

  if (state.currentDealCategory !== 'all') {
    result = result.filter(d => (d.category || 'כללי') === state.currentDealCategory);
  }

  if (state.currentDealMaxPrice !== 'all') {
    if (state.currentDealMaxPrice === 'over-500') {
      result = result.filter(d => (d.price || 0) > 500);
    } else {
      const maxVal = parseFloat(state.currentDealMaxPrice);
      result = result.filter(d => (d.price || 0) <= maxVal);
    }
  }

  if (state.dealsSearchQuery) {
    const queryNorm = normalizeHebrew(state.dealsSearchQuery);
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
      if (state.dealsSearchInDesc) {
        const descNorm = d._descNorm || normalizeHebrew(d.description || '');
        const termsNorm = d._termsNorm || normalizeHebrew(d.terms_of_use || '');
        return descNorm.includes(queryNorm) || termsNorm.includes(queryNorm);
      }
      return false;
    });

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

  switch (state.currentDealSort) {
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

export function createDealCardElement(deal) {
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

  const matchedStore = deal.linkedStore || state.allStores.find(s =>
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

export function openDealModal(deal, elements, callbacks) {
  if (!deal || !elements.dealModal) return;

  elements.dealModalTitle.textContent = deal.title;
  elements.dealModalSupplier.textContent = deal.supplier || 'בהצדעה';
  elements.dealModalCategory.textContent = deal.category || 'כללי';

  if (deal.tags && deal.tags.length > 0) {
    elements.dealModalTag.textContent = deal.tags[0];
    elements.dealModalTag.classList.remove('hidden');
  } else {
    elements.dealModalTag.classList.add('hidden');
  }

  elements.dealModalImg.src = deal.image || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="80">🎁</text></svg>';
  elements.dealModalImg.onerror = () => { elements.dealModalImg.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="80">🎁</text></svg>'; };

  if (deal.is_external) {
    elements.dealModalPriceLabel.textContent = 'מבצע שותף בהצדעה:';
    elements.dealModalPrice.textContent = 'הנחה באתר השותף';
    elements.dealModalOrigPrice.textContent = '';
    elements.dealModalSavingsBadge.classList.add('hidden');
  } else {
    elements.dealModalPriceLabel.textContent = 'מחיר מועדון בהצדעה:';
    elements.dealModalPrice.textContent = formatILS(deal.price);
    if (deal.original_price && deal.original_price > deal.price) {
      elements.dealModalOrigPrice.textContent = formatILS(deal.original_price);
      elements.dealModalSavingsBadge.classList.remove('hidden');
      elements.dealModalSavingsText.textContent = `${deal.discount_percent}% חיסכון`;
    } else {
      elements.dealModalOrigPrice.textContent = '';
      elements.dealModalSavingsBadge.classList.add('hidden');
    }
  }

  const matchedStore = deal.linkedStore || state.allStores.find(s =>
    (deal.matched_store_id && s.id === deal.matched_store_id) ||
    (deal.matched_store_name && s.name === deal.matched_store_name) ||
    normalizeHebrew(s.name) === normalizeHebrew(deal.supplier)
  );

  if (matchedStore) {
    elements.dealModalLinkedStoreBanner.classList.remove('hidden');
    elements.dealModalLinkedStoreTitle.textContent = `רשת "${matchedStore.name}" מכבדת גם כרטיסים נטענים (עד ${matchedStore.max_discount}% הנחה)!`;
    elements.dealModalViewStoreBtn.onclick = () => {
      closeDealModal(elements.dealModal);
      if (callbacks && callbacks.onViewStore) callbacks.onViewStore(matchedStore);
    };
  } else {
    elements.dealModalLinkedStoreBanner.classList.add('hidden');
  }

  if (deal.linkedBillingStore && elements.dealModalLinkedBillingBanner) {
    elements.dealModalLinkedBillingBanner.classList.remove('hidden');
    if (elements.dealModalLinkedBillingTitle) {
      elements.dealModalLinkedBillingTitle.textContent = `לספק "${deal.supplier}" קיימת גם הנחה של ${deal.linkedBillingStore.discount}% במעמד החיוב!`;
    }
    if (elements.dealModalViewBillingBtn) {
      elements.dealModalViewBillingBtn.onclick = () => {
        closeDealModal(elements.dealModal);
        if (callbacks && callbacks.onViewBilling) callbacks.onViewBilling(deal);
      };
    }
  } else if (elements.dealModalLinkedBillingBanner) {
    elements.dealModalLinkedBillingBanner.classList.add('hidden');
  }

  if (deal.variants && deal.variants.length > 1) {
    elements.dealModalVariantsSection.classList.remove('hidden');
    elements.dealModalVariantsList.innerHTML = deal.variants.map(v => `
      <div class="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60">
        <span class="text-slate-800 dark:text-slate-200 font-medium">${v.name}</span>
        <div class="flex items-center gap-2">
          ${v.original_price > v.price ? `<span class="line-through text-slate-400 text-[11px]">${formatILS(v.original_price)}</span>` : ''}
          <span class="font-bold text-emerald-600 dark:text-emerald-400">${formatILS(v.price)}</span>
        </div>
      </div>
    `).join('');
  } else {
    elements.dealModalVariantsSection.classList.add('hidden');
  }

  elements.dealModalDescription.textContent = deal.description || 'ללא תיאור נוסף.';
  elements.dealModalTerms.textContent = deal.terms_of_use || 'תקף בהתאם לתקנון מועדון בהצדעה.';
  elements.dealModalLocations.textContent = deal.shipping_included ? 'כולל משלוח עד הבית' : (deal.locations || 'מגוון סניפים');
  elements.dealModalExpiration.textContent = deal.expiration_date || 'עד גמר המלאי';

  if (deal.limits) {
    elements.dealModalLimits.textContent = deal.limits;
    elements.dealModalLimitsWrapper.classList.remove('hidden');
  } else {
    elements.dealModalLimitsWrapper.classList.add('hidden');
  }

  elements.dealModalBuyLink.href = deal.url || `https://www.behatsdaa.org.il/category/productPage/${deal.id}`;
  elements.dealModal.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

export function closeDealModal(dealModal) {
  if (dealModal) dealModal.classList.add('hidden');
}
