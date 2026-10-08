/**
 * Data Loading & Cross-Linking Module
 */

import { state } from './state.js';
import { normalizeHebrew } from './utils.js';
import { initStoresSearch, initDealsSearch, initBillingSearch } from './search.js';

// In-Memory LRU Caches for on-demand dynamic details
const storeDetailCache = new Map();
const dealDetailCache = new Map();

export let getCoreBrandCallCount = 0;
export function resetGetCoreBrandCallCount() {
  getCoreBrandCallCount = 0;
}

/**
 * Normalizes brand and supplier names for cross-linking
 */
export function getCoreBrand(name) {
  getCoreBrandCallCount++;
  if (!name) return '';
  let s = (name || '').toLowerCase();
  s = s.replace(/\b(אונליין|online|רשת|אתר|סניף|סניפי|בע"מ|בעמ|בע'מ|ltd|ישראל|israel|shop|store)\b/gi, ' ');
  s = s.replace(/ם/g, 'מ').replace(/ן/g, 'נ').replace(/ץ/g, 'צ').replace(/ף/g, 'פ').replace(/ך/g, 'כ');
  return (s || '').toLowerCase().replace(/[^א-תa-z0-9]/g, '');
}

/**
 * On-demand dynamic fetcher for dedicated [slug].json store files
 */
export async function fetchStoreDetail(slugOrId) {
  if (!slugOrId) return null;
  const key = String(slugOrId);
  if (storeDetailCache.has(key)) {
    return storeDetailCache.get(key);
  }

  const storeObj = state.allStores.find(s => s.id === slugOrId || s.slug === slugOrId);
  const slug = storeObj?.slug || slugOrId;

  try {
    const res = await fetch(`data/stores/${encodeURIComponent(slug)}.json`);
    if (res.ok) {
      const data = await res.json();
      storeDetailCache.set(key, data);
      storeDetailCache.set(String(data.id), data);
      storeDetailCache.set(String(data.slug), data);
      return data;
    }
  } catch (err) {
    console.warn(`Dynamic fetch failed for store ${slug}, fallback to memory:`, err);
  }

  if (storeObj) {
    storeDetailCache.set(key, storeObj);
    return storeObj;
  }
  return null;
}

/**
 * On-demand dynamic fetcher for dedicated [id].json deal files
 */
export async function fetchDealDetail(id) {
  if (!id) return null;
  const key = String(id);
  if (dealDetailCache.has(key)) {
    return dealDetailCache.get(key);
  }

  try {
    const res = await fetch(`data/deals/${encodeURIComponent(key)}.json`);
    if (res.ok) {
      const data = await res.json();
      dealDetailCache.set(key, data);
      return data;
    }
  } catch (err) {
    console.warn(`Dynamic fetch failed for deal ${id}, fallback to memory:`, err);
  }

  const dealObj = state.allDeals.find(d => String(d.id) === key);
  if (dealObj) {
    dealDetailCache.set(key, dealObj);
    return dealObj;
  }
  return null;
}

let walletsInfoCache = null;

export async function fetchWalletsInfo() {
  if (walletsInfoCache) return walletsInfoCache;
  try {
    const res = await fetch('data/wallets_info.json');
    if (res.ok) {
      walletsInfoCache = await res.json();
      state.walletsInfo = walletsInfoCache;
      return walletsInfoCache;
    }
  } catch (err) {
    console.warn('Dynamic fetch failed for wallets_info.json:', err);
  }
  return null;
}

export async function loadSearchIndex() {
  try {
    const res = await fetch('data/search-index.json');
    if (!res.ok) throw new Error('Failed to load search-index.json');
    state.searchIndexData = await res.json();
    return state.searchIndexData;
  } catch (err) {
    console.warn('search-index fallback:', err);
    return null;
  }
}

let crossLinkedWithDeals = false;
let crossLinkedWithBilling = false;

export function resetCrossLinkState() {
  crossLinkedWithDeals = false;
  crossLinkedWithBilling = false;
}

/**
 * Cross-links stores, deals, and billing datasets using cached core brand values
 */
export function crossLinkAllDatasets() {
  if (!state.allStores || !state.allStores.length) return;
  const hasDeals = state.allDeals && state.allDeals.length > 0;
  const hasBilling = state.allBillingStores && state.allBillingStores.length > 0;

  if ((!hasDeals || crossLinkedWithDeals) && (!hasBilling || crossLinkedWithBilling)) {
    return;
  }

  // Pre-calculate / cache deal supplier core brand once before the double loop
  if (hasDeals) {
    state.allDeals.forEach(d => {
      if (d._suppCore === undefined) {
        d._suppCore = getCoreBrand(d.supplier);
      }
    });
  }

  // Cross-link Stores (Tab 1)
  state.allStores.forEach(store => {
    const sCore = store._coreBrand || (store._coreBrand = getCoreBrand(store.name));
    store.linkedDeals = state.allDeals.filter(d => {
      if (d.matched_store_id && d.matched_store_id === store.id) return true;
      if (d.matched_store_name && d.matched_store_name === store.name) return true;
      const suppCore = d._suppCore;
      return Boolean(suppCore && sCore && suppCore === sCore);
    });
  });

  if (hasDeals) crossLinkedWithDeals = true;
  if (hasBilling) crossLinkedWithBilling = true;
}

export async function loadStores(onStoresLoaded) {
  try {
    const response = await fetch('data/stores.json');
    if (!response.ok) throw new Error('Failed to load stores.json');
    state.storeData = await response.json();
  } catch (err) {
    console.warn('Stores fallback:', err);
    state.storeData = { metadata: { total_stores: 0, available_cards: [] }, stores: [] };
  }

  state.allStores = state.storeData.stores || [];
  state.allStores.forEach(s => {
    s._nameNorm = normalizeHebrew(s.name || '');
    s._catNorm = normalizeHebrew(s.category || '');
    s._condNorm = normalizeHebrew(s.conditions || '');
    s._cardsNorm = (s.cards || []).map(c => `${normalizeHebrew(c.card_name)} ${normalizeHebrew(c.discount)} ${normalizeHebrew(c.notes || '')}`).join(' ');
    s._searchStr = `${s._nameNorm} ${s._catNorm} ${s._cardsNorm}`.trim();
    s._searchWithDescStr = `${s._searchStr} ${s._condNorm}`.trim();
  });
  state.availableCards = state.storeData.metadata?.available_cards || [];
  state.storesLoaded = true;

  try {
    initStoresSearch(state.allStores);
  } catch (err) {
    console.warn('MiniSearch stores init:', err);
  }

  if (onStoresLoaded) onStoresLoaded();
}

export async function loadDeals(onDealsLoaded) {
  try {
    const dResponse = await fetch('data/deals.json');
    if (!dResponse.ok) throw new Error('Failed to load deals.json');
    state.dealsData = await dResponse.json();
  } catch (err) {
    console.warn('Deals fallback:', err);
    state.dealsData = { metadata: { total_deals: 0, tags: [], categories: [] }, deals: [] };
  }

  state.allDeals = state.dealsData.deals || [];
  state.allDeals.forEach(d => {
    d._titleNorm = normalizeHebrew(d.title || '');
    d._suppNorm = normalizeHebrew(d.supplier || '');
    d._catNorm = normalizeHebrew(d.category || '');
    d._tagsNorm = normalizeHebrew((d.tags || []).join(' '));
    d._descNorm = normalizeHebrew(d.description || '');
    d._termsNorm = normalizeHebrew(d.terms_of_use || '');
    d._searchStr = `${d._titleNorm} ${d._suppNorm} ${d._catNorm} ${d._tagsNorm}`.trim();
    d._searchWithDescStr = `${d._searchStr} ${d._descNorm} ${d._termsNorm}`.trim();
  });
  state.availableTags = state.dealsData.metadata?.tags || [];
  state.dealsLoaded = true;

  try {
    initDealsSearch(state.allDeals);
  } catch (err) {
    console.warn('MiniSearch deals init:', err);
  }

  if (onDealsLoaded) onDealsLoaded();
}

export async function loadBilling(onBillingLoaded) {
  try {
    const bResponse = await fetch('data/billing_stores.json');
    if (!bResponse.ok) throw new Error('Failed to load billing_stores.json');
    state.billingData = await bResponse.json();
  } catch (err) {
    console.warn('Billing fallback:', err);
    state.billingData = { metadata: { total_stores: 0 }, stores: [] };
  }

  state.allBillingStores = state.billingData.stores || [];
  state.allBillingStores.forEach(s => {
    s._nameNorm = normalizeHebrew(s.name || '');
    s._cityNorm = normalizeHebrew(s.city || '');
    s._catNorm = normalizeHebrew(`${s.category || ''} ${s.subcategory || ''}`);
    s._addressNorm = normalizeHebrew(s.address || '');
    s._descNorm = normalizeHebrew(s.description || '');
    s._searchStr = `${s._nameNorm} ${s._cityNorm} ${s._catNorm}`.trim();
    s._searchWithDescStr = `${s._searchStr} ${s._addressNorm} ${s._descNorm}`.trim();
  });
  state.billingLoaded = true;

  try {
    initBillingSearch(state.allBillingStores);
  } catch (err) {
    console.warn('MiniSearch billing init:', err);
  }

  if (onBillingLoaded) onBillingLoaded();
}
