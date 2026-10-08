const { performance } = require('perf_hooks');

// Helper
function extractFromInfo(info) {
    if (!info) return [];
    if (Array.isArray(info.categories)) return info.categories;
    if (info.categories && typeof info.categories === "object") return [info.categories];
    if (info.categoryId || info.id) return [info];
    return [];
}

// Mock mock tags
const sampleTags = Array.from({ length: 15 }, (_, i) => ({
    tagId: `tag_${i + 1}`,
    tagName: `Campaign Tag ${i + 1}`,
    tagCategoryInfo: [
        { categoryId: `cat_${i}_1`, categoryName: `Category ${i}_1` },
        { categoryId: `cat_${i}_2`, categoryName: `Category ${i}_2` }
    ]
}));

// Mock fetch function simulating network latency (e.g. 100ms per request)
const createMockFetch = (latencyMs = 100) => async (url) => {
    await new Promise(resolve => setTimeout(resolve, latencyMs));
    const urlObj = new URL(url);
    const tagId = urlObj.searchParams.get('tagid');
    return {
        ok: true,
        json: async () => ({
            data: {
                data: {
                    tagCategoryInfo: [
                        { categoryId: `${tagId}_item1`, categoryName: `Item 1 for ${tagId}` },
                        { categoryId: `${tagId}_item2`, categoryName: `Item 2 for ${tagId}` }
                    ]
                }
            }
        })
    };
};

async function runSequential(tags, fetchFn) {
    const dealsMap = new Map();
    const tagsList = [];

    const start = performance.now();

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

        // Fetch full list of items under this specific tag sequentially
        try {
            const tagRes = await fetchFn(`https://back.behatsdaa.org.il/api/tags/GetCategorysByTagID?tagid=${tagId}`);
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

    const duration = performance.now() - start;
    return { duration, dealsCount: dealsMap.size, tagsListCount: tagsList.length, dealsMap };
}

async function runConcurrent(tags, fetchFn) {
    const dealsMap = new Map();
    const tagsList = [];

    const start = performance.now();

    await Promise.all(tags.map(async (tag) => {
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

        // Fetch full list of items under this specific tag concurrently
        try {
            const tagRes = await fetchFn(`https://back.behatsdaa.org.il/api/tags/GetCategorysByTagID?tagid=${tagId}`);
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
    }));

    const duration = performance.now() - start;
    return { duration, dealsCount: dealsMap.size, tagsListCount: tagsList.length, dealsMap };
}

async function main() {
    const mockFetch = createMockFetch(100);
    console.log("Running Benchmark for 15 tags with 100ms simulated network latency per request...");

    const seqResult = await runSequential(sampleTags, mockFetch);
    console.log(`Sequential Execution Time: ${seqResult.duration.toFixed(2)} ms (Deals: ${seqResult.dealsCount})`);

    const concResult = await runConcurrent(sampleTags, mockFetch);
    console.log(`Concurrent Execution Time: ${concResult.duration.toFixed(2)} ms (Deals: ${concResult.dealsCount})`);

    const speedup = (seqResult.duration / concResult.duration).toFixed(2);
    console.log(`Speedup factor: ${speedup}x (${(seqResult.duration - concResult.duration).toFixed(2)} ms saved)`);

    if (seqResult.dealsCount !== concResult.dealsCount) {
        console.error("Mismatch in extracted deals count!");
        process.exit(1);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
