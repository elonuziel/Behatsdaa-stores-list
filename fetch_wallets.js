/**
 * Behatsdaa Rechargeable Cards & Wallets Spending Caps Extractor
 * Generates data/wallets_info.json containing monthly caps, balance limits, and billing rules.
 * 
 * Can be run in Node.js:
 *   node fetch_wallets.js
 * Or pasted directly into the browser DevTools Console on https://www.behatsdaa.org.il
 */

const headers = {
  "OrganizationId": "20",
  "Accept": "application/json"
};

function getColorTheme(walletId) {
  const map = {
    '2809': 'emerald',
    '3336': 'amber',
    '3294': 'blue',
    '2595': 'teal',
    '2110': 'indigo',
    '2868': 'rose'
  };
  return map[String(walletId)] || 'slate';
}

function getBadgeClass(walletId) {
  const map = {
    '2809': 'badge-emerald',
    '3336': 'badge-amber',
    '3294': 'badge-blue',
    '2595': 'badge-teal',
    '2110': 'badge-indigo',
    '2868': 'badge-rose'
  };
  return map[String(walletId)] || 'badge-slate';
}

const KNOWN_SCOPES = {
  '2809': 'רשתות אופנה, הלבשה, הנעלה, ספרים, ספורט ופנאי בפריסה ארצית',
  '3336': 'כרטיס ייעודי למשרתי מילואים פעילים ולוחמים בעלי כרטיס פייטר',
  '3294': 'סניפי קרפור סיטי וקרפור מרקט בלבד',
  '2595': 'סופרמרקטים, רשתות מזון ואתרי אונליין נבחרים',
  '2110': 'רשתות אופנה, ביגוד ומסחר בפריסה ארצית',
  '2868': 'בתי קפה, מסעדות ורשתות מזון מהיר'
};

const KNOWN_DESCRIPTIONS = {
  '2809': 'הנחת רשתות בטעינה מראש של עד 1,000 ₪ בכל פעם עד 3,000 ₪ בחודש. תקף במגוון רשתות מובילות.',
  '3336': 'ארנק בלעדי למחזיקי כרטיס פייטר. כפוף לתקרה חודשית של 2,500 ₪.',
  '3294': 'הנחה ברשת קרפור בסניפי סיטי ומרקט בלבד. אינו כולל סניפי היפר או אתר האונליין.',
  '2595': 'הנחה בטעינה לכרטיס עבור רשתות שיווק מזון ואתרי סחר אונליין.',
  '2110': 'הנחה ברשתות נבחרות בפריסה ארצית עד לתקרה החודשית.',
  '2868': 'הנחה בבתי קפה ומסעדות נבחרות בכל רחבי הארץ.'
};

async function fetchWalletsInfo(outputFilePath = 'data/wallets_info.json') {
  let rawWallets = [];
  let apiData = {};
  try {
    const res = await fetch("https://back.behatsdaa.org.il/api/card/GetChargingCard", { headers });
    if (res.ok) {
      const json = await res.json();
      apiData = json?.data || {};
      rawWallets = apiData.wallets || json?.data || [];
    }
  } catch (err) {
    console.warn("GetChargingCard failed, trying GetCardGeneralInfo fallback...", err.message);
  }

  if (!rawWallets || rawWallets.length === 0) {
    try {
      const res = await fetch("https://back.behatsdaa.org.il/api/cards/GetCardGeneralInfo", { headers });
      if (res.ok) {
        const json = await res.json();
        apiData = json?.data || apiData;
        rawWallets = apiData.wallets || json?.data || [];
      }
    } catch (err) {
      console.warn("GetCardGeneralInfo fallback error:", err.message);
    }
  }

  // Fetch regulations page from official Behatsdaa site (contains terms, refund policy, and caps)
  let regHtml = '';
  if (typeof window === 'undefined') {
    try {
      const regRes = await fetch("https://www.behatsdaa.org.il/card/chargingCard");
      if (regRes.ok) {
        regHtml = await regRes.text();
      }
    } catch (err) {
      console.warn("Could not fetch chargingCard regulations HTML:", err.message);
    }
  } else if (typeof document !== 'undefined' && document.body) {
    regHtml = document.body.innerHTML;
  }

  const caps = {
    monthly_cap_general: 3000,
    monthly_cap_fighter: 2500,
    instant_balance_cap: 1000,
    min_reload: 100,
    daily_cap: "ללא מגבלה יומית נפרדת (בכפוף לתקרה החודשית וליתרת 1,000 ₪ רגעית)"
  };

  // Extract from backend API if provided
  if (apiData.monthlyCap || apiData.generalMonthlyCap) {
    caps.monthly_cap_general = Number(apiData.monthlyCap || apiData.generalMonthlyCap);
  }
  if (apiData.fighterMonthlyCap) {
    caps.monthly_cap_fighter = Number(apiData.fighterMonthlyCap);
  }
  if (apiData.instantBalanceCap || apiData.maxBalance) {
    caps.instant_balance_cap = Number(apiData.instantBalanceCap || apiData.maxBalance);
  }
  if (apiData.minReload || apiData.minDeposit) {
    caps.min_reload = Number(apiData.minReload || apiData.minDeposit);
  }

  // Extract from official regulations page text
  if (regHtml) {
    const cleanText = regHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const mGen = cleanText.match(/(?:תקרה חודשית|תקרת הטעינה מוגבלת ל-?|עד ל?תקרה של)\s*([1-9]\d{0,1}[,\.]?\d{3})\s*₪/);
    if (mGen) caps.monthly_cap_general = parseInt(mGen[1].replace(/[^\d]/g, ''), 10);

    const mFight = cleanText.match(/(?:פייטר|fighter)[^\n.]{0,80}?(?:תקרה|עד)\s*([1-9]\d{0,1}[,\.]?\d{3})\s*₪/i);
    if (mFight) caps.monthly_cap_fighter = parseInt(mFight[1].replace(/[^\d]/g, ''), 10);

    const mInst = cleanText.match(/(?:יתרה רגעית|יתרה מקסימלית|סכום כולל של עד)\s*([1-9]\d{0,1}[,\.]?\d{3})\s*₪/);
    if (mInst) caps.instant_balance_cap = parseInt(mInst[1].replace(/[^\d]/g, ''), 10);

    const mMin = cleanText.match(/(?:טעינה מינימלית|מינימום|החל מ-?)\s*([1-9]\d{1,2})\s*₪/);
    if (mMin) caps.min_reload = parseInt(mMin[1].replace(/[^\d]/g, ''), 10);
  }

  const wallets = rawWallets.map(w => {
    const wid = String(w.walletId || w.id || w.walletID || '').trim();
    const name = (w.walletName || w.name || '').trim();
    const shortName = (w.walletName || w.name || '').replace(/^בהצדעה\s*[-–]?\s*/, '').trim();
    const discount = Number(w.discount || w.discountNumeric || w.discountRate || 0);

    const monthlyCap = (w.monthlyCap || w.monthly_cap)
      ? Number(w.monthlyCap || w.monthly_cap)
      : (wid === '3336' ? caps.monthly_cap_fighter : caps.monthly_cap_general);

    const instantCap = (w.instantCap || w.instant_cap)
      ? Number(w.instantCap || w.instant_cap)
      : caps.instant_balance_cap;

    return {
      id: `card-${wid}`,
      name: name,
      short_name: shortName,
      discount: discount,
      color_theme: getColorTheme(wid),
      badge_class: getBadgeClass(wid),
      monthly_cap: monthlyCap,
      instant_cap: instantCap,
      category_scope: (w.categoryScope || w.scope || w.description || KNOWN_SCOPES[wid] || '').trim(),
      description: (w.terms || w.notes || KNOWN_DESCRIPTIONS[wid] || '').trim()
    };
  });

  const payload = {
    metadata: {
      title: "תנאי שימוש, תקרות טעינה וכללי כרטיסים נטענים - מועדון בהצדעה",
      last_updated: new Date().toISOString(),
      general_caps: caps,
      general_rules: [
        {
          id: "instant_cap",
          title: "תקרת יתרה רגעית (עד 1,000 ₪)",
          summary: "ניתן להחזיק בכרטיס סכום כולל של עד 1,000 ₪ בכל רגע נתון. לאחר ביצוע תשלום בקופה, ניתן לטעון מחדש עד 1,000 ₪ נוספים בכל פעם עד לתקרה החודשית."
        },
        {
          id: "monthly_cap",
          title: `תקרה חודשית קלנדרית (עד ${caps.monthly_cap_general.toLocaleString('en-US')} ₪)`,
          summary: `תקרת הטעינה מוגבלת ל-${caps.monthly_cap_general.toLocaleString('en-US')} ₪ בחודש קלנדרי (פייטר: ${caps.monthly_cap_fighter.toLocaleString('en-US')} ₪).`
        },
        {
          id: "billing_discount",
          title: "חיוב בניכוי ההנחה ובתשלום יחיד",
          summary: "החיוב באשראי בהצדעה מתבצע בתשלום אחד ובסכום המוזל (למשל: 800 ₪ עבור טעינת 1,000 ₪ בארנק של 20%)."
        },
        {
          id: "promotions_stacking",
          title: "כפל מבצעים והנחות סוף עונה",
          summary: "הכרטיס מכובד כולל כפל מבצעים והנחות סוף עונה במרבית הרשתות המובילות."
        }
      ]
    },
    wallets
  };

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    // In-browser execution: download as JSON
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "wallets_info.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log("%c🎉 Successfully generated and downloaded wallets_info.json!", "color: #10b981; font-weight: bold;");
  } else if (typeof require !== 'undefined') {
    const fs = require('fs');
    const path = require('path');
    const dir = path.dirname(outputFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputFilePath, JSON.stringify(payload, null, 2), 'utf-8');
    console.log(`[+] Successfully wrote ${wallets.length} wallets to ${outputFilePath}`);
  }

  return payload;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    fetchWalletsInfo,
    getColorTheme,
    getBadgeClass
  };
}

if (typeof require !== 'undefined' && require.main === module) {
  fetchWalletsInfo().catch(err => {
    console.error("Error executing fetchWalletsInfo:", err);
    process.exit(1);
  });
}
