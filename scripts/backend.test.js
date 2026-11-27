'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createAdapter, hash } = require('../frontend/backend/supabase-adapter');

test('adapter maps RPCs, hashes security values and uploads without overwrite', async () => {
    const calls = [];
    const client = { rpc: async (name, args) => { calls.push({ name, args }); return { data: name === 'validate_admin_session' ? [{ csrf_token_hash: hash('csrf'), expires_at: '2030-01-01' }] : name === 'consume_rate_limit' ? [{ is_allowed: true, remaining_count: 4 }] : true, error: null }; }, storage: { from: name => ({ upload: async (key, buffer, options) => { calls.push({ name, key, options }); return { error: null }; }, getPublicUrl: key => ({ data: { publicUrl: `https://example.com/${key}` } }) }) } };
    process.env.RATE_LIMIT_HMAC_SECRET = 'test-secret';
    const a = createAdapter(client);
    await a.getPortfolio(); await a.saveSection('skills', {}); await a.createSession('session', 'csrf'); await a.getSession('session'); await a.revokeSession('session'); await a.rateLimit('contact', '127.0.0.1', 5, 3600000); await a.insertMessage({ id: '1', name: 'n', email: 'e', message: 'm', date: 'd' }); await a.listMessages(); await a.toggleMessage('1'); await a.deleteMessage('1');
    const url = await a.upload({ originalname: 'test.png', mimetype: 'image/png', buffer: Buffer.from('test') });
    assert.match(url, /^https:\/\/example.com\/[a-f0-9]{32}\.png$/);
    assert.equal(calls[2].args.p_token_hash, hash('session')); assert.equal(calls[2].args.p_csrf_token_hash, hash('csrf'));
    assert.equal(calls[5].args.p_window_seconds, 3600); assert.notEqual(calls[5].args.p_subject_hash, hash('127.0.0.1'));
    assert.equal(calls.at(-1).options.upsert, false);
});

test('HTTP authentication, CSRF, section writes, messages and rate denial', async () => {
    process.env.ADMIN_USERNAME = 'tester'; process.env.ADMIN_PASSWORD = 'password-for-tests'; process.env.SITE_URL = 'https://portfolio.example';
    const sessions = new Map(); const calls = []; let denyContact = false;
    const mock = { getPortfolio: async () => require('./fixtures/portfolio.test-fixture.json'), createSession: async (id, csrf) => sessions.set(id, { csrf_token_hash: hash(csrf), expires_at: '2099-01-01T00:00:00Z' }), getSession: async id => sessions.get(id), revokeSession: async id => sessions.delete(id), rateLimit: async scope => ({ is_allowed: !(scope === 'contact' && denyContact), remaining_count: 0, retry_after_seconds: 30 }), saveSection: async (...args) => calls.push(args), listMessages: async () => [], insertMessage: async message => calls.push(['message', message.id]), toggleMessage: async () => true, deleteMessage: async () => true, upload: async () => 'https://example.com/a.png' };
    const adapter = require('../frontend/backend/supabase-adapter'); const original = adapter.fromEnvironment; adapter.fromEnvironment = () => mock;
    const app = require('../frontend/backend/server'); adapter.fromEnvironment = original;
    const server = app.listen(0); await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    try {
        let r = await fetch(base + '/api/portfolio'); assert.equal(r.status, 200);
        const login = (origin, username, password) => fetch(base + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify({ username, password }) });
        r = await login('https://other.example', 'tester', 'password-for-tests'); assert.equal(r.status, 401); assert.equal(sessions.size, 0);
        r = await login('https://portfolio.example', 'Tester', 'password-for-tests'); assert.equal(r.status, 401);
        r = await login('https://portfolio.example', 'tester', 'password-for-tests '); assert.equal(r.status, 401);
        r = await login('https://portfolio.example', ' tester ', 'password-for-tests'); assert.equal(r.status, 200); const cookie = r.headers.get('set-cookie').split(';')[0]; const { csrfToken } = await r.json();
        r = await fetch(base + '/api/session', { headers: { Cookie: cookie } }); assert.equal((await r.json()).csrfToken, csrfToken);
        const profile = require('./fixtures/portfolio.test-fixture.json').profile;
        r = await fetch(base + '/api/profile', { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(profile) }); assert.equal(r.status, 403);
        r = await fetch(base + '/api/profile', { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: JSON.stringify(profile) }); assert.equal(r.status, 200); assert.equal(calls[0][0], 'profile');
        r = await fetch(base + '/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Test', email: 'test@example.invalid', message: 'Hello' }) }); assert.equal(r.status, 200); assert.equal(calls.at(-1)[0], 'message');
        denyContact = true;
        r = await fetch(base + '/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); assert.equal(r.status, 429);
        r = await fetch(base + '/api/messages', { headers: { Cookie: cookie } }); assert.equal(r.status, 200);
        r = await fetch(base + '/api/messages/read', { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: JSON.stringify({id:'test'}) }); assert.equal(r.status, 200);
        r = await fetch(base + '/api/messages', { method: 'DELETE', headers: { Cookie: cookie, 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: JSON.stringify({id:'test'}) }); assert.equal(r.status, 200);
        const form = new FormData(); form.append('image', new Blob([Buffer.from([137,80,78,71,13,10,26,10])], {type:'image/png'}), 'test.png');
        r = await fetch(base + '/api/upload', { method: 'POST', headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken }, body: form }); assert.equal(r.status, 200);
        const bad = new FormData(); bad.append('image', new Blob(['invalid'], {type:'image/png'}), 'test.png');
        r = await fetch(base + '/api/upload', { method: 'POST', headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken }, body: bad }); assert.equal(r.status, 400);
        r = await fetch(base + '/api/logout', { method: 'POST', headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken } }); assert.equal(r.status, 200);
        r = await fetch(base + '/api/session', { headers: { Cookie: cookie } }); assert.equal(r.status, 401);
    } finally { await new Promise(resolve => server.close(resolve)); }
});
