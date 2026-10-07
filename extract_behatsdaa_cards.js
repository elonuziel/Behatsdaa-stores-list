/**
 * Behatsdaa Rechargeable Cards & Chains In-Browser Extractor
 * 
 * Instructions:
 * 1. Open your logged-in tab of https://www.behatsdaa.org.il
 * 2. Press F12 -> switch to the 'Console' tab
 * 3. Paste all the code below and press Enter.
 * 4. It will query all rechargeable wallets and their participating chains in parallel.
 * 5. It will automatically download 'cards_raw.json' to your browser's Downloads folder.
 */
(async function() {
    console.log("%c🚀 Starting Behatsdaa Rechargeable Cards Extractor...", "color: #3b82f6; font-size: 14px; font-weight: bold;");
    const headers = {
        "OrganizationId": "20",
        "Accept": "application/json"
    };

    try {
        console.log("💳 [1/2] Fetching wallet general information...");
        const genRes = await window.fetch("https://back.behatsdaa.org.il/api/cards/GetCardGeneralInfo", {
            headers,
            credentials: "include"
        });
        const genJson = await genRes.json();
        const wallets = genJson?.data?.wallets || [];

        if (!wallets || wallets.length === 0) {
            console.error("❌ No wallets returned. Please ensure you are logged in to Behatsdaa.");
            return;
        }

        console.log(`[+] Found ${wallets.length} wallets. Fetching participating chains in parallel...`);

        const results = await Promise.all(
            wallets.map(async (w) => {
                const wid = w.walletID;
                const wname = (w.walletName || `Wallet ${wid}`).trim();
                try {
                    const chainRes = await window.fetch(`https://back.behatsdaa.org.il/api/cards/GetWalletChain?walletId=${wid}`, {
                        headers,
                        credentials: "include"
                    });
                    const chainJson = await chainRes.json();
                    const categories = chainJson?.data || [];
                    console.log(`  [*] Card '${wname}' (id ${wid}): fetched chains successfully.`);
                    return {
                        wallet: w,
                        categories: categories
                    };
                } catch (err) {
                    console.warn(`  [!] Error fetching chains for card ${wid}:`, err);
                    return {
                        wallet: w,
                        error: err.toString(),
                        categories: []
                    };
                }
            })
        );

        console.log("💾 [2/2] Generating download of cards_raw.json...");
        const output = { ok: true, results };
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

