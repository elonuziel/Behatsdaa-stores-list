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
    return page.evaluate("""
        async (maxCount) => {
            const headers = {
                "OrganizationId": "20",
                "Accept": "application/json"
            };

            const dealsMap = new Map();
            const discoveredTags = [];

            function extractFromInfo(info) {
                if (!info) return [];
                if (Array.isArray(info.categories)) return info.categories;
                if (info.categories && typeof info.categories === "object") return [info.categories];
                if (info.categoryId || info.id) return [info];
                return [];
            }

            // 1. Fetch top tags from homepage (holiday specials, featured carousels)
            try {
                const topTagsRes = await window.fetch("https://back.behatsdaa.org.il/api/tags/GetCategorysByTopTag?selectTop=50&skipTags=0", {
                    headers,
                    credentials: "include"
                });
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

                    // Also fetch full items under this specific tag
                    try {
                        const tagFullRes = await window.fetch(`https://back.behatsdaa.org.il/api/tags/GetCategorysByTagID?tagid=${tagId}`, {
                            headers,
                            credentials: "include"
                        });
                        const tagFullJson = await tagFullRes.json();
                        const fullInfo = tagFullJson?.data?.data?.tagCategoryInfo || tagFullJson?.data?.tagCategoryInfo || [];
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
                    } catch (e) {
                        // ignore single tag error
                    }
                }
            } catch (err) {
                console.warn("Failed fetching top tags:", err);
            }

            // 2. Fetch full category hierarchy and crawl sub-categories for all products
            try {
                const catHeaderRes = await window.fetch("https://back.behatsdaa.org.il/api/category/GetCategoryHeader", {
                    headers,
                    credentials: "include"
                });
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

                // Fetch products from each subcategory
                for (const sub of subCategoryList) {
                    try {
                        const subRes = await window.fetch(`https://back.behatsdaa.org.il/api/category/GetCategoryById?categoryId=${sub.id}`, {
                            headers,
                            credentials: "include"
                        });
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
                    } catch (e) {
                        // ignore single subcategory error
                    }
                }
            } catch (err) {
                console.warn("Failed fetching category header:", err);
            }

            // 3. Deep-fetch product details & variants in batches if needed
            const rawDeals = Array.from(dealsMap.values());
            const dealsToFetch = maxCount ? rawDeals.slice(0, maxCount) : rawDeals;
            const finalDeals = [];

            const batchSize = 6;
            for (let i = 0; i < dealsToFetch.length; i += batchSize) {
                const batch = dealsToFetch.slice(i, i + batchSize);
                const promises = batch.map(async (deal) => {
                    const cid = deal.categoryId || deal.id;
                    if (deal.variants && deal.variants.length > 0 && (deal.howToUse || deal.termsOfUse)) {
                        return deal;
                    }
                    try {
                        const pRes = await window.fetch(`https://back.behatsdaa.org.il/api/category/GetCategoryProducts?categoryId=${cid}`, {
                            headers,
                            credentials: "include"
                        });
                        const pJson = await pRes.json();
                        if (pJson?.data?.data) {
                            const detail = pJson.data.data;
                            detail.sourceTags = deal.sourceTags || [];
                            if (!detail.category && deal.category) detail.category = deal.category;
                            return detail;
                        }
                    } catch (err) {
                        // ignore and use shallow deal
                    }
                    return deal;
                });

                const batchResults = await Promise.all(promises);
                finalDeals.push(...batchResults);
            }

            return {
                ok: true,
                deals: finalDeals,
                tags: discoveredTags
            };
        }
    """, max_deals)

