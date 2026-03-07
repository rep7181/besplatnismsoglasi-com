const { getStore } = require('@netlify/blobs');

exports.handler = async function(event) {
    var headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-cache'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: headers };

    try {
        var store = getStore({
            name: 'besplatnismsoglasi-counter',
            siteID: process.env.MY_SITE_ID,
            token: process.env.MY_TOKEN
        });

        var today = new Date().toISOString().slice(0, 10);
        var dayKey = 'day-' + today;
        var totalKey = 'total';

        var dayData, totalData;
        try { var raw = await store.get(dayKey); dayData = raw ? JSON.parse(raw) : null; } catch(e) { dayData = null; }
        try { var raw2 = await store.get(totalKey); totalData = raw2 ? JSON.parse(raw2) : null; } catch(e) { totalData = null; }

        if (!dayData) dayData = { count: 0 };
        if (!totalData) totalData = { count: 0 };

        if (event.httpMethod === 'POST') {
            dayData.count++;
            totalData.count++;
            await store.set(dayKey, JSON.stringify(dayData));
            await store.set(totalKey, JSON.stringify(totalData));
        }

        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({ today: dayData.count, total: totalData.count, date: today })
        };
    } catch(err) {
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ error: err.message })
        };
    }
};
