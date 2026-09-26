const fs = require('fs');
const path = require('path');
const JSDOM = require('jsdom').JSDOM;

const htmlSource = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf-8');
const storesData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'stores.json'), 'utf-8'));
const dealsData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'deals.json'), 'utf-8'));
const billingData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'billing_stores.json'), 'utf-8'));

async function setupEnv() {
  const dom = new JSDOM(htmlSource, {
    url: 'https://elonuziel.github.io/stores-list/',
    runScripts: 'dangerously'
  });
  const { window } = dom;
  global.window = window;
  global.document = window.document;
  global.localStorage = window.localStorage;
  global.navigator = window.navigator;
  window.lucide = { createIcons: () => {} };
  global.lucide = window.lucide;
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener: () => {}, removeListener: () => {} }));
  global.matchMedia = window.matchMedia;

  const mockFetch = async (url) => {
    if (url.includes('billing_stores.json')) return { ok: true, json: async () => JSON.parse(JSON.stringify(billingData)) };
    if (url.includes('stores.json')) return { ok: true, json: async () => JSON.parse(JSON.stringify(storesData)) };
    if (url.includes('deals.json')) return { ok: true, json: async () => JSON.parse(JSON.stringify(dealsData)) };
    return { ok: false, status: 404 };
  };
  window.fetch = mockFetch;
  global.fetch = mockFetch;

  const ROOT_DIR = path.resolve(__dirname, '..');
  await import('file://' + path.join(ROOT_DIR, 'app.js'));
  await new Promise(r => setTimeout(r, 250));

  const stateModule = await import('file://' + path.join(ROOT_DIR, 'js', 'state.js'));
  const storesModule = await import('file://' + path.join(ROOT_DIR, 'js', 'stores.js'));
  const dealsModule = await import('file://' + path.join(ROOT_DIR, 'js', 'deals.js'));
  const billingModule = await import('file://' + path.join(ROOT_DIR, 'js', 'billing.js'));

  return {
    state: stateModule.state,
    getFilteredStores: storesModule.getFilteredStores,
    getFilteredDeals: dealsModule.getFilteredDeals,
    getFilteredBillingStores: billingModule.getFilteredBillingStores
  };
}

async function runBenchmark() {
  const { state, getFilteredStores, getFilteredDeals, getFilteredBillingStores } = await setupEnv();

  const searchQueries = ['פיצה', 'סושי תל אביב', 'אהבה', 'בורגרים', 'רשת ביג ספורט'];
  const iterations = 2000;

  console.log(`Running benchmark with ${iterations} iterations per search query...`);

  // Benchmark Stores
  const startStores = performance.now();
  for (let i = 0; i < iterations; i++) {
    for (const q of searchQueries) {
      state.searchQuery = q;
      state.storesSearchInDesc = i % 2 === 0;
      getFilteredStores();
    }
  }
  const endStores = performance.now();
  const storesTime = endStores - startStores;

  // Benchmark Deals
  const startDeals = performance.now();
  for (let i = 0; i < iterations; i++) {
    for (const q of searchQueries) {
      state.dealsSearchQuery = q;
      state.dealsSearchInDesc = i % 2 === 0;
      getFilteredDeals();
    }
  }
  const endDeals = performance.now();
  const dealsTime = endDeals - startDeals;

  // Benchmark Billing
  const startBilling = performance.now();
  for (let i = 0; i < iterations; i++) {
    for (const q of searchQueries) {
      state.billingSearchQuery = q;
      state.billingSearchInDesc = i % 2 === 0;
      getFilteredBillingStores();
    }
  }
  const endBilling = performance.now();
  const billingTime = endBilling - startBilling;

  const totalTime = storesTime + dealsTime + billingTime;
  const totalOps = iterations * searchQueries.length * 3;

  console.log('\n--- BENCHMARK RESULTS ---');
  console.log(`Stores Filter Time: ${storesTime.toFixed(2)} ms`);
  console.log(`Deals Filter Time: ${dealsTime.toFixed(2)} ms`);
  console.log(`Billing Filter Time: ${billingTime.toFixed(2)} ms`);
  console.log(`Total Time: ${totalTime.toFixed(2)} ms`);
  console.log(`Ops/sec: ${((totalOps / totalTime) * 1000).toFixed(2)}`);
  console.log('-------------------------\n');
}

runBenchmark().catch(console.error);
