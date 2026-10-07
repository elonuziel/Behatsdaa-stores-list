"""
In-browser JavaScript extraction scripts for cards and rotating deals on Behatsdaa.
"""


def fetch_wallets_via_evaluate(page):
    """Execute high-speed API extraction inside active browser session for rechargeable cards."""
    return page.evaluate("""
        async () => {
            const headers = {
                "OrganizationId": "20",
                "Accept": "application/json"
            };

            // 1. Retrieve all cards/wallets
            let wallets = [];
            try {
                const genRes = await window.fetch("https://back.behatsdaa.org.il/api/cards/GetCardGeneralInfo", {
                    headers,
                    credentials: "include"
                });
                const genJson = await genRes.json();
                wallets = genJson?.data?.wallets || [];
            } catch (e) {
                return { error: 'GetCardGeneralInfo failed: ' + e.toString() };
            }

            if (!wallets || wallets.length === 0) {
                return { error: 'No wallets returned from GetCardGeneralInfo' };
            }

            // 2. Fetch all stores for each wallet in parallel
            const results = await Promise.all(
                wallets.map(async (w) => {
                    const wid = w.walletID;
                    try {
                        const chainRes = await window.fetch(`https://back.behatsdaa.org.il/api/cards/GetWalletChain?walletId=${wid}`, {
                            headers,
                            credentials: "include"
                        });
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
    """)


def fetch_deals_via_evaluate(page, max_deals=None):
    """Execute deep catalog scraping for rotating deals, coupons, and vouchers."""
    def _default_progress(msg):
        print(f"    [*] {msg}")

    try:
        page.expose_function("reportDealsProgress", _default_progress)
    except Exception:
        pass

    return page.evaluate("""
        async (maxCount) => {
            const headers = {
                "OrganizationId": "20",
                "Accept": "application/json"
            };

            const dealsMap = new Map();
            const discoveredTags = [];

            async function logProgress(msg) {
                if (typeof window.reportDealsProgress === "function") {
                    try { await window.reportDealsProgress(msg); } catch(e) {}
                }
            }

            // Safe fetch with strict timeout to prevent hangs
            async function safeFetch(url, timeoutMs = 5000) {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), timeoutMs);
                try {
                    const res = await window.fetch(url, {
                        headers,
                        credentials: "include",
                        signal: controller.signal
                    });
                    clearTimeout(timer);
                    return res;
                } catch (e) {
                    clearTimeout(timer);
                    return null;
                }
            }

            function extractFromInfo(info) {
                if (!info) return [];
                if (Array.isArray(info.categories)) return info.categories;
                if (info.categories && typeof info.categories === "object") return [info.categories];
                if (info.categoryId || info.id) return [info];
                return [];
            }

            // Helper to run promises in parallel batches
            async function runInBatches(items, batchSize, fn) {
                const results = [];
                for (let i = 0; i < items.length; i += batchSize) {
                    const batch = items.slice(i, i + batchSize);
                    const batchRes = await Promise.all(batch.map(fn));
                    results.push(...batchRes);
                }
                return results;
            }

            // 1. Fetch top tags from homepage (holiday specials, featured carousels)
            await logProgress("Scanning promotional tags and homepage carousels...");
            try {
                const topTagsRes = await safeFetch("https://back.behatsdaa.org.il/api/tags/GetCategorysByTopTag?selectTop=50&skipTags=0", 6000);
                if (topTagsRes && topTagsRes.ok) {
                    const topTagsJson = await topTagsRes.json();
                    const tagsData = topTagsJson?.data?.data || topTagsJson?.data || [];

                    for (const tag of tagsData) {
                        const tagId = tag.tagId;
                        const tagName = (tag.tagName || "").trim();
                        if (tagName) discoveredTags.push({ id: tagId, name: tagName });

                        const categoryInfos = tag.tagCategoryInfo || [];
                        for (const catInfo of categoryInfos) {
                            for (const cat of extractFromInfo(catInfo)) {
                                if (cat && (cat.categoryId || cat.id)) {
                                    const cid = String(cat.categoryId || cat.id);
                                    if (!dealsMap.has(cid)) {
                                        cat.sourceTags = tagName ? [tagName] : [];
                                        dealsMap.set(cid, cat);
                                    } else {
                                        const existing = dealsMap.get(cid);
                                        if (tagName && (!existing.sourceTags || !existing.sourceTags.includes(tagName))) {
                                            existing.sourceTags = existing.sourceTags || [];
                                            existing.sourceTags.push(tagName);
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Fetch individual tag items in parallel batches
                    await runInBatches(tagsData, 10, async (tag) => {
                        try {
                            const tagFullRes = await safeFetch(`https://back.behatsdaa.org.il/api/tags/GetCategorysByTagID?tagid=${tag.tagId}`, 5000);
                            if (tagFullRes && tagFullRes.ok) {
                                const tagFullJson = await tagFullRes.json();
                                const fullInfo = tagFullJson?.data?.data?.tagCategoryInfo || tagFullJson?.data?.tagCategoryInfo || [];
                                const tagName = (tag.tagName || "").trim();
                                for (const catInfo of fullInfo) {
                                    for (const cat of extractFromInfo(catInfo)) {
                                        if (cat && (cat.categoryId || cat.id)) {
                                            const cid = String(cat.categoryId || cat.id);
                                            if (!dealsMap.has(cid)) {
                                                cat.sourceTags = tagName ? [tagName] : [];
                                                dealsMap.set(cid, cat);
                                            } else {
                                                const existing = dealsMap.get(cid);
                                                if (tagName && (!existing.sourceTags || !existing.sourceTags.includes(tagName))) {
                                                    existing.sourceTags = existing.sourceTags || [];
                                                    existing.sourceTags.push(tagName);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        } catch (e) {}
                    });
                }
            } catch (err) {
                console.warn("Failed fetching top tags:", err);
            }

            await logProgress(`Discovered ${dealsMap.size} featured deals from homepage. Scanning full category catalog...`);

            // 2. Fetch full category hierarchy and crawl sub-categories in parallel
            try {
                const catHeaderRes = await safeFetch("https://back.behatsdaa.org.il/api/category/GetCategoryHeader", 6000);
                if (catHeaderRes && catHeaderRes.ok) {
                    const catHeaderJson = await catHeaderRes.json();
                    const headerData = catHeaderJson?.data?.data || catHeaderJson?.data || [];

                    const subCategoryList = [];
                    function extractSubCategories(nodes, parentName) {
                        if (!nodes || !Array.isArray(nodes)) return;
                        for (const n of nodes) {
                            const curName = n.categoryName || parentName || "צרכנות";
                            if (n.children && n.children.length > 0) {
                                extractSubCategories(n.children, curName);
                            } else if (n.subCategories && n.subCategories.length > 0 && !n.isLeaf) {
                                extractSubCategories(n.subCategories, curName);
                            } else if (n.categoryId || n.id) {
                                subCategoryList.push({
                                    id: String(n.categoryId || n.id),
                                    name: curName,
                                    parent: parentName || curName
                                });
                            }
                        }
                    }
                    extractSubCategories(headerData, "צרכנות");

                    await logProgress(`Scanning ${subCategoryList.length} categories in parallel...`);

                    // Fetch products from subcategories in parallel batches of 15
                    await runInBatches(subCategoryList, 15, async (sub) => {
                        try {
                            const subRes = await safeFetch(`https://back.behatsdaa.org.il/api/category/GetCategoryById?categoryId=${sub.id}`, 5000);
                            if (subRes && subRes.ok) {
                                const subJson = await subRes.json();
                                const products = subJson?.data?.subCategories || subJson?.data?.categories || [];
                                for (const p of products) {
                                    if (p && (p.categoryId || p.id)) {
                                        const pid = String(p.categoryId || p.id);
                                        if (!dealsMap.has(pid)) {
                                            p.category = sub.parent;
                                            p.sourceTags = [sub.name];
                                            dealsMap.set(pid, p);
                                        } else {
                                            const existing = dealsMap.get(pid);
                                            if (!existing.sourceTags.includes(sub.name)) {
                                                existing.sourceTags.push(sub.name);
                                            }
                                        }
                                    }
                                }
                            }
                        } catch (e) {}
                    });
                }
            } catch (err) {
                console.warn("Failed fetching category header:", err);
            }

            const rawDeals = Array.from(dealsMap.values());
            const finalDeals = maxCount ? rawDeals.slice(0, maxCount) : rawDeals;
            await logProgress(`Completed extraction of ${finalDeals.length} total deals!`);

            return {
                ok: true,
                deals: finalDeals,
                tags: discoveredTags
            };
        }
    """, max_deals)

