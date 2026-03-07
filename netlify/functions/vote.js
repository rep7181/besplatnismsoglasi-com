const { getStore } = require('@netlify/blobs');

function ds() {
    return getStore({ name: 'besplatnismsoglasi-data', siteID: process.env.MY_SITE_ID, token: process.env.MY_TOKEN });
}

async function getData(s, key, def) {
    try { var r = await s.get(key); return r ? JSON.parse(r) : def; } catch(e) { return def; }
}

var CORS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};

exports.handler = async function(event) {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: CORS, body: '' };
    }
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    var body;
    try { body = JSON.parse(event.body); } catch(e) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) };
    }

    var adId = parseInt(body.adId);
    var type = body.type;

    if (!adId || (type !== 'like' && type !== 'dislike')) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'adId i type (like/dislike) su obavezni' }) };
    }

    // Rate limit po IP
    var ip = (event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown').split(',')[0].trim();
    var s = ds();
    var rateKey = 'vote-rate-' + ip.replace(/[^a-zA-Z0-9]/g, '_');
    var rateData = await getData(s, rateKey, { count: 0, ts: 0 });
    var now = Date.now();
    if (now - rateData.ts > 3600000) { rateData = { count: 0, ts: now }; }
    if (rateData.count >= 30) {
        return { statusCode: 429, headers: CORS, body: JSON.stringify({ error: 'Previse glasova. Pricekajte.' }) };
    }
    rateData.count++;
    await s.set(rateKey, JSON.stringify(rateData));

    // Azuriraj oglas
    var ads = await getData(s, 'ads', []);
    var ad = ads.find(function(a) { return a.id === adId; });
    if (!ad) {
        return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'Oglas nije pronadjen' }) };
    }

    if (!ad.likes) ad.likes = 0;
    if (!ad.dislikes) ad.dislikes = 0;

    if (type === 'like') ad.likes++;
    else ad.dislikes++;

    await s.set('ads', JSON.stringify(ads));

    return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({ likes: ad.likes, dislikes: ad.dislikes })
    };
};
