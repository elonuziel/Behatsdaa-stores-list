/**
 * Data Loading & Cross-Linking Module
 */

import { state } from './state.js';
import { normalizeHebrew } from './utils.js';

export function crossLinkAllDatasets() {
  if (!state.allStores.length) return;

  const cleanKey = (str) => (str || '').toLowerCase().replace(/[^א-תa-z0-9]/g, '');

  function getCoreBrand(name) {
    if (!name) return '';
    let s = (name || '').toLowerCase();
    s = s.replace(/\b(אונליין|online|רשת|אתר|סניף|סניפי|בע"מ|בעמ|בע'מ|ltd|ישראל|israel|shop|store)\b/gi, ' ');
    s = s.replace(/ם/g, 'מ').replace(/ן/g, 'נ').replace(/ץ/g, 'צ').replace(/ף/g, 'פ').replace(/ך/g, 'כ');
    return cleanKey(s);
  }

  // 1. Map: core brand -> array of billing stores
  const billingByCore = new Map();
  state.allBillingStores.forEach(b => {
    const core = getCoreBrand(b.name);
    if (!core) return;
    if (!billingByCore.has(core)) billingByCore.set(core, []);
    billingByCore.get(core).push(b);
  });

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
  state.allStores.forEach(s => {
    const core = getCoreBrand(s.name);
    if (core && !storeByCore.has(core)) storeByCore.set(core, s);
  });

  // 3. Map: core brand -> deals (Tab 2)
  const dealsByCore = new Map();
  state.allDeals.forEach(d => {
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

  function findCompatibleStore(b) {
    if (!b || !b.name) return null;
    const bCore = getCoreBrand(b.name);
    if (bCore && storeByCore.has(bCore)) return storeByCore.get(bCore);

    if (b.name.includes(' - ') || b.name.includes(' – ')) {
      const parts = b.name.split(/[–\-]/);
      const leftCore = getCoreBrand(parts[0]);
      if (leftCore && storeByCore.has(leftCore)) {
        return storeByCore.get(leftCore);
      }
    }

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

  // Cross-link Billing Stores (Tab 3)
  const storeToBillingMatches = new Map();
  state.allBillingStores.forEach(b => {
    const bCore = getCoreBrand(b.name);
    b.linkedStore = findCompatibleStore(b);

    if (b.linkedStore) {
      if (!storeToBillingMatches.has(b.linkedStore.id)) {
        storeToBillingMatches.set(b.linkedStore.id, []);
      }
      storeToBillingMatches.get(b.linkedStore.id).push(b);
    }

    const deals = [];
    const d1 = dealsByCore.get(bCore) || [];
    d1.forEach(d => { if (!deals.includes(d)) deals.push(d); });
    if (b.linkedStore && b.linkedStore.linkedDeals) {
      b.linkedStore.linkedDeals.forEach(d => { if (!deals.includes(d)) deals.push(d); });
    }
    b.linkedDeals = deals;
  });

  // Cross-link Stores (Tab 1)
  state.allStores.forEach(store => {
    const sCore = getCoreBrand(store.name);
    store.linkedDeals = state.allDeals.filter(d => {
      if (d.matched_store_id && d.matched_store_id === store.id) return true;
      if (d.matched_store_name && d.matched_store_name === store.name) return true;
      const suppCore = getCoreBrand(d.supplier);
      return Boolean(suppCore && sCore && suppCore === sCore);
    });

    let bestBilling = findBestBillingMatch(store.name);
    const branchBillings = storeToBillingMatches.get(store.id);
    if (branchBillings && branchBillings.length > 0) {
      const bestBranch = branchBillings.reduce((best, cur) => (cur.discount > best.discount ? cur : best), branchBillings[0]);
      if (!bestBilling || bestBranch.discount > bestBilling.discount) {
        bestBilling = bestBranch;
      }
    }
    store.linkedBillingStore = bestBilling;

    if (branchBillings && branchBillings.length > 0 && store.linkedDeals.length > 0) {
      branchBillings.forEach(b => {
        store.linkedDeals.forEach(d => {
          if (!b.linkedDeals.includes(d)) b.linkedDeals.push(d);
        });
      });
    }
  });

  // Cross-link Deals (Tab 2)
  state.allDeals.forEach(deal => {
    const suppCore = getCoreBrand(deal.supplier);
    deal.linkedStore = state.allStores.find(s =>
      (deal.matched_store_id && s.id === deal.matched_store_id) ||
      (deal.matched_store_name && s.name === deal.matched_store_name) ||
      (suppCore && getCoreBrand(s.name) === suppCore)
    ) || null;

    let bestBilling = findBestBillingMatch(deal.supplier);
    if (!bestBilling && deal.linkedStore && deal.linkedStore.linkedBillingStore) {
      bestBilling = deal.linkedStore.linkedBillingStore;
    }
    deal.linkedBillingStore = bestBilling;
  });
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
    s._searchStr = `${s._nameNorm} ${s._cityNorm} ${s._catNorm} ${s._addressNorm}`.trim();
    s._searchWithDescStr = `${s._searchStr} ${s._descNorm}`.trim();
  });
  state.billingLoaded = true;

  if (onBillingLoaded) onBillingLoaded();
}
