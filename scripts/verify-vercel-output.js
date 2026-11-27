'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../.vercel/output');
const forbidden = [];
function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        const rel = path.relative(root, full).replaceAll('\\', '/');
        if (/^(?:\.env(?:\.|$)|data\.json$|\.local-security-state\.json$)/i.test(entry.name) || /\.(?:pdf|bak|backup)$/i.test(entry.name) || entry.name === '.git' || /(?:^|\/)backup(?:s)?(?:\/|$)/i.test(rel)) forbidden.push(rel);
        else if (entry.isDirectory()) walk(full);
    }
}
walk(root);
const fun = path.join(root, 'functions/frontend/backend/api/index.js.func');
const required = [path.join(fun, 'frontend/backend/page-template.js'), path.join(fun, 'frontend/backend/admin/index.html'), path.join(root, 'static/frontend/assets/img/social-preview.jpg'), path.join(root, 'static/frontend/backend/admin/admin.js'), path.join(root, 'static/frontend/backend/admin/admin.css')];
const missing = required.filter(f => !fs.existsSync(f));
const assets = ['1781840643635-670015348.png','1781841094524-446497287.jpg','1781841381392-957259557.jpg','1781841609931-342519142.jpg','1781841829036-467093329.jpg','1783915623183-632060214.png','1783915739067-714799018.png'];
for(const asset of assets) if(!fs.existsSync(path.join(root,'static/frontend/assets/uploads',asset))) missing.push(asset);
const verificationFile = path.join(root, 'static/frontend/google445b1cc64cd53216.html');
const verificationValid = fs.existsSync(verificationFile) && fs.readFileSync(verificationFile, 'utf8') === 'google-site-verification: google445b1cc64cd53216.html';
const routes = JSON.parse(fs.readFileSync(path.join(root, 'config.json'), 'utf8')).routes || [];
const verificationPath = '/google445b1cc64cd53216.html';
const firstMatchingRoute = routes.find(route => route.src && new RegExp(route.src).test(verificationPath));
const verificationRouteValid = firstMatchingRoute?.dest === '/frontend/google445b1cc64cd53216.html';
const runtime = JSON.parse(fs.readFileSync(path.join(fun,'.vc-config.json'),'utf8')).runtime;
const generated = require(path.join(fun,'frontend/backend/page-template.js'));
const source = fs.readFileSync(path.join(__dirname,'../frontend/index.html'),'utf8');
if (forbidden.length || missing.length || runtime !== 'nodejs24.x' || generated !== source || !verificationValid || !verificationRouteValid) {
    console.error(`Artifact verification failed: ${forbidden.length} excluded paths, ${missing.length} missing files, runtime/template ${runtime === 'nodejs24.x' && generated === source ? 'ok' : 'incorrect'}.`);
    process.exitCode = 1;
} else console.log('Build output passed: verification file and route, Node 24, templates and seven public images present; excluded files absent.');
