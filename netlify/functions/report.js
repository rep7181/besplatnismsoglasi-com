const { getStore } = require('@netlify/blobs');

const CORS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};

function ds() {
    return getStore({ name: 'besplatnismsoglasi-data', siteID: process.env.MY_SITE_ID, token: process.env.MY_TOKEN });
}

function esc(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

var VALID_REASONS = ['Neprimjeren sadrzaj', 'Spam', 'Maloljetnik', 'Prevara', 'Ostalo'];

exports.handler = async function(event) {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS };
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: '{"error":"Method not allowed"}' };

    try {
        var s = ds();
        var body = JSON.parse(event.body);

        var adId = parseInt(body.adId);
        if (!adId || adId < 1) return { statusCode: 400, headers: CORS, body: '{"error":"Invalid ad ID"}' };

        var ip = (event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown').split(',')[0].trim();
        var rateKey = 'rpt-rate-' + ip.replace(/[^a-zA-Z0-9.:]/g, '_');
        var rateData;
        try { var rr = await s.get(rateKey); rateData = rr ? JSON.parse(rr) : null; } catch(e) { rateData = null; }
        var now = Date.now();
        if (!rateData) rateData = { count: 0, first: now };
        if (now - rateData.first > 3600000) { rateData = { count: 0, first: now }; }
        if (rateData.count >= 10) {
            return { statusCode: 429, headers: CORS, body: '{"error":"Previse prijava. Pricekajte."}' };
        }
        rateData.count++;
        await s.set(rateKey, JSON.stringify(rateData));

        var reason = VALID_REASONS.indexOf(body.reason) > -1 ? body.reason : 'Ostalo';
        var text = esc((body.text || '').substring(0, 500));

        var reports;
        try { var r = await s.get('reports'); reports = r ? JSON.parse(r) : []; } catch(e) { reports = []; }
        reports.push({
            adId: adId,
            reason: reason,
            text: text,
            ip: ip.substring(0, 45),
            ts: new Date().toISOString()
        });
        if (reports.length > 1000) reports = reports.slice(-1000);
        await s.set('reports', JSON.stringify(reports));

        var ads;
        try { var r2 = await s.get('ads'); ads = r2 ? JSON.parse(r2) : []; } catch(e) { ads = []; }
        var ad = ads.find(function(a) { return a.id === adId; });
        if (ad) {
            ad.reported = true;
            await s.set('ads', JSON.stringify(ads));
        }

        return { statusCode: 200, headers: CORS, body: '{"ok":true}' };
    } catch(err) {
        return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
    }
};
