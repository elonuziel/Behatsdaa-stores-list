const { performance } = require('perf_hooks');

// Simulated wallets data (5 wallets as on Behatsdaa)
const mockWallets = [
  { walletID: "101", walletName: "כרטיס 1" },
  { walletID: "102", walletName: "כרטיס 2" },
  { walletID: "103", walletName: "כרטיס 3" },
  { walletID: "104", walletName: "כרטיס 4" },
  { walletID: "105", walletName: "כרטיס 5" }
];

// Simulated window.fetch with network latency
function mockFetch(url) {
  const latency = 60 + Math.floor(Math.random() * 20); // ~60-80ms network latency
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        json: async () => ({ ok: true, data: [{ chainID: "1", chainName: "Store 1" }] })
      });
    }, latency);
  });
}

// 1. Sequential implementation (before optimization)
async function fetchWalletsSequential(wallets) {
  const results = [];
  for (const w of wallets) {
    const wid = w.walletID;
    try {
      const chainRes = await mockFetch(`https://back.behatsdaa.org.il/api/cards/GetWalletChain?walletId=${wid}`);
      const chainJson = await chainRes.json();
      results.push({
        wallet: w,
        categories: chainJson?.data || []
      });
    } catch (err) {
      results.push({
        wallet: w,
        error: err.toString(),
        categories: []
      });
    }
  }
  return { ok: true, results };
}

// 2. Parallel Promise.all implementation (after optimization)
async function fetchWalletsParallel(wallets) {
  const results = await Promise.all(
    wallets.map(async (w) => {
      const wid = w.walletID;
      try {
        const chainRes = await mockFetch(`https://back.behatsdaa.org.il/api/cards/GetWalletChain?walletId=${wid}`);
        const chainJson = await chainRes.json();
        return {
          wallet: w,
          categories: chainJson?.data || []
        };
      } catch (err) {
        return {
          wallet: w,
          error: err.toString(),
          categories: []
        };
      }
    })
  );
  return { ok: true, results };
}

async function runBenchmark() {
  console.log("=== Wallet Fetch Benchmark (Sequential vs Parallel) ===");
  console.log(`Number of wallets: ${mockWallets.length}`);

  // Baseline: Sequential
  const t0 = performance.now();
  const seqRes = await fetchWalletsSequential(mockWallets);
  const t1 = performance.now();
  const seqDuration = t1 - t0;
  console.log(`Sequential execution time: ${seqDuration.toFixed(2)} ms`);

  // Optimized: Parallel
  const t2 = performance.now();
  const parRes = await fetchWalletsParallel(mockWallets);
  const t3 = performance.now();
  const parDuration = t3 - t2;
  console.log(`Parallel (Promise.all) execution time: ${parDuration.toFixed(2)} ms`);

  const speedup = (seqDuration / parDuration).toFixed(2);
  const percentSaved = (((seqDuration - parDuration) / seqDuration) * 100).toFixed(1);

  console.log(`Speedup: ${speedup}x faster`);
  console.log(`Time reduction: ${percentSaved}%`);
  console.log(`Correctness check: ${seqRes.results.length === parRes.results.length ? 'PASSED' : 'FAILED'}`);
}

runBenchmark().catch(console.error);
