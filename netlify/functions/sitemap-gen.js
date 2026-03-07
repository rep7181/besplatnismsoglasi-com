const { getStore } = require('@netlify/blobs');

function ds() {
    return getStore({ name: 'besplatnismsoglasi-data', siteID: process.env.MY_SITE_ID, token: process.env.MY_TOKEN });
}

async function getData(s, key, def) {
    try { var r = await s.get(key); return r ? JSON.parse(r) : def; } catch(e) { return def; }
}

var STATIC_PAGES = [
    { loc: '/', priority: '1.0', freq: 'daily' },
    { loc: '/objavi-oglas.html', priority: '0.8', freq: 'weekly' },
    { loc: '/osobni-kontakti.html', priority: '0.9', freq: 'daily' },
    { loc: '/', priority: '0.9', freq: 'daily' },
    { loc: '/vodic.html', priority: '0.7', freq: 'monthly' },
    { loc: '/zagreb.html', priority: '0.9', freq: 'daily' },
    { loc: '/split.html', priority: '0.9', freq: 'daily' },
    { loc: '/rijeka.html', priority: '0.9', freq: 'daily' },
    { loc: '/osijek.html', priority: '0.9', freq: 'daily' },
    { loc: '/zadar.html', priority: '0.8', freq: 'daily' },
    { loc: '/dubrovnik.html', priority: '0.8', freq: 'daily' },
    { loc: '/pula.html', priority: '0.8', freq: 'daily' },
    { loc: '/varazdin.html', priority: '0.8', freq: 'daily' },
    { loc: '/slavonski-brod.html', priority: '0.8', freq: 'daily' },
    { loc: '/karlovac.html', priority: '0.8', freq: 'daily' },
    { loc: '/privatnost.html', priority: '0.3', freq: 'monthly' },
    { loc: '/uvjeti.html', priority: '0.3', freq: 'monthly' }
];

exports.handler = async function(event) {
    var s = ds();
    var ads = await getData(s, 'ads', []);
    var today = new Date().toISOString().substring(0, 10);
    var base = 'https://www.besplatnismsoglasi.com';

    var xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    STATIC_PAGES.forEach(function(p) {
        xml += '  <url>\n';
        xml += '    <loc>' + base + p.loc + '</loc>\n';
        xml += '    <lastmod>' + today + '</lastmod>\n';
        xml += '    <changefreq>' + p.freq + '</changefreq>\n';
        xml += '    <priority>' + p.priority + '</priority>\n';
        xml += '  </url>\n';
    });

    ads.forEach(function(ad) {
        if (ad.reported) return;
        var lastmod = ad.ts ? ad.ts.substring(0, 10) : today;
        xml += '  <url>\n';
        xml += '    <loc>' + base + '/oglas/' + ad.id + '</loc>\n';
        xml += '    <lastmod>' + lastmod + '</lastmod>\n';
        xml += '    <changefreq>weekly</changefreq>\n';
        xml += '    <priority>0.6</priority>\n';
        xml += '  </url>\n';
    });

    xml += '</urlset>';

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=3600'
        },
        body: xml
    };
};
