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

var TL = { hookup:'Hookup', date:'Dejt', chat:'Chat', diskretno:'Diskretno', veza:'Veza', parovi:'Parovi', trojka:'Trojka', 'ona-trazi-nju':'Ona traži nju' };

function maskPhone(ph) {
    if (!ph || ph.length < 7) return ph || '';
    return ph.substring(0, 7) + ' ** ** **';
}

function relTime(ts) {
    var d = Date.now() - new Date(ts).getTime();
    var m = Math.floor(d / 60000);
    if (m < 1) return 'upravo';
    if (m < 60) return 'prije ' + m + ' min';
    var h = Math.floor(m / 60);
    if (h < 24) return 'prije ' + h + 'h';
    var dd = Math.floor(h / 24);
    return 'prije ' + dd + 'd';
}

function buildRelatedHtml(relatedAds) {
    if (!relatedAds || !relatedAds.length) return '';
    var html = '<div class="related"><h3>Sli\u010dni oglasi</h3><div class="related-grid">';
    relatedAds.forEach(function(a) {
        var typeLabel = TL[a.tp] || 'Hookup';
        html += '<a href="/oglas/' + a.id + '" class="rel-card">' +
            '<div class="rel-nick">' + esc(a.nick || 'Muskarac') + ', ' + a.age + '</div>' +
            '<div class="rel-meta">' + esc(a.ct || '') + ' &middot; ' + typeLabel + '</div>' +
            '<div class="rel-desc">' + esc(a.d || '').substring(0, 100) + (a.d && a.d.length > 100 ? '...' : '') + '</div>' +
            '</a>';
    });
    html += '</div></div>';
    return html;
}

function buildAdPage(ad, relatedAds) {
    var nick = esc(ad.nick || 'Anonimno');
    var countryLabel = ad.country === 'RS' ? 'Srbija' : ad.country === 'BA' ? 'BiH' : 'Hrvatska';
    var city = esc(ad.ct || countryLabel);
    var region = esc(ad.rk || '');
    var desc = esc(ad.d || '');
    var descShort = desc.substring(0, 155);
    var typeLabel = TL[ad.tp] || 'Hookup';
    var age = ad.age || 25;
    var title = nick + ', ' + age + ' - Sex oglas ' + city + ' | BesplatniSMSOglasi';
    var url = 'https://www.besplatnismsoglasi.com/oglas/' + ad.id;
    var isNew = (Date.now() - new Date(ad.ts).getTime()) < 3600000;

    var prefHtml = '';
    if (ad.acts && ad.acts.length) prefHtml += ad.acts.map(function(a) { return '<span class="pref-tag pref-act">' + esc(a) + '</span>'; }).join('');
    if (ad.locs && ad.locs.length) prefHtml += ad.locs.map(function(a) { return '<span class="pref-tag pref-loc">' + esc(a) + '</span>'; }).join('');

    var contactHtml = '';
    if (ad.wa) contactHtml += '<span class="wa-tag blurred" onclick="reveal(this)" data-v="' + esc(ad.wa) + '" title="Kliknite za prikaz">WhatsApp: ' + maskPhone(ad.wa) + '</span>';
    var vbNum = ad.vb || ad.wa;
    if (vbNum) contactHtml += '<span class="vb-tag blurred" onclick="reveal(this)" data-v="' + esc(vbNum) + '" title="Kliknite za prikaz">Viber: ' + maskPhone(vbNum) + '</span>';
    if (ad.em) contactHtml += '<span class="em-tag blurred" onclick="reveal(this)" data-v="' + esc(ad.em) + '" title="Kliknite za prikaz">' + esc(ad.em).substring(0, 3) + '*****</span>';

    return '<!DOCTYPE html>\n<html lang="hr">\n<head>\n' +
        '<meta charset="UTF-8">\n' +
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
        '<title>' + title + '</title>\n' +
        '<meta name="description" content="' + descShort + '">\n' +
        '<meta name="keywords" content="sex oglas ' + city + ', kontakti ' + city + ', on trazi nju ' + city + ', hookup ' + city + '">\n' +
        '<meta name="robots" content="index, follow">\n' +
        '<link rel="canonical" href="' + url + '">\n' +
        '<meta property="og:title" content="' + nick + ', ' + age + ' - Sex oglas ' + city + '">\n' +
        '<meta property="og:description" content="' + descShort + '">\n' +
        '<meta property="og:url" content="' + url + '">\n' +
        '<meta property="og:type" content="article">\n' +
        '<meta property="og:locale" content="hr_HR">\n' +
        '<meta property="og:image" content="https://www.besplatnismsoglasi.com/og-image.svg">\n' +
        '<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><text y=\'.9em\' font-size=\'90\'>&#9794;</text></svg>">\n' +
        '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
        '<link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap" rel="stylesheet">\n' +
        '<style>\n' +
        '*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}\n' +
        'body{font-family:\'Lato\',sans-serif;background:#eef0f3;color:#222;line-height:1.5;font-size:14px;transition:background .3s,color .3s}\n' +
        'a{color:#2980b9;text-decoration:none}a:hover{text-decoration:underline}\n' +
        '.wrap{max-width:980px;margin:0 auto;padding:0 10px}\n' +
        'body.dark{background:#181820;color:#ccc}\n' +
        'body.dark .topbar{background:#2c3e50}\n' +
        'body.dark .site-header{background:#1e1e2a;border-color:#34495e}\n' +
        'body.dark .site-nav{background:#1a1a26}\n' +
        'body.dark .item{background:#1e1e2a;border-color:#2a2a38}\n' +
        'body.dark .item:hover{border-color:#3498db}\n' +
        'body.dark .item-desc{color:#999}\n' +
        'body.dark .item-meta{color:#777}\n' +
        'body.dark .site-footer{background:#1e1e2a;border-color:#34495e}\n' +
        '.topbar{background:#34495e;color:#bdc3c7;font-size:12px;padding:5px 0;transition:background .3s}\n' +
        '.topbar .wrap{display:flex;justify-content:space-between;align-items:center}\n' +
        '.topbar a{color:#ecf0f1}\n' +
        '.theme-toggle{background:none;border:1px solid #7f8c8d;color:#bdc3c7;padding:3px 10px;border-radius:3px;font-size:11px;cursor:pointer;font-family:inherit}\n' +
        '.theme-toggle:hover{border-color:#ecf0f1;color:#ecf0f1}\n' +
        '.site-header{background:#fff;border-bottom:3px solid #2c3e50;padding:10px 0;transition:all .3s}\n' +
        '.header-inner{display:flex;align-items:center;justify-content:space-between}\n' +
        '.logo{font-size:24px;font-weight:900;color:#2c3e50}\n' +
        '.logo span{color:#e74c3c}\n' +
        '.logo small{display:block;font-size:12px;font-weight:400;color:#7f8c8d;margin-top:-2px}\n' +
        '.site-nav{background:#2c3e50;transition:background .3s}\n' +
        '.site-nav ul{list-style:none;display:flex;flex-wrap:wrap}\n' +
        '.site-nav a{display:block;padding:9px 16px;color:#bdc3c7;font-size:13px;font-weight:700;transition:background .15s}\n' +
        '.site-nav a:hover{background:rgba(0,0,0,.2);color:#ecf0f1;text-decoration:none}\n' +
        '.item{background:#fff;border:1px solid #ddd;border-radius:3px;padding:12px;margin-bottom:10px;transition:all .2s;position:relative}\n' +
        '.item:hover{border-color:#3498db;box-shadow:0 1px 6px rgba(0,0,0,.06)}\n' +
        '.item-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px}\n' +
        '.item-who{font-weight:700;font-size:14px}\n' +
        '.item-time{font-size:11px;color:#bdc3c7}\n' +
        '.item-meta{font-size:12px;color:#95a5a6;margin-bottom:6px}\n' +
        '.item-desc{font-size:13px;color:#555;line-height:1.5;margin-bottom:8px;word-wrap:break-word;overflow-wrap:break-word}\n' +
        '.item-bottom{display:flex;align-items:center;gap:6px;flex-wrap:wrap}\n' +
        '.wa-tag{display:inline-flex;align-items:center;gap:4px;background:#e8f5e9;color:#27ae60;padding:3px 10px;border-radius:2px;font-size:12px;font-weight:700;border:1px solid #c8e6c9;cursor:pointer;transition:filter .3s}\n' +
        '.wa-tag:hover{background:#c8e6c9}\n' +
        '.vb-tag{display:inline-flex;align-items:center;gap:4px;background:#f3e5f5;color:#7b1fa2;padding:3px 10px;border-radius:2px;font-size:12px;font-weight:700;border:1px solid #e1bee7;cursor:pointer;transition:filter .3s}\n' +
        '.vb-tag:hover{background:#e1bee7}\n' +
        '.em-tag{display:inline-flex;align-items:center;gap:4px;background:#eaf2f8;color:#2980b9;padding:3px 10px;border-radius:2px;font-size:12px;font-weight:700;border:1px solid #d4e6f1;cursor:pointer;transition:filter .3s}\n' +
        '.em-tag:hover{background:#d4e6f1}\n' +
        '.type-tag{display:inline-block;background:#f4ecf7;color:#8e44ad;padding:2px 7px;border-radius:2px;font-size:11px;font-weight:700;border:1px solid #e8daef}\n' +
        '.views-tag{display:inline-flex;align-items:center;gap:3px;font-size:11px;color:#bdc3c7;margin-left:4px}\n' +
        '.pref-tag{display:inline-block;padding:1px 6px;border-radius:2px;font-size:10px;font-weight:700;margin:1px 2px}\n' +
        '.pref-act{background:#fce4ec;color:#c0392b;border:1px solid #f5b7b1}\n' +
        '.pref-loc{background:#e8f5e9;color:#27ae60;border:1px solid #a9dfbf}\n' +
        '.new-dot{position:absolute;top:8px;right:8px;background:#e74c3c;color:#fff;font-size:9px;font-weight:900;padding:1px 5px;border-radius:2px;text-transform:uppercase}\n' +
        '.vip-dot{position:absolute;top:8px;left:8px;background:#f39c12;color:#000;font-size:9px;font-weight:900;padding:1px 5px;border-radius:2px;text-transform:uppercase}\n' +
        '.item.vip-item{border-color:#f39c12;border-width:2px;box-shadow:0 0 8px rgba(243,156,18,.15);padding-top:28px}\n' +
        'body.dark .item.vip-item{border-color:#f39c12;box-shadow:0 0 8px rgba(243,156,18,.1)}\n' +
        '.breadcrumb{font-size:12px;color:#95a5a6;margin:14px 0 8px;padding:0}\n' +
        '.breadcrumb a{color:#2980b9}\n' +
        '.back-link{display:inline-block;margin:16px 0;padding:10px 24px;background:#27ae60;color:#fff;border-radius:3px;font-weight:700;font-size:13px;text-decoration:none}\n' +
        '.back-link:hover{background:#219a52;text-decoration:none}\n' +
        '.site-footer{background:#fff;border-top:3px solid #2c3e50;padding:16px 0;margin-top:30px;text-align:center;font-size:12px;color:#95a5a6;transition:all .3s}\n' +
        '.vote-bar{display:flex;gap:10px;margin:12px 0;align-items:center}\n' +
        '.vote-btn{display:inline-flex;align-items:center;gap:5px;padding:6px 14px;border-radius:3px;border:1px solid #ddd;background:#fff;cursor:pointer;font-family:inherit;font-size:13px;font-weight:700;transition:all .2s}\n' +
        '.vote-btn:hover{border-color:#3498db}\n' +
        '.vote-btn.like-btn{color:#27ae60}.vote-btn.like-btn:hover,.vote-btn.like-btn.voted{background:#e8f5e9;border-color:#27ae60}\n' +
        '.vote-btn.dislike-btn{color:#e74c3c}.vote-btn.dislike-btn:hover,.vote-btn.dislike-btn.voted{background:#fce4ec;border-color:#e74c3c}\n' +
        '.vote-btn .cnt{font-weight:400;color:#95a5a6;font-size:12px}\n' +
        'body.dark .vote-btn{background:#1e1e2a;border-color:#2a2a38;color:#ccc}\n' +
        'body.dark .vote-btn.like-btn{color:#27ae60}body.dark .vote-btn.dislike-btn{color:#e74c3c}\n' +
        '.share-bar{display:flex;gap:8px;margin:10px 0;flex-wrap:wrap}\n' +
        '.share-btn{display:inline-flex;align-items:center;gap:4px;padding:5px 12px;border-radius:3px;font-size:12px;font-weight:700;text-decoration:none;border:1px solid #ddd;transition:all .2s;cursor:pointer;font-family:inherit;background:#fff}\n' +
        '.share-btn:hover{text-decoration:none;border-color:#3498db}\n' +
        '.share-wa{color:#27ae60;border-color:#c8e6c9}.share-wa:hover{background:#e8f5e9}\n' +
        '.share-copy{color:#2980b9;border-color:#d4e6f1}.share-copy:hover{background:#eaf2f8}\n' +
        'body.dark .share-btn{background:#1e1e2a;border-color:#2a2a38}\n' +
        '.related{margin:24px 0}\n' +
        '.related h3{font-size:15px;margin-bottom:10px;color:#2c3e50}\n' +
        'body.dark .related h3{color:#ccc}\n' +
        '.related-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}\n' +
        '.rel-card{background:#fff;border:1px solid #ddd;border-radius:3px;padding:10px;transition:all .2s;text-decoration:none;color:inherit;display:block}\n' +
        '.rel-card:hover{border-color:#3498db;text-decoration:none;box-shadow:0 1px 6px rgba(0,0,0,.06)}\n' +
        '.rel-nick{font-weight:700;font-size:13px}.rel-meta{font-size:11px;color:#95a5a6;margin:2px 0}\n' +
        '.rel-desc{font-size:12px;color:#777;line-height:1.4;max-height:40px;overflow:hidden}\n' +
        'body.dark .rel-card{background:#1e1e2a;border-color:#2a2a38}body.dark .rel-card:hover{border-color:#3498db}\n' +
        'body.dark .rel-desc{color:#888}\n' +
        '.comments{margin:24px 0}\n' +
        '.comments h3{font-size:15px;margin-bottom:10px;color:#2c3e50}\n' +
        'body.dark .comments h3{color:#ccc}\n' +
        '.cmt-form{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap}\n' +
        '.cmt-nick{width:120px;padding:7px 9px;border:1px solid #ccc;border-radius:3px;font-family:inherit;font-size:13px}\n' +
        '.cmt-text{flex:1;min-width:200px;padding:7px 9px;border:1px solid #ccc;border-radius:3px;font-family:inherit;font-size:13px}\n' +
        '.cmt-nick:focus,.cmt-text:focus{outline:none;border-color:#3498db}\n' +
        'body.dark .cmt-nick,body.dark .cmt-text{background:#16161e;border-color:#2a2a38;color:#ccc}\n' +
        '.cmt-send{padding:7px 18px;background:#2c3e50;color:#fff;border:none;border-radius:3px;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer}\n' +
        '.cmt-send:hover{background:#1a252f}\n' +
        '.cmt-send:disabled{opacity:.5;cursor:not-allowed}\n' +
        '.cmt-list{list-style:none}\n' +
        '.cmt-item{background:#fff;border:1px solid #ddd;border-radius:3px;padding:10px;margin-bottom:6px;transition:all .2s}\n' +
        'body.dark .cmt-item{background:#1e1e2a;border-color:#2a2a38}\n' +
        '.cmt-item-head{display:flex;justify-content:space-between;margin-bottom:4px}\n' +
        '.cmt-item-nick{font-weight:700;font-size:13px;color:#2c3e50}\n' +
        'body.dark .cmt-item-nick{color:#3498db}\n' +
        '.cmt-item-time{font-size:11px;color:#bdc3c7}\n' +
        '.cmt-item-text{font-size:13px;color:#555;line-height:1.5;word-wrap:break-word}\n' +
        'body.dark .cmt-item-text{color:#999}\n' +
        '.cmt-empty{font-size:13px;color:#95a5a6;font-style:italic}\n' +
        '.cmt-gdpr{font-size:11px;color:#bdc3c7;margin-top:6px}\n' +
        '.cookie-banner{position:fixed;bottom:0;left:0;right:0;z-index:9999;background:#2c3e50;color:#bdc3c7;padding:10px 16px;display:flex;align-items:center;justify-content:center;gap:12px;font-size:12px;flex-wrap:wrap}\n' +
        '.cookie-banner.hidden{display:none}\n' +
        '.cookie-banner a{color:#3498db}\n' +
        '.ck-btn{padding:6px 16px;border:none;border-radius:3px;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer}\n' +
        '.ck-accept{background:#27ae60;color:#fff}\n' +
        '.ck-decline{background:#7f8c8d;color:#fff}\n' +
        '.toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#2c3e50;color:#fff;padding:8px 20px;border-radius:3px;font-size:13px;font-weight:700;z-index:9998;opacity:0;transition:opacity .3s}\n' +
        '.toast.show{opacity:1}\n' +
        '@media(max-width:700px){.header-inner{flex-direction:column;gap:6px;text-align:center}.site-nav a{padding:8px 10px;font-size:12px}.item-bottom{font-size:11px}.wa-tag,.em-tag,.vb-tag{font-size:11px;padding:2px 7px}.topbar{font-size:11px}.related-grid{grid-template-columns:1fr}}\n' +
        '</style>\n' +
        '<script type="application/ld+json">\n' +
        JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ClassifiedAd",
            "name": (ad.nick || 'Muskarac') + ', ' + age + ' - ' + (ad.ct || 'Hrvatska'),
            "description": ad.d || '',
            "datePosted": ad.ts || '',
            "url": url,
            "areaServed": { "@type": "City", "name": ad.ct || 'Hrvatska' }
        }) + '\n</script>\n' +
        '<script type="application/ld+json">\n' +
        JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "SMS Oglasi", "item": "https://www.besplatnismsoglasi.com/" },
                { "@type": "ListItem", "position": 2, "name": nick + ', ' + age, "item": url }
            ]
        }) + '\n</script>\n' +
        '<!-- Google tag (gtag.js) -->\n' +
        '<script async src="https://www.googletagmanager.com/gtag/js?id=G-XWYBMEK0Q6"></script>\n' +
        '<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag("js",new Date());gtag("config","G-XWYBMEK0Q6");</script>\n' +
        '</head>\n<body>\n' +

        '<div class="topbar"><div class="wrap">' +
        '<span><strong>BesplatniSMSOglasi.com</strong> &mdash; Sex osobni kontakti u Hrvatskoj</span>' +
        '<button class="theme-toggle" onclick="toggleDark()" id="darkBtn">&#9789; Tamno</button>' +
        '</div></div>\n' +

        '<header class="site-header"><div class="wrap header-inner">' +
        '<a href="/" style="text-decoration:none"><div class="logo">Besplatni<span>SMS</span>Oglasi.com<small>Besplatni sex oglasi &amp; osobni kontakti &mdash; 100% besplatno putem WhatsAppa</small></div></a>' +
        '</div></header>\n' +

        '<nav class="site-nav"><div class="wrap"><ul>' +
        '<li><a href="/">SMS Oglasi</a></li>' +
        '<li><a href="/">Osobni Kontakti</a></li>' +
        '<li><a href="/objavi-oglas.html">Objavi oglas</a></li>' +
        '<li><a href="/vodic.html">Vodi&ccaron;</a></li>' +
        '<li><a href="/privatnost.html">Privatnost</a></li>' +
        '</ul></div></nav>\n' +

        '<div class="wrap">\n' +
        '<div class="breadcrumb"><a href="/">Po&ccaron;etna</a> &rsaquo; <a href="' + (false ? '/">Osobni kontakti' : '/">Oglasi') + '</a> &rsaquo; ' + nick + ', ' + age + '</div>\n' +

        '<div class="item' + (ad.vip ? ' vip-item' : '') + '" style="margin:10px 0 20px">' +
        (ad.vip ? '<span class="vip-dot">VIP</span>' : '') +
        (isNew ? '<span class="new-dot">Novo</span>' : '') +
        '<div class="item-head"><span class="item-who">' + nick + ', ' + age + '</span>' +
        '<span class="item-time">' + relTime(ad.ts) + '</span></div>' +
        '<div class="item-meta">' + (city ? city + ', ' : '') + region +
        (ad.height ? ' &middot; ' + ad.height + ' cm' : '') +
        (ad.weight ? ' &middot; ' + ad.weight + ' kg' : '') +
        ' &middot; ' + typeLabel + '</div>' +
        '<div class="item-desc">' + desc + '</div>' +
        (prefHtml ? '<div style="margin-bottom:6px;line-height:1.8">' + prefHtml + '</div>' : '') +
        '<div class="item-bottom">' + contactHtml +
        '<span class="type-tag">' + typeLabel + '</span>' +
        '<span class="views-tag">&#128065; ' + (ad.views || 0) + '</span>' +
        '</div></div>\n' +

        // Like/Dislike
        '<div class="vote-bar">' +
        '<button class="vote-btn like-btn" id="likeBtn" onclick="vote(\'like\')">&#128077; Svi\u0111a mi se <span class="cnt" id="likeCnt">' + (ad.likes || 0) + '</span></button>' +
        '<button class="vote-btn dislike-btn" id="dislikeBtn" onclick="vote(\'dislike\')">&#128078; Ne svi\u0111a mi se <span class="cnt" id="dislikeCnt">' + (ad.dislikes || 0) + '</span></button>' +
        '</div>\n' +

        // Share
        '<div class="share-bar">' +
        '<a class="share-btn share-wa" href="https://wa.me/?text=' + encodeURIComponent(nick + ', ' + age + ' - Sex oglas ' + (ad.ct || '') + ' ' + url) + '" target="_blank" rel="noopener">&#128172; Podijeli na WhatsApp</a>' +
        '<button class="share-btn share-copy" onclick="copyLink()">&#128203; Kopiraj link</button>' +
        '</div>\n' +

        // Komentari
        '<div class="comments">' +
        '<h3>Komentari</h3>' +
        '<div class="cmt-form">' +
        '<input class="cmt-nick" id="cmtNick" placeholder="Nadimak" maxlength="30">' +
        '<input class="cmt-text" id="cmtText" placeholder="Ostavi komentar..." maxlength="500">' +
        '<button class="cmt-send" id="cmtSend" onclick="postComment()">Po\u0161alji</button>' +
        '</div>' +
        '<p class="cmt-gdpr">Komentari su potpuno anonimni. Ne prikupljamo osobne podatke.</p>' +
        '<ul class="cmt-list" id="cmtList"><li class="cmt-empty">U\u010ditavanje...</li></ul>' +
        '</div>\n' +

        '<a href="' + (false ? '/' : '/') + '" class="back-link">&larr; ' + (false ? 'Osobni kontakti' : 'Svi oglasi') + '</a> &nbsp; ' +
        '<a href="/objavi-oglas.html" class="back-link" style="background:#2c3e50">Objavi besplatni oglas</a>\n' +

        // Related ads
        buildRelatedHtml(relatedAds) +

        '</div>\n' +

        '<div id="toastEl" class="toast"></div>\n' +

        // Cookie banner
        '<div class="cookie-banner" id="cookieBanner">' +
        'Koristimo kola\u010di\u0107e za pobolj\u0161anje va\u0161eg iskustva. <a href="/privatnost.html">Saznajte vi\u0161e</a> ' +
        '<button class="ck-btn ck-accept" onclick="acceptCookies()">Prihvati</button> ' +
        '<button class="ck-btn ck-decline" onclick="declineCookies()">Samo nu\u017eni</button>' +
        '</div>\n' +

        '<footer class="site-footer"><div class="wrap">' +
        '<p>&copy; 2026 <a href="/">BesplatniSMSOglasi.com</a> &mdash; Besplatni sex oglasi Hrvatska</p>' +
        '<p style="margin-top:4px"><a href="/privatnost.html">Privatnost</a> &middot; <a href="/uvjeti.html">Uvjeti</a></p>' +
        '</div></footer>\n' +

        '<script>\n' +
        'function toggleDark(){document.body.classList.toggle("dark");localStorage.setItem("dk",document.body.classList.contains("dark")?"1":"0");document.getElementById("darkBtn").innerHTML=document.body.classList.contains("dark")?"&#9788; Svijetlo":"&#9789; Tamno"}\n' +
        'if(localStorage.getItem("dk")==="1"){document.body.classList.add("dark");document.getElementById("darkBtn").innerHTML="&#9788; Svijetlo"}\n' +
        'function acceptCookies(){localStorage.setItem("ck","1");document.getElementById("cookieBanner").classList.add("hidden")}\n' +
        'function declineCookies(){localStorage.setItem("ck","0");document.getElementById("cookieBanner").classList.add("hidden")}\n' +
        '(function(){if(localStorage.getItem("ck")!==null)document.getElementById("cookieBanner").classList.add("hidden")})()\n' +
        'function reveal(el){if(!el.classList.contains("blurred"))return;el.classList.remove("blurred");var v=el.getAttribute("data-v");if(el.classList.contains("wa-tag")){var n=v.replace(/[^0-9+]/g,"");el.innerHTML=\'<a href="https://wa.me/\'+n.replace("+","")+\'?text=\'+encodeURIComponent("Hej, vidio sam tvoj oglas na besplatnismsoglasi.com")+\'" target="_blank" rel="noopener" style="color:#27ae60;text-decoration:none">WhatsApp: \'+v+\' &#8599;</a>\'}else if(el.classList.contains("vb-tag")){var n=v.replace(/[^0-9+]/g,"");el.innerHTML=\'<a href="viber://chat?number=\'+encodeURIComponent(n)+\'" target="_blank" rel="noopener" style="color:#7b1fa2;text-decoration:none">Viber: \'+v+\' &#8599;</a>\'}else{el.innerHTML=v+" &#128203;"}}\n' +
        'var voted=JSON.parse(localStorage.getItem("votes")||"{}");\n' +
        'if(voted[' + ad.id + ']){var b=voted[' + ad.id + ']==="like"?"likeBtn":"dislikeBtn";document.getElementById(b).classList.add("voted");document.getElementById("likeBtn").disabled=true;document.getElementById("dislikeBtn").disabled=true}\n' +
        'function vote(type){if(voted[' + ad.id + '])return;fetch("/.netlify/functions/vote",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({adId:' + ad.id + ',type:type})}).then(function(r){return r.json()}).then(function(d){if(d.likes!==undefined){document.getElementById("likeCnt").textContent=d.likes;document.getElementById("dislikeCnt").textContent=d.dislikes;voted[' + ad.id + ']=type;localStorage.setItem("votes",JSON.stringify(voted));var b=type==="like"?"likeBtn":"dislikeBtn";document.getElementById(b).classList.add("voted");document.getElementById("likeBtn").disabled=true;document.getElementById("dislikeBtn").disabled=true;toast(type==="like"?"Hvala na glasu!":"Hvala na povratnoj informaciji!")}}).catch(function(){toast("Greska. Pokusajte ponovo.")})}\n' +
        'function copyLink(){navigator.clipboard.writeText("' + url + '").then(function(){toast("Link kopiran!")}).catch(function(){toast("' + url + '")})}\n' +
        'function toast(msg){var t=document.getElementById("toastEl");t.textContent=msg;t.classList.add("show");setTimeout(function(){t.classList.remove("show")},2500)}\n' +
        // Komentari JS
        'function relT(ts){var d=Date.now()-new Date(ts).getTime();var m=Math.floor(d/60000);if(m<1)return"upravo";if(m<60)return"prije "+m+" min";var h=Math.floor(m/60);if(h<24)return"prije "+h+"h";var dd=Math.floor(h/24);return"prije "+dd+"d"}\n' +
        'function renderComments(list){var el=document.getElementById("cmtList");if(!list.length){el.innerHTML="<li class=\\"cmt-empty\\">Budi prvi koji komentira!</li>";return}el.innerHTML=list.map(function(c){return"<li class=\\"cmt-item\\"><div class=\\"cmt-item-head\\"><span class=\\"cmt-item-nick\\">"+c.nick+"</span><span class=\\"cmt-item-time\\">"+relT(c.ts)+"</span></div><div class=\\"cmt-item-text\\">"+c.text+"</div></li>"}).reverse().join("")}\n' +
        'fetch("/.netlify/functions/comments?adId=' + ad.id + '").then(function(r){return r.json()}).then(renderComments).catch(function(){document.getElementById("cmtList").innerHTML="<li class=\\"cmt-empty\\">Greska pri ucitavanju.</li>"})\n' +
        'function postComment(){var nick=document.getElementById("cmtNick").value.trim()||"Anonimno";var text=document.getElementById("cmtText").value.trim();if(!text||text.length<2){toast("Unesite komentar (min 2 znaka)");return}document.getElementById("cmtSend").disabled=true;fetch("/.netlify/functions/comments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({adId:' + ad.id + ',nick:nick,text:text})}).then(function(r){if(!r.ok)return r.json().then(function(d){throw new Error(d.error||"Greska")});return r.json()}).then(function(){document.getElementById("cmtText").value="";toast("Komentar objavljen!");fetch("/.netlify/functions/comments?adId=' + ad.id + '").then(function(r){return r.json()}).then(renderComments)}).catch(function(e){toast(e.message||"Greska")}).finally(function(){document.getElementById("cmtSend").disabled=false})}\n' +
        'document.getElementById("cmtText").addEventListener("keydown",function(e){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();postComment()}})\n' +
        '</script>\n' +

        '</body>\n</html>';
}

function build404Page() {
    return '<!DOCTYPE html>\n<html lang="hr">\n<head>\n' +
        '<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
        '<title>Oglas nije prona\u0111en | BesplatniSMSOglasi</title>\n' +
        '<meta name="robots" content="noindex">\n' +
        '<link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap" rel="stylesheet">\n' +
        '<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:\'Lato\',sans-serif;background:#eef0f3;color:#222;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center}a{color:#2980b9}.box{padding:40px}</style>\n' +
        '<!-- Google tag (gtag.js) -->\n' +
        '<script async src="https://www.googletagmanager.com/gtag/js?id=G-XWYBMEK0Q6"></script>\n' +
        '<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag("js",new Date());gtag("config","G-XWYBMEK0Q6");</script>\n' +
        '</head>\n<body>\n' +
        '<div class="box"><div style="font-size:48px;margin-bottom:16px">&#128269;</div>' +
        '<h1 style="font-size:22px;margin-bottom:8px">Oglas nije prona\u0111en</h1>' +
        '<p style="color:#95a5a6;margin-bottom:20px">Ovaj oglas vi\u0161e ne postoji ili je uklonjen.</p>' +
        '<a href="/" style="display:inline-block;background:#27ae60;color:#fff;padding:10px 24px;border-radius:3px;font-weight:700;text-decoration:none">Pogledaj sve oglase</a>' +
        '</div>\n</body>\n</html>';
}

exports.handler = async function(event) {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*' }, body: '' };
    }

    // ID moze doci iz query parametra ili iz patha (/oglas/31)
    var id = parseInt(event.queryStringParameters && event.queryStringParameters.id);
    if (!id) {
        var pathMatch = (event.path || '').match(/\/oglas\/(\d+)/);
        if (pathMatch) id = parseInt(pathMatch[1]);
    }
    if (!id || id < 1) {
        return { statusCode: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: build404Page() };
    }

    var s = ds();
    var ads = await getData(s, 'ads', []);
    var ad = ads.find(function(a) { return a.id === id; });

    if (!ad || ad.reported) {
        return { statusCode: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: build404Page() };
    }

    // Nadji slicne oglase (isti grad ili regija, max 4)
    var related = ads.filter(function(a) {
        return a.id !== ad.id && !a.reported && (a.ct === ad.ct || a.rk === ad.rk);
    }).slice(0, 4);

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=60, s-maxage=120'
        },
        body: buildAdPage(ad, related)
    };
};
