import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { performance } from 'perf_hooks';
import { state } from '../js/state.js';
import {
  getCoreBrand,
  crossLinkAllDatasets,
  resetCrossLinkState,
  getCoreBrandCallCount,
  resetGetCoreBrandCallCount
} from '../js/data.js';

console.log("⚡ Starting UI & Data Cross-Linking Performance & Correctness Tests...\n");

// Load dataset files
const storesJson = JSON.parse(fs.readFileSync(path.resolve('data/stores.json'), 'utf8'));
const dealsJson = JSON.parse(fs.readFileSync(path.resolve('data/deals.json'), 'utf8'));

// Helper to deep clone datasets for identical baseline comparison
function getFreshDatasets() {
  return {
    stores: JSON.parse(JSON.stringify(storesJson.stores || [])),
    deals: JSON.parse(JSON.stringify(dealsJson.deals || []))
  };
}

// ----------------------------------------------------
// 1. Baseline Implementation (Un-cached inner loop)
// ----------------------------------------------------
function crossLinkBaseline(allStores, allDeals) {
  allStores.forEach(store => {
    const sCore = getCoreBrand(store.name);
    store.linkedDeals = allDeals.filter(d => {
      if (d.matched_store_id && d.matched_store_id === store.id) return true;
      if (d.matched_store_name && d.matched_store_name === store.name) return true;
      const suppCore = getCoreBrand(d.supplier);
      return Boolean(suppCore && sCore && suppCore === sCore);
    });
  });
}

// Measure Baseline
const baselineData = getFreshDatasets();
resetGetCoreBrandCallCount();
const startBase = performance.now();
crossLinkBaseline(baselineData.stores, baselineData.deals);
const durationBase = performance.now() - startBase;
const callsBase = getCoreBrandCallCount;

console.log(`📊 [Baseline Implementation]`);
console.log(`   ⏱️  Execution Time: ${durationBase.toFixed(3)} ms`);
console.log(`   🔢 getCoreBrand Calls: ${callsBase.toLocaleString()}`);

// ----------------------------------------------------
// 2. Optimized Implementation (`js/data.js`)
// ----------------------------------------------------
const optData = getFreshDatasets();
state.allStores = optData.stores;
state.allDeals = optData.deals;

resetCrossLinkState();
resetGetCoreBrandCallCount();
const startOpt = performance.now();
crossLinkAllDatasets();
const durationOpt = performance.now() - startOpt;
const callsOpt = getCoreBrandCallCount;

console.log(`\n⚡ [Optimized Implementation]`);
console.log(`   ⏱️  Execution Time: ${durationOpt.toFixed(3)} ms`);
console.log(`   🔢 getCoreBrand Calls: ${callsOpt.toLocaleString()}`);

// ----------------------------------------------------
// 3. Verification & Metrics
// ----------------------------------------------------
const speedup = durationBase / durationOpt;
const callReduction = ((callsBase - callsOpt) / callsBase) * 100;

console.log(`\n🚀 [Performance Results]`);
console.log(`   📈 Speedup Factor: ${speedup.toFixed(2)}x faster`);
console.log(`   🔥 Call Reduction: ${callReduction.toFixed(2)}% fewer getCoreBrand calls`);

// Correctness Verification
console.log(`\n🔍 [Correctness Verification]`);
assert.strictEqual(baselineData.stores.length, state.allStores.length, "Store counts must match");

let totalMatchedStores = 0;
let totalLinkedDeals = 0;

for (let i = 0; i < baselineData.stores.length; i++) {
  const bStore = baselineData.stores[i];
  const oStore = state.allStores[i];

  assert.strictEqual(bStore.id, oStore.id, `Store ID mismatch at index ${i}`);
  assert.strictEqual(
    (bStore.linkedDeals || []).length,
    (oStore.linkedDeals || []).length,
    `Linked deal count mismatch for store ${oStore.name} (${oStore.id})`
  );

  const bDealIds = (bStore.linkedDeals || []).map(d => d.id).sort();
  const oDealIds = (oStore.linkedDeals || []).map(d => d.id).sort();
  assert.deepStrictEqual(bDealIds, oDealIds, `Linked deal IDs mismatch for store ${oStore.name}`);

  if (oStore.linkedDeals && oStore.linkedDeals.length > 0) {
    totalMatchedStores++;
    totalLinkedDeals += oStore.linkedDeals.length;
  }
}

console.log(`   ✅ All ${state.allStores.length} stores checked.`);
console.log(`   ✅ Correctness verified: 100% match between baseline and optimized results.`);
console.log(`   🔗 Stores with Linked Deals: ${totalMatchedStores}`);
console.log(`   🎁 Total Store-Deal Links: ${totalLinkedDeals}`);

console.log("\n🎉 All UI and performance verification tests passed successfully!");
