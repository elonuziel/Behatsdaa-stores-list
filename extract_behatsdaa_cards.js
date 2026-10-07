/**
 * Behatsdaa Rechargeable Cards & Chains In-Browser Extractor
 * Extracts:
 * 1. Active wallet cards, discounts, and real-time spending caps
 * 2. Participating chains/shops with conditions, remarks, and exclusions
 * 3. Official club regulations, balance limits, and refund rules
 * 
 * Instructions:
 * 1. Open your logged-in tab of https://www.behatsdaa.org.il/card/chargingCard
 * 2. Press F12 -> switch to the 'Console' tab
 * 3. Paste all the code below and press Enter.
 * 4. It will automatically download 'cards_raw.json' with full store conditions and wallet rules.
 */
(async function() {
    console.log("%c🚀 Starting Behatsdaa Rechargeable Cards Extractor...", "color: #3b82f6; font-size: 14px; font-weight: bold;");
    const headers = {
        "OrganizationId": "20",
        "Accept": "application/json"
    };

    function cleanHtml(html) {
        if (!html) return "";
        return String(html)
            .replace(/<(?:br|\/p|\/div|\/li)>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&#39;/g, "'")
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/\s+/g, ' ')
            .trim();
    }

    try {
        console.log("💳 [1/3] Fetching wallet general information & caps...");
        let rawWallets = [];
        let apiData = {};
        try {
            const res = await window.fetch("https://back.behatsdaa.org.il/api/card/GetChargingCard", {
                headers,
                credentials: "include"
            });
            if (res.ok) {
                const json = await res.json();
                apiData = json?.data || {};
                rawWallets = apiData.wallets || json?.data || [];
            }
        } catch (e) {
            console.warn("GetChargingCard failed, trying fallback...", e);
        }

        if (!rawWallets || rawWallets.length === 0) {
            try {
                const genRes = await window.fetch("https://back.behatsdaa.org.il/api/cards/GetCardGeneralInfo", {
                    headers,
                    credentials: "include"
                });
                const genJson = await genRes.json();
                apiData = genJson?.data || apiData;
                rawWallets = apiData.wallets || [];
            } catch (err2) {
                console.error("❌ Fallback fetch failed:", err2);
            }
        }

        if (!rawWallets || rawWallets.length === 0) {
            console.error("❌ No wallets returned. Please ensure you are logged in to Behatsdaa.");
            return;
        }

        console.log(`[+] Found ${rawWallets.length} wallets. Extracting dynamic caps and rules from regulations page...`);

        // Dynamic caps & rules extraction from live regulations DOM & API
        const caps = {
            monthly_cap_general: 3000,
            monthly_cap_fighter: 2500,
            instant_balance_cap: 1000,
            min_reload: 100,
            daily_cap: "ללא מגבלה יומית נפרדת (בכפוף לתקרה החודשית וליתרת 1,000 ₪ רגעית)"
        };

        if (apiData.monthlyCap || apiData.generalMonthlyCap) caps.monthly_cap_general = Number(apiData.monthlyCap || apiData.generalMonthlyCap);
        if (apiData.fighterMonthlyCap) caps.monthly_cap_fighter = Number(apiData.fighterMonthlyCap);
        if (apiData.instantBalanceCap || apiData.maxBalance) caps.instant_balance_cap = Number(apiData.instantBalanceCap || apiData.maxBalance);
        if (apiData.minReload || apiData.minDeposit) caps.min_reload = Number(apiData.minReload || apiData.minDeposit);

        const extractedRules = [];
        if (typeof document !== 'undefined' && document.body) {
            const bodyText = document.body.innerText || '';
            const mGen = bodyText.match(/(?:תקרה חודשית|תקרת הטעינה מוגבלת ל-?|עד ל?תקרה של)\s*([1-9]\d{0,1}[,\.]?\d{3})\s*₪/);
            if (mGen) caps.monthly_cap_general = parseInt(mGen[1].replace(/[^\d]/g, ''), 10);

            const mFight = bodyText.match(/(?:פייטר|fighter)[^\n.]{0,80}?(?:תקרה|עד)\s*([1-9]\d{0,1}[,\.]?\d{3})\s*₪/i);
            if (mFight) caps.monthly_cap_fighter = parseInt(mFight[1].replace(/[^\d]/g, ''), 10);

            const mInst = bodyText.match(/(?:יתרה רגעית|יתרה מקסימלית|סכום כולל של עד)\s*([1-9]\d{0,1}[,\.]?\d{3})\s*₪/);
            if (mInst) caps.instant_balance_cap = parseInt(mInst[1].replace(/[^\d]/g, ''), 10);

            const mMin = bodyText.match(/(?:טעינה מינימלית|מינימום|החל מ-?)\s*([1-9]\d{1,2})\s*₪/);
            if (mMin) caps.min_reload = parseInt(mMin[1].replace(/[^\d]/g, ''), 10);

            const ruleEls = document.querySelectorAll('.q-expansion-item, [class*="accordion"], [class*="rule"], [class*="term"], [class*="faq"]');
            ruleEls.forEach((el, idx) => {
                const header = el.querySelector('[class*="title"], [class*="header"], h3, h4, h5, button, .q-item__label');
                const title = header ? header.innerText.trim() : '';
                const content = el.querySelector('[class*="content"], [class*="body"], [class*="text"], p, .q-expansion-item__content');
                const summary = content ? content.innerText.trim() : el.innerText.replace(title, '').trim();
                if (title && summary && title.length < 120 && summary.length > 15) {
                    extractedRules.push({
                        id: `dom_rule_${idx + 1}`,
                        title: title,
                        summary: summary.replace(/\s+/g, ' ')
                    });
                }
            });
        }

        console.log(`💳 [2/3] Fetching participating chains, shops, and conditions for each wallet...`);

        const results = await Promise.all(
            rawWallets.map(async (w) => {
                const wid = w.walletId || w.walletID || w.id;
                const wname = (w.walletName || w.name || `Wallet ${wid}`).trim();
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
                    console.log(`  [*] Card '${wname}' (id ${wid}): fetched chains & terms successfully.`);
                    return {
                        wallet: w,
                        categories: categories
                    };
                } catch (err) {
                    try {
                        const fallback = await window.fetch(`https://back.behatsdaa.org.il/api/cards/GetWalletChain?walletId=${wid}`, {
                            headers,
                            credentials: "include"
                        });
                        const fallbackJson = await fallback.json();
                        return {
                            wallet: w,
                            categories: fallbackJson?.data || []
                        };
                    } catch (err2) {
                        console.warn(`  [!] Error fetching chains for card ${wid}:`, err2);
                        return {
                            wallet: w,
                            error: err2.toString(),
                            categories: []
                        };
                    }
                }
            })
        );

        console.log("💾 [3/3] Generating download of cards_raw.json...");
        const output = {
            ok: true,
            extracted_at: new Date().toISOString(),
            caps: caps,
            rules: extractedRules,
            wallets: rawWallets,
            results: results
        };

        const blob = new Blob([JSON.stringify(output, null, 2)], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "cards_raw.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log("%c🎉 Successfully extracted and downloaded cards_raw.json!", "color: #10b981; font-size: 14px; font-weight: bold;");
        console.log("Next step in your terminal:\n  python3 scraper.py --import-cards ~/Downloads/cards_raw.json");
    } catch (err) {
        console.error("❌ Extraction failed:", err);
    }
})();
