import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storesData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'stores.json'), 'utf-8'));
const dealsData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'deals.json'), 'utf-8'));
const billingData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'billing_stores.json'), 'utf-8'));

import { state } from '../js/state.js';
import { getCoreBrand, crossLinkAllDatasets, loadStores, loadDeals, loadBilling } from '../js/data.js';

function setupState() {
  state.allStores = JSON.parse(JSON.stringify(storesData.stores));
  state.allDeals = JSON.parse(JSON.stringify(dealsData.deals));
  state.allBillingStores = JSON.parse(JSON.stringify(billingData.stores));
}

// Un-cached cross-linking for baseline measurement
function crossLinkBaseline() {
  setupState();

  // Baseline does not precompute coreBrand on stores
  const suppCoreMap = new Map();

  state.allDeals.forEach(deal => {
    const suppCore = getCoreBrand(deal.supplier);
    deal.linkedStore = state.allStores.find(s =>
      (deal.matched_store_id && s.id === deal.matched_store_id) ||
      (deal.matched_store_name && s.name === deal.matched_store_name) ||
      (suppCore && getCoreBrand(s.name) === suppCore)
    ) || null;
  });

  return state.allDeals.map(d => ({ dealId: d.id || d.title, storeId: d.linkedStore?.id }));
}

// Optimized cross-linking
function crossLinkOptimized() {
  setupState();

  // Precompute store.coreBrand
  state.allStores.forEach(s => {
    s.coreBrand = getCoreBrand(s.name);
  });

  state.allDeals.forEach(deal => {
    const suppCore = getCoreBrand(deal.supplier);
    deal.linkedStore = state.allStores.find(s =>
      (deal.matched_store_id && s.id === deal.matched_store_id) ||
      (deal.matched_store_name && s.name === deal.matched_store_name) ||
      (suppCore && s.coreBrand === suppCore)
    ) || null;
  });

  return state.allDeals.map(d => ({ dealId: d.id || d.title, storeId: d.linkedStore?.id }));
}

function runBenchmark() {
  console.log('====================================================');
  console.log('   ⚡ Cross-Link getCoreBrand Performance Benchmark ');
  console.log('====================================================');
  console.log(`Dataset size: ${storesData.stores.length} stores, ${dealsData.deals.length} deals`);

  // Warmup
  crossLinkBaseline();
  crossLinkOptimized();

  const ITERATIONS = 10;

  // Measure Baseline
  const t0 = performance.now();
  let baselineResults = null;
  for (let i = 0; i < ITERATIONS; i++) {
    baselineResults = crossLinkBaseline();
  }
  const baselineTime = (performance.now() - t0) / ITERATIONS;

  // Measure Optimized
  const t1 = performance.now();
  let optimizedResults = null;
  for (let i = 0; i < ITERATIONS; i++) {
    optimizedResults = crossLinkOptimized();
  }
  const optimizedTime = (performance.now() - t1) / ITERATIONS;

  // Verify correctness
  let mismatchCount = 0;
  for (let i = 0; i < baselineResults.length; i++) {
    if (baselineResults[i].storeId !== optimizedResults[i].storeId) {
      mismatchCount++;
    }
  }

  if (mismatchCount > 0) {
    console.error(`[FAIL] Verification error: ${mismatchCount} mismatches found between baseline and optimized results!`);
    process.exit(1);
  }

  const speedup = baselineTime / optimizedTime;
  const reduction = ((baselineTime - optimizedTime) / baselineTime) * 100;

  console.log('\n📊 RESULTS:');
  console.log(`  Baseline Time (un-cached):  ${baselineTime.toFixed(2)} ms / run`);
  console.log(`  Optimized Time (cached):    ${optimizedTime.toFixed(2)} ms / run`);
  console.log(`  Speedup:                    ${speedup.toFixed(2)}x faster`);
  console.log(`  Time Reduction:             ${reduction.toFixed(1)}% reduction`);
  console.log(`\n  ✅ Correctness verified: 100% match across all ${baselineResults.length} deals.`);
  console.log('====================================================\n');
}

runBenchmark();
