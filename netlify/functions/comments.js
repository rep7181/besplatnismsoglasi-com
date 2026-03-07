const { getStore } = require('@netlify/blobs');

function ds() {
    return getStore({ name: 'besplatnismsoglasi-data', siteID: process.env.MY_SITE_ID, token: process.env.MY_TOKEN });
}

async function getData(s, key, def) {
    try { var r = await s.get(key); return r ? JSON.parse(r) : def; } catch(e) { return def; }
}

function esc(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

var CORS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};

exports.handler = async function(event) {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: CORS, body: '' };
    }

    var s = ds();

    // GET - dohvati komentare za oglas
    if (event.httpMethod === 'GET') {
        var adId = parseInt(event.queryStringParameters && event.queryStringParameters.adId);
        if (!adId) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'adId je obavezan' }) };

        var all = await getData(s, 'comments', {});
        var comments = all[adId] || [];
        return { statusCode: 200, headers: CORS, body: JSON.stringify(comments) };
    }

    // POST - dodaj komentar
    if (event.httpMethod === 'POST') {
        var body;
        try { body = JSON.parse(event.body); } catch(e) {
            return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) };
        }

        var adId = parseInt(body.adId);
        var nick = (body.nick || '').trim().substring(0, 30);
        var text = (body.text || '').trim().substring(0, 500);

        if (!adId) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'adId je obavezan' }) };
        if (!text || text.length < 2) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Komentar je prekratak' }) };
        if (!nick) nick = 'Anonimno';

        // Rate limit po IP
        var ip = (event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown').split(',')[0].trim();
        var rateKey = 'cmt-rate-' + ip.replace(/[^a-zA-Z0-9]/g, '_');
        var rateData = await getData(s, rateKey, { count: 0, ts: 0 });
        var now = Date.now();
        if (now - rateData.ts > 3600000) { rateData = { count: 0, ts: now }; }
        if (rateData.count >= 5) {
            return { statusCode: 429, headers: CORS, body: JSON.stringify({ error: 'Previse komentara. Pricekajte sat vremena.' }) };
        }
        rateData.count++;
        await s.set(rateKey, JSON.stringify(rateData));

        // Provjeri da oglas postoji
        var ads = await getData(s, 'ads', []);
        var ad = ads.find(function(a) { return a.id === adId; });
        if (!ad) return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'Oglas nije pronadjen' }) };

        // Dodaj komentar
        var all = await getData(s, 'comments', {});
        if (!all[adId]) all[adId] = [];

        // Max 50 komentara po oglasu
        if (all[adId].length >= 50) {
            all[adId] = all[adId].slice(-49);
        }

        var comment = {
            id: Date.now(),
            nick: esc(nick),
            text: esc(text),
            ts: new Date().toISOString()
            // Nema IP, nema osobnih podataka - GDPR compliant
        };

        all[adId].push(comment);
        await s.set('comments', JSON.stringify(all));

        return { statusCode: 201, headers: CORS, body: JSON.stringify(comment) };
    }

    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };
};
