#!/usr/bin/env node
/**
 * Scraper: sexsmsoglasi.com.hr (On traži nju) -> besplatnismsoglasi.com
 *
 * Usage:
 *   node scraper-sexsmsoglasi.js              # Scrape & post all new
 *   node scraper-sexsmsoglasi.js --dry-run     # Preview only
 *   node scraper-sexsmsoglasi.js --pages=3     # Scrape first 3 pages
 *
 * Cron (every hour): 0 * * * * cd /Users/martin/besplatnismsoglasi-com && node scraper-sexsmsoglasi.js >> /tmp/besplatnismsoglasi-scraper.log 2>&1
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://sexsmsoglasi.com.hr';
const CATEGORY_URL = BASE_URL + '/on-trazi-nju';
const API_URL = 'https://besplatnismsoglasi.com/.netlify/functions/ads';
const ADMIN_KEY = 'smsoglasi2026';
const SEEN_FILE = path.join(__dirname, '.scraped-ids-sms.json');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const MAX_PAGES = parseInt((args.find(a => a.startsWith('--pages=')) || '').split('=')[1]) || 5;
const DELAY = parseInt((args.find(a => a.startsWith('--delay=')) || '').split('=')[1]) || 2000;

function loadSeenIds() {
    try { return JSON.parse(fs.readFileSync(SEEN_FILE, 'utf8')); } catch { return []; }
}
function saveSeenIds(ids) {
    fs.writeFileSync(SEEN_FILE, JSON.stringify(ids));
}

const REGION_MAP = {
    'zagreb': 'Grad Zagreb', 'velika gorica': 'Grad Zagreb', 'samobor': 'Grad Zagreb',
    'split': 'Dalmacija', 'zadar': 'Dalmacija', 'dubrovnik': 'Dalmacija', 'šibenik': 'Dalmacija', 'sibenik': 'Dalmacija', 'makarska': 'Dalmacija', 'trogir': 'Dalmacija',
    'osijek': 'Slavonija', 'slavonski brod': 'Slavonija', 'vukovar': 'Slavonija', 'vinkovci': 'Slavonija', 'požega': 'Slavonija', 'pozega': 'Slavonija',
    'rijeka': 'Istra i Primorje', 'pula': 'Istra i Primorje', 'opatija': 'Istra i Primorje', 'rovinj': 'Istra i Primorje', 'poreč': 'Istra i Primorje', 'porec': 'Istra i Primorje', 'umag': 'Istra i Primorje',
    'varaždin': 'Središnja Hrvatska', 'varazdin': 'Središnja Hrvatska', 'karlovac': 'Središnja Hrvatska', 'sisak': 'Središnja Hrvatska', 'bjelovar': 'Središnja Hrvatska', 'čakovec': 'Središnja Hrvatska', 'cakovec': 'Središnja Hrvatska', 'koprivnica': 'Središnja Hrvatska',
    'slavonija': 'Slavonija', 'dalmacija': 'Dalmacija', 'istra': 'Istra i Primorje',
};

function detectCity(desc) {
    const d = (desc || '').toLowerCase();
    const cities = ['zagreb', 'split', 'rijeka', 'osijek', 'zadar', 'dubrovnik', 'pula', 'varaždin', 'varazdin',
        'slavonski brod', 'karlovac', 'šibenik', 'sibenik', 'vukovar', 'sisak', 'makarska', 'čakovec', 'cakovec',
        'koprivnica', 'bjelovar', 'vinkovci', 'požega', 'pozega', 'opatija', 'rovinj', 'poreč', 'porec', 'umag',
        'trogir', 'velika gorica', 'samobor'];
    for (const city of cities) {
        if (d.includes(city)) {
            const proper = city.charAt(0).toUpperCase() + city.slice(1);
            return proper.replace('varazdin', 'Varaždin').replace('cakovec', 'Čakovec')
                .replace('sibenik', 'Šibenik').replace('pozega', 'Požega').replace('porec', 'Poreč');
        }
    }
    return '';
}

function detectRegion(desc) {
    const city = detectCity(desc).toLowerCase();
    if (city) {
        for (const [key, val] of Object.entries(REGION_MAP)) {
            if (city.includes(key)) return val;
        }
    }
    // Try region keywords in description
    const d = (desc || '').toLowerCase();
    for (const [key, val] of Object.entries(REGION_MAP)) {
        if (d.includes(key)) return val;
    }
    return 'Grad Zagreb';
}

function detectType(d) {
    d = (d || '').toLowerCase();
    if (d.includes('veza') || d.includes('partner') || d.includes('ozbiljn')) return 'veza';
    if (d.includes('diskret') || d.includes('tajn')) return 'diskretno';
    if (d.includes('chat') || d.includes('dopis')) return 'chat';
    if (d.includes('dejt') || d.includes('kava') || d.includes('upozna')) return 'date';
    return 'hookup';
}

function detectActs(d) {
    d = (d || '').toLowerCase();
    const acts = [];
    if (d.includes('oral') || d.includes('puš') || d.includes('pus') || d.includes('blow')) acts.push('Oralno');
    if (d.includes('anal')) acts.push('Analno');
    if (d.includes('masaž') || d.includes('masaz')) acts.push('Masaza');
    if (d.includes('fetish') || d.includes('fetiš') || d.includes('bdsm')) acts.push('Fetish');
    if (d.includes('69')) acts.push('69');
    if (d.includes('doggy')) acts.push('Doggy');
    if (d.includes('ljubl') || d.includes('kiss')) acts.push('Ljubljenje');
    return acts;
}

function detectLocs(d) {
    d = (d || '').toLowerCase();
    const locs = [];
    if (d.includes('stan') || d.includes('kod mene') || d.includes('prostor') || d.includes('doma')) locs.push('Vlastiti prostor');
    if (d.includes('auto') || d.includes('parkir') || d.includes('autu')) locs.push('Auto');
    if (d.includes('hotel') || d.includes('apart')) locs.push('Hotel');
    if (d.includes('vani') || d.includes('priroda') || d.includes('šum') || d.includes('park')) locs.push('Vani');
    if (d.includes('putova') || d.includes('dolaz') || d.includes('mogu doć')) locs.push('Mogu putovati');
    return locs;
}

function extractAge(desc) {
    const d = (desc || '');
    // Common patterns: "48 god", "28g", "imam 35", "/35/", age/height/weight like "53/185/120"
    const patterns = [
        /(\d{2})\s*god/i,
        /imam\s*(\d{2})/i,
        /(\d{2})\s*g[,.\s]/i,
        /^[^/]*\/(\d{2})\/\d{2,3}\/\d{2,3}/,  // format like 53/185/120
        /\b(\d{2})\/\d{2,3}\/\d{2,3}\b/,
    ];
    for (const p of patterns) {
        const m = d.match(p);
        if (m) {
            const age = parseInt(m[1]);
            if (age >= 18 && age <= 70) return age;
        }
    }
    return 30;
}

function extractPhone(desc, partialPhone) {
    // Try to find full phone in description
    const d = (desc || '');
    const phonePatterns = [
        /(\+385\s?\d[\d\s-]{7,12})/,
        /(0\d{1,2}[\s/-]?\d{3,4}[\s/-]?\d{3,4})/,
        /(\d{3}\s?\d{3,4}\s?\d{3,4})/,
    ];
    for (const p of phonePatterns) {
        const m = d.match(p);
        if (m) {
            let phone = m[1].replace(/[\s-]/g, '');
            if (phone.startsWith('0')) phone = '+385' + phone.substring(1);
            if (phone.length >= 10) return phone;
        }
    }
    return '';
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchPage(url) {
    const res = await fetch(url);
    return await res.text();
}

function parseListingPage(html) {
    const ads = [];
    // Match each apAdBox
    const adBoxRegex = /<div class="apAdBox col100">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
    let match;

    while ((match = adBoxRegex.exec(html)) !== null) {
        const block = match[1];
        const ad = {};

        // ID
        const idMatch = block.match(/singleAd\((\d+)\)/);
        ad.id = idMatch ? idMatch[1] : null;

        // Date
        const dateMatch = block.match(/apAdBoxHeaderDate">\s*([^<]+)/);
        ad.date = dateMatch ? dateMatch[1].trim() : '';

        // Partial phone
        const phoneMatch = block.match(/apAdBoxHeaderPhone">\s*([^<]+)/);
        ad.partialPhone = phoneMatch ? phoneMatch[1].trim() : '';

        // Description
        const descMatch = block.match(/apAdBoxContentSingleLeft">\s*([\s\S]*?)\s*<\/div>/);
        ad.desc = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '';

        // Is bold (promoted)
        ad.isBold = block.includes('adBoxContentBold');

        if (ad.id && ad.desc) ads.push(ad);
    }

    return ads;
}

function hasNextPage(html, currentPage) {
    // Check if there's a link to the next page
    return html.includes('/strana/' + (currentPage + 1));
}

async function postAd(ad) {
    const city = detectCity(ad.desc);
    const region = detectRegion(ad.desc);
    const phone = extractPhone(ad.desc, ad.partialPhone);

    const payload = {
        adminKey: ADMIN_KEY,
        nick: '',
        age: extractAge(ad.desc),
        height: 0,
        weight: 0,
        rk: region,
        ct: city || 'Zagreb',
        wa: phone,
        vb: '',
        em: '',
        d: ad.desc.substring(0, 1000),
        tp: detectType(ad.desc),
        acts: detectActs(ad.desc),
        locs: detectLocs(ad.desc)
    };

    if (DRY_RUN) {
        console.log('  [DRY RUN] Would post:', payload.age + 'g', payload.ct, '|', payload.d.substring(0, 80));
        console.log('    Phone:', phone || '(none)', '| Region:', region, '| Type:', payload.tp);
        return { ok: true, dry: true };
    }

    const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    return await res.json();
}

async function main() {
    const startTime = new Date().toISOString();
    console.log(`\n=== Scraper: sexsmsoglasi.com.hr -> besplatnismsoglasi.com ===`);
    console.log(`Time: ${startTime} | Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'} | Pages: ${MAX_PAGES} | Delay: ${DELAY}ms\n`);

    const seenIds = loadSeenIds();
    console.log(`Previously scraped: ${seenIds.length} ads\n`);

    let posted = 0, skipped = 0, errors = 0, dupes = 0, noPhone = 0;

    for (let page = 1; page <= MAX_PAGES; page++) {
        const url = page === 1 ? CATEGORY_URL : CATEGORY_URL + '/strana/' + page;
        console.log(`--- Page ${page}: ${url}`);

        try {
            const html = await fetchPage(url);
            const ads = parseListingPage(html);
            console.log(`  Found ${ads.length} ads on page ${page}`);

            if (!ads.length) {
                console.log('  No ads found, stopping.');
                break;
            }

            for (const ad of ads) {
                // Skip already scraped
                if (seenIds.includes(ad.id)) {
                    dupes++;
                    continue;
                }

                // Need description
                if (!ad.desc || ad.desc.length < 10) {
                    console.log(`  [${ad.id}] SKIP: too short`);
                    skipped++;
                    if (ad.id) seenIds.push(ad.id);
                    continue;
                }

                // Try to extract phone from description
                const phone = extractPhone(ad.desc, ad.partialPhone);
                if (!phone) {
                    console.log(`  [${ad.id}] SKIP: no phone found in text`);
                    noPhone++;
                    if (ad.id) seenIds.push(ad.id);
                    continue;
                }

                console.log(`  [${ad.id}] ${ad.desc.substring(0, 70)}...`);

                try {
                    const result = await postAd(ad);
                    if (result.ok) {
                        console.log(`    POSTED${result.ad ? ' -> ID ' + result.ad.id : ''}`);
                        posted++;
                        if (ad.id) seenIds.push(ad.id);
                    } else {
                        console.log(`    ERROR: ${result.error || JSON.stringify(result)}`);
                        errors++;
                    }
                } catch (e) {
                    console.error(`    ERROR:`, e.message);
                    errors++;
                }

                await sleep(DELAY);
            }

            // Check if there's a next page
            if (!hasNextPage(html, page)) {
                console.log('  No more pages.');
                break;
            }

            await sleep(DELAY);
        } catch (e) {
            console.error(`  Page ${page} ERROR:`, e.message);
            errors++;
        }
    }

    // Save seen IDs (keep last 10000)
    if (!DRY_RUN) {
        const trimmed = seenIds.slice(-10000);
        saveSeenIds(trimmed);
    }

    console.log(`\n=== Results ===`);
    console.log(`Posted: ${posted} | Skipped: ${skipped} | Dupes: ${dupes} | No phone: ${noPhone} | Errors: ${errors}`);
    console.log(`Total seen IDs: ${seenIds.length}\n`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
