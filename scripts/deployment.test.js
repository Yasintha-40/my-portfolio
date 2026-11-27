'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('production public routes use remote data and safe SEO and assets', async () => {
    process.env.NODE_ENV = 'production';
    process.env.SITE_URL = 'https://portfolio.example';
    const adapter = require('../frontend/backend/supabase-adapter');
    const originalFromEnvironment = adapter.fromEnvironment;
    adapter.fromEnvironment = () => ({ getPortfolio: async () => require('./fixtures/portfolio.test-fixture.json') });
    const app = require('../frontend/backend/server');
    adapter.fromEnvironment = originalFromEnvironment;
    app.use('/assets', require('../frontend/backend/node_modules/express').static(path.join(__dirname, '../frontend/assets')));
    const server = app.listen(0); await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const request = url => fetch(base + url, { headers: { 'X-Forwarded-Host': 'portfolio.example' }, redirect: 'manual' });
    try {
        let response = await request('/'); assert.equal(response.status, 200); const html = await response.text();
        assert.match(html.slice(0, 4000), /<link rel="canonical" href="https:\/\/portfolio\.example\/">/); assert.match(html.slice(0, 4000), /name="robots" content="index, follow"/);
        assert.match(html, /application\/ld\+json/); assert.match(html, /Request CV/);
        assert.doesNotMatch(html, /1783915516862-830469790\.pdf|1795680342064-697995500\.pdf|Yasintha_Randika_CV\.pdf/);
        assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/); assert.equal(response.headers.get('x-content-type-options'), 'nosniff'); assert.match(response.headers.get('strict-transport-security'), /max-age/);
        response = await request('/robots.txt'); assert.match(await response.text(), /Sitemap: https:\/\/portfolio\.example\/sitemap\.xml/);
        response = await request('/sitemap.xml'); assert.match(await response.text(), /<loc>https:\/\/portfolio\.example\/<\/loc>/);
        response = await fetch(base + '/', {headers: {'X-Forwarded-Host':'preview.example'}}); assert.match(await response.text(), /name="robots" content="noindex, nofollow"/);
        response = await request('/api/portfolio'); assert.equal(response.status, 200); assert.match(response.headers.get('x-robots-tag'), /noindex/);
        const data = await response.json(); const paths = [...data.projects.flatMap(x => [x.image,x.video]), ...data.certificates.flatMap(x => [x.image,x.pdf])].filter(x => typeof x === 'string' && x.startsWith('/assets/'));
        assert.equal(paths.length, 7);
        for (const asset of paths) { response = await request(asset); assert.equal(response.status, 200, `asset unavailable: ${path.basename(asset)}`); assert.match(response.headers.get('content-type'), /^image\//); }
        const flagged = new Set(['/assets/uploads/1783915516862-830469790.pdf','/assets/uploads/1795680342064-697995500.pdf']);
        const blockedHtml = require('../frontend/backend/seo').renderPage({ ...require('./fixtures/portfolio.test-fixture.json'), certificates: [...data.certificates, ...[...flagged].map(pdf => ({ name: 'Private fixture', issuer: 'Test only', date: '2025', credential_url: '', pdf, image: '' }))] }, 'portfolio.example');
        for (const asset of flagged) assert.ok(!blockedHtml.includes(asset));
        const ignored = fs.readFileSync(path.join(__dirname, '../.vercelignore'), 'utf8');
        for (const asset of flagged) assert.ok(ignored.includes('frontend' + asset));
        assert.ok(ignored.includes('frontend/assets/pdf/Yasintha_Randika_CV.pdf'));
        response = await request('/admin/'); assert.equal(response.status, 200); assert.match(response.headers.get('x-robots-tag'), /noindex/);
        console.log('Verified 7 public images served; flagged certificate PDF references are removed from rendered HTML.');
    } finally { await new Promise(resolve => server.close(resolve)); }
});
