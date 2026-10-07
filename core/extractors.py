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

            // 1. Retrieve all cards/wallets (trying GetChargingCard first, fallback to GetCardGeneralInfo)
            let wallets = [];
            try {
                let genRes = await window.fetch("https://back.behatsdaa.org.il/api/card/GetChargingCard", {
                    headers,
                    credentials: "include"
                });
                if (!genRes.ok) {
                    genRes = await window.fetch("https://back.behatsdaa.org.il/api/cards/GetCardGeneralInfo", {
                        headers,
                        credentials: "include"
                    });
                }
                const genJson = await genRes.json();
                wallets = genJson?.data?.wallets || genJson?.data || [];
            } catch (e) {
                try {
                    const fallbackRes = await window.fetch("https://back.behatsdaa.org.il/api/cards/GetCardGeneralInfo", {
                        headers,
                        credentials: "include"
                    });
                    const fallbackJson = await fallbackRes.json();
                    wallets = fallbackJson?.data?.wallets || fallbackJson?.data || [];
                } catch (err2) {
                    return { error: 'GetChargingCard / GetCardGeneralInfo failed: ' + e.toString() };
                }
            }

            if (!wallets || wallets.length === 0) {
                return { error: 'No wallets returned from card endpoints' };
            }

            // 2. Fetch all stores for each wallet in parallel
            const results = await Promise.all(
                wallets.map(async (w) => {
                    const wid = w.walletId || w.walletID || w.id;
                    try {
                        let chainRes = await window.fetch(`https://back.behatsdaa.org.il/api/card/GetShopsByWalletId?walletId=${wid}`, {
                            headers,
                            credentials: "include"
                        });
                        if (!chainRes.ok) {
                            chainRes = await window.fetch(`https://back.behatsdaa.org.il/api/cards/GetWalletChain?walletId=${wid}`, {
                                headers,
                                credentials: "include"
                            });
                        }
                        const chainJson = await chainRes.json();
                        const categories = chainJson?.data?.categories || chainJson?.data?.shops || chainJson?.data || [];
                        return {
                            wallet: w,
                            categories: categories
                        };
                    } catch (err) {
                        try {
                            const chainRes2 = await window.fetch(`https://back.behatsdaa.org.il/api/cards/GetWalletChain?walletId=${wid}`, {
                                headers,
                                credentials: "include"
                            });
                            const chainJson2 = await chainRes2.json();
                            return {
                                wallet: w,
                                categories: chainJson2?.data || []
                            };
                        } catch (err2) {
                            return {
                                wallet: w,
                                error: err.toString(),
                                categories: []
                            };
                        }
                    }
                })
            );

            // 3. Extract caps, rules, and terms dynamically from regulations page DOM & text
            let extractedRules = [];
            let extractedCaps = {};

            try {
                // Check if GetChargingCard returned metadata caps or regulations
                const apiData = (typeof genJson !== "undefined" && genJson?.data) ? genJson.data : {};
                if (apiData.monthlyCap || apiData.generalMonthlyCap) {
                    extractedCaps.monthly_cap_general = Number(apiData.monthlyCap || apiData.generalMonthlyCap);
                }
                if (apiData.fighterMonthlyCap) {
                    extractedCaps.monthly_cap_fighter = Number(apiData.fighterMonthlyCap);
                }
                if (apiData.instantBalanceCap || apiData.maxBalance) {
                    extractedCaps.instant_balance_cap = Number(apiData.instantBalanceCap || apiData.maxBalance);
                }
                if (apiData.minReload || apiData.minDeposit) {
                    extractedCaps.min_reload = Number(apiData.minReload || apiData.minDeposit);
                }

                const apiRules = apiData.rules || apiData.regulations || apiData.generalRules || [];
                if (Array.isArray(apiRules)) {
                    apiRules.forEach((r, idx) => {
                        extractedRules.push({
                            id: r.id || `api_rule_${idx + 1}`,
                            title: (r.title || r.name || '').trim(),
                            summary: (r.summary || r.content || r.description || '').trim()
                        });
                    });
                }

                // Scrape accordion items, rule blocks, and terms containers from live page DOM
                if (typeof document !== "undefined") {
                    const candidates = document.querySelectorAll(
                        '.q-expansion-item, [class*="accordion"], [class*="rule"], [class*="term"], [class*="regulation"], [class*="faq"], [class*="policy"], [class*="info-box"]'
                    );

                    candidates.forEach((el, idx) => {
                        const header = el.querySelector('[class*="title"], [class*="header"], h3, h4, h5, button, .q-item__label');
                        const title = header ? header.innerText.trim() : '';
                        const content = el.querySelector('[class*="content"], [class*="body"], [class*="text"], p, .q-expansion-item__content');
                        const summary = content ? content.innerText.trim() : el.innerText.replace(title, '').trim();

                        if (title && summary && title.length < 120 && summary.length > 15) {
                            extractedRules.push({
                                id: `dom_rule_${idx + 1}`,
                                title: title,
                                summary: summary.replace(/\\s+/g, ' ')
                            });
                        }
                    });

                    // Scrape page text to regex-extract official caps
                    const bodyText = document.body ? document.body.innerText : '';

                    const mGen = bodyText.match(/(?:תקרה חודשית|תקרת הטעינה מוגבלת ל-?|עד ל?תקרה של)\\s*([1-9]\\d{0,1}[,\\.]?\\d{3})\\s*₪/);
                    if (mGen) {
                        const val = parseInt(mGen[1].replace(/[^\\d]/g, ''), 10);
                        if (val >= 1000 && val <= 10000) extractedCaps.monthly_cap_general = val;
                    }

                    const mFight = bodyText.match(/(?:פייטר|fighter)[^\\n.]{0,80}?(?:תקרה|עד)\\s*([1-9]\\d{0,1}[,\\.]?\\d{3})\\s*₪/i);
                    if (mFight) {
                        const val = parseInt(mFight[1].replace(/[^\\d]/g, ''), 10);
                        if (val >= 1000 && val <= 10000) extractedCaps.monthly_cap_fighter = val;
                    }

                    const mInst = bodyText.match(/(?:יתרה רגעית|יתרה מקסימלית|סכום כולל של עד)\\s*([1-9]\\d{0,1}[,\\.]?\\d{3})\\s*₪/);
                    if (mInst) {
                        const val = parseInt(mInst[1].replace(/[^\\d]/g, ''), 10);
                        if (val >= 500 && val <= 5000) extractedCaps.instant_balance_cap = val;
                    }

                    const mMin = bodyText.match(/(?:טעינה מינימלית|מינימום|החל מ-?)\\s*([1-9]\\d{1,2})\\s*₪/);
                    if (mMin) {
                        const val = parseInt(mMin[1].replace(/[^\\d]/g, ''), 10);
                        if (val >= 20 && val <= 500) extractedCaps.min_reload = val;
                    }
                }
            } catch (ruleErr) {
                console.warn("Dynamic rule and cap extraction warning:", ruleErr);
            }

            return {
                ok: true,
                results,
                raw_wallets: wallets,
                extracted_caps: extractedCaps,
                extracted_rules: extractedRules,
                page_text_sample: (typeof document !== "undefined" && document.body) ? document.body.innerText.slice(0, 10000) : ""
            };
        }
    """)


from core.progress import render_progress_bar


def fetch_deals_via_evaluate(page, max_deals=None, hydrate_details=True):
    """Execute deep catalog scraping for rotating deals, coupons, and vouchers."""
    def _default_progress(data):
        if isinstance(data, dict):
            render_progress_bar(
                data.get("current", 0),
                data.get("total", 1),
                prefix=data.get("prefix", "Scanning Catalog:   "),
                suffix=data.get("suffix", ""),
                done=data.get("done", False)
            )
        else:
            print(f"  [*] {data}")

    try:
        page.expose_function("reportDealsProgress", _default_progress)
    except Exception:
        pass

    return page.evaluate("""
        async (evalArgs) => {
            const maxCount = Array.isArray(evalArgs) ? evalArgs[0] : evalArgs;
            const shouldHydrate = Array.isArray(evalArgs) ? (evalArgs[1] !== false) : true;

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

            async function reportProgress(current, total, prefix, suffix, done = false) {
                if (typeof window.reportDealsProgress === "function") {
                    try {
                        await window.reportDealsProgress({
                            current,
                            total,
                            prefix,
                            suffix,
                            done
                        });
                    } catch(e) {}
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
            await logProgress("Scanning promotional tags & homepage carousels...");
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

                    let processedSubs = 0;
                    const totalSubs = subCategoryList.length;
                    await reportProgress(0, totalSubs, "Scanning Categories:", `| ${dealsMap.size:,} deals found`);

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
                        processedSubs++;
                        if (processedSubs % 5 === 0 || processedSubs === totalSubs) {
                            await reportProgress(
                                processedSubs,
                                totalSubs,
                                "Scanning Categories:",
                                `| ${dealsMap.size} deals found`,
                                processedSubs === totalSubs
                            );
                        }
                    });
                }
            } catch (err) {
                console.warn("Failed fetching category header:", err);
            }

            const rawDeals = Array.from(dealsMap.values());
            const finalDeals = maxCount ? rawDeals.slice(0, maxCount) : rawDeals;

            // 3. Deep Deal Hydration via GetProductById
            if (shouldHydrate && finalDeals.length > 0) {
                const totalHydrate = finalDeals.length;
                let hydratedCount = 0;
                await reportProgress(0, totalHydrate, "Hydrating Deals Details:", `| 0/${totalHydrate}`);

                await runInBatches(finalDeals, 15, async (d) => {
                    const did = String(d.categoryId || d.id);
                    try {
                        const prodRes = await safeFetch(`https://back.behatsdaa.org.il/api/product/GetProductById?productId=${did}`, 5000);
                        if (prodRes && prodRes.ok) {
                            const prodJson = await prodRes.json();
                            const p = prodJson?.data || prodJson?.data?.product || {};
                            if (p && typeof p === "object") {
                                if (p.termsOfUse || p.usageInstructions || p.notes || p.remarks) {
                                    d.termsOfUse = p.termsOfUse || p.usageInstructions || p.notes || p.remarks;
                                }
                                if (p.purchaseLimits || p.maxQuantityPerUser || p.maxQuantity) {
                                    d.purchaseLimits = p.purchaseLimits || p.maxQuantityPerUser || (p.maxQuantity ? `עד ${p.maxQuantity} יחידות למנוי` : "");
                                }
                                if (p.validTo || p.expirationDate) {
                                    d.validTo = p.validTo || p.expirationDate;
                                }
                                if (Array.isArray(p.branches) && p.branches.length > 0) {
                                    d.branches = p.branches;
                                } else if (Array.isArray(p.redemptionLocations) && p.redemptionLocations.length > 0) {
                                    d.branches = p.redemptionLocations;
                                }
                                if (Array.isArray(p.subProducts) && p.subProducts.length > 0) {
                                    d.subProducts = p.subProducts;
                                } else if (Array.isArray(p.variants) && p.variants.length > 0) {
                                    d.variants = p.variants;
                                } else if (Array.isArray(p.pricesList) && p.pricesList.length > 0) {
                                    d.variants = p.pricesList;
                                }
                            }
                        }
                    } catch (e) {}
                    hydratedCount++;
                    if (hydratedCount % 20 === 0 || hydratedCount === totalHydrate) {
                        await reportProgress(
                            hydratedCount,
                            totalHydrate,
                            "Hydrating Deals Details:",
                            `| ${hydratedCount}/${totalHydrate}`,
                            hydratedCount === totalHydrate
                        );
                    }
                });
            }

            return {
                ok: true,
                deals: finalDeals,
                tags: discoveredTags
            };
        }
    """, [max_deals, hydrate_details])

