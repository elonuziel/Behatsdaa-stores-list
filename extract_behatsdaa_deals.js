/**
 * Behatsdaa Deep Deals & Vouchers Extractor (Fixed & Complete)
 * 
 * Instructions:
 * 1. Open your logged-in tab of https://www.behatsdaa.org.il
 * 2. Press F12 -> switch to the 'Console' tab
 * 3. Paste all the code below and press Enter.
 * 4. It will crawl all homepage carousels ("החמים של ספטמבר", "מבצעי צרכנות לחג", etc.)
 *    and all 99 sub-categories across the entire website.
 * 5. It will automatically download 'deals_raw.json'.
 */
(async function() {
    console.log("%c🚀 Starting Behatsdaa Deep Deals Extractor...", "color: #3b82f6; font-size: 14px; font-weight: bold;");
    const headers = {
        "OrganizationId": "20",
        "Accept": "application/json"
    };

    const dealsMap = new Map();
    const tagsList = [];
    const delay = ms => new Promise(r => setTimeout(r, ms));

    // Helper: normalize categories from tagCategoryInfo
    function extractFromInfo(info) {
        if (!info) return [];
        if (Array.isArray(info.categories)) return info.categories;
        if (info.categories && typeof info.categories === "object") return [info.categories];
        if (info.categoryId || info.id) return [info];
        return [];
    }

    // 1. Fetch homepage carousels & campaign tags (e.g. "החמים של ספטמבר", "מבצעי צרכנות לחג")
    try {
        console.log("📦 [1/2] Fetching homepage carousels and holiday campaigns...");
        const res = await window.fetch("https://back.behatsdaa.org.il/api/tags/GetCategorysByTopTag?selectTop=50&skipTags=0", {
            headers,
            credentials: "include"
        });
        const json = await res.json();
        const tags = json?.data?.data || json?.data || [];

        for (const tag of tags) {
            const tagId = tag.tagId;
            const tagName = (tag.tagName || "").trim();
            if (tagName) tagsList.push({ id: tagId, name: tagName });

            const catInfos = tag.tagCategoryInfo || [];
            for (const info of catInfos) {
                for (const cat of extractFromInfo(info)) {
                    if (cat && (cat.categoryId || cat.id)) {
                        const id = String(cat.categoryId || cat.id);
                        if (!dealsMap.has(id)) {
                            cat.sourceTags = tagName ? [tagName] : [];
                            dealsMap.set(id, cat);
                        } else {
                            const d = dealsMap.get(id);
                            if (tagName && (!d.sourceTags || !d.sourceTags.includes(tagName))) {
                                d.sourceTags = d.sourceTags || [];
                                d.sourceTags.push(tagName);
                            }
                        }
                    }
                }
            }

            // Fetch full list of items under this specific tag
            try {
                const tagRes = await window.fetch(`https://back.behatsdaa.org.il/api/tags/GetCategorysByTagID?tagid=${tagId}`, {
                    headers,
                    credentials: "include"
                });
                const tagJson = await tagRes.json();
                const items = tagJson?.data?.data?.tagCategoryInfo || tagJson?.data?.tagCategoryInfo || [];
                for (const info of items) {
                    for (const cat of extractFromInfo(info)) {
                        if (cat && (cat.categoryId || cat.id)) {
                            const id = String(cat.categoryId || cat.id);
                            if (!dealsMap.has(id)) {
                                cat.sourceTags = tagName ? [tagName] : [];
                                dealsMap.set(id, cat);
                            } else {
                                const d = dealsMap.get(id);
                                if (tagName && (!d.sourceTags || !d.sourceTags.includes(tagName))) {
                                    d.sourceTags = d.sourceTags || [];
                                    d.sourceTags.push(tagName);
                                }
                            }
                        }
                    }
                }
            } catch (e) {}
        }
        console.log(`   Found ${dealsMap.size} featured items across ${tags.length} homepage campaigns.`);
    } catch (err) {
        console.warn("Homepage campaigns fetch warning:", err);
    }

    // 2. Fetch full category hierarchy (all 99 sub-categories across the entire site)
    try {
        console.log("📂 [2/2] Fetching complete category navigation tree...");
        const headerRes = await window.fetch("https://back.behatsdaa.org.il/api/category/GetCategoryHeader", {
            headers,
            credentials: "include"
        });
        const headerJson = await headerRes.json();
        const headerData = headerJson?.data?.data || headerJson?.data || [];

        const subCategoryList = [];
        function walkTree(nodes, parentName) {
            if (!nodes || !Array.isArray(nodes)) return;
            for (const n of nodes) {
                const curName = n.categoryName || parentName || "כללי";
                if (n.children && n.children.length > 0) {
                    walkTree(n.children, curName);
                } else if (n.subCategories && n.subCategories.length > 0 && !n.isLeaf) {
                    walkTree(n.subCategories, curName);
                } else if (n.categoryId || n.id) {
                    subCategoryList.push({
                        id: String(n.categoryId || n.id),
                        name: curName,
                        parent: parentName || curName
                    });
                }
            }
        }
        walkTree(headerData, "צרכנות");

        console.log(`🔍 Crawling products across all ${subCategoryList.length} sub-categories...`);

        for (let i = 0; i < subCategoryList.length; i++) {
            const sub = subCategoryList[i];
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
                            const d = dealsMap.get(pid);
                            d.sourceTags = d.sourceTags || [];
                            if (!d.sourceTags.includes(sub.name)) {
                                d.sourceTags.push(sub.name);
                            }
                            if (!d.category && sub.parent) {
                                d.category = sub.parent;
                            }
                        }
                    }
                }
            } catch (e) {}

            if ((i + 1) % 15 === 0 || i === subCategoryList.length - 1) {
                console.log(`   Scanned ${i + 1}/${subCategoryList.length} subcategories (${dealsMap.size} products found)...`);
            }
            await delay(80);
        }
    } catch (err) {
        console.warn("Category tree error:", err);
    }

    console.log(`%c✨ Complete! Total unique deals & vouchers collected: ${dealsMap.size}`, "color: #10b981; font-size: 15px; font-weight: bold;");

    const rawDeals = Array.from(dealsMap.values());
    const payload = {
        ok: true,
        extracted_at: new Date().toISOString(),
        total_items: rawDeals.length,
        tags: tagsList,
        deals: rawDeals
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "deals_raw.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    console.log("%c🎉 File downloaded as 'deals_raw.json' with full campaign tags and subcategories!", "color: #10b981; font-weight: bold;");
})();
