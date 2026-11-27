// Local-development adapter only. Production requires a shared persistent adapter.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const production = process.env.NODE_ENV === 'production';
const localEnabled = !production && (process.env.SECURITY_STORE_ADAPTER || 'local') === 'local';
const stateFile = path.join(__dirname, '.local-security-state.json');

function readState() {
    try {
        const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
        return { sessions: state.sessions || {}, limits: state.limits || {}, messages: Array.isArray(state.messages) ? state.messages : [] };
    } catch (error) {
        if (error.code !== 'ENOENT') throw new Error('Security storage is unavailable.');
        return { sessions: {}, limits: {}, messages: [] };
    }
}

function writeState(state) {
    if (!localEnabled) throw new Error('A shared persistent security store is required in production.');
    const temporaryFile = `${stateFile}.${crypto.randomBytes(8).toString('hex')}.tmp`;
    try {
        fs.writeFileSync(temporaryFile, JSON.stringify(state), { encoding: 'utf8', mode: 0o600, flag: 'wx' });
        fs.renameSync(temporaryFile, stateFile);
    } catch {
        try { fs.rmSync(temporaryFile, { force: true }); } catch {}
        throw new Error('Security storage is unavailable.');
    }
}

function ensureLocal() {
    if (!localEnabled) throw new Error('A shared persistent security store is required in production.');
}

module.exports = {
    isReady: () => localEnabled,
    saveSession(id, session) {
        ensureLocal(); const state = readState();
        state.sessions[crypto.createHash('sha256').update(id).digest('hex')] = session;
        writeState(state);
    },
    getSession(id) {
        ensureLocal(); const state = readState();
        return state.sessions[crypto.createHash('sha256').update(id).digest('hex')] || null;
    },
    revokeSession(id) {
        ensureLocal(); const state = readState();
        delete state.sessions[crypto.createHash('sha256').update(id).digest('hex')]; writeState(state);
    },
    consumeRateLimit(key, max, windowMs) {
        ensureLocal(); const now = Date.now(); const state = readState();
        const bucket = crypto.createHash('sha256').update(key).digest('hex');
        const current = state.limits[bucket];
        const next = !current || now >= current.resetAt ? { count: 1, resetAt: now + windowMs } : { ...current, count: current.count + 1 };
        state.limits[bucket] = next;
        for (const [hash, value] of Object.entries(state.limits)) if (now >= value.resetAt) delete state.limits[hash];
        writeState(state);
        return { allowed: next.count <= max, retryAfter: Math.max(1, Math.ceil((next.resetAt - now) / 1000)) };
    },
    getMessages() { ensureLocal(); return readState().messages; },
    saveMessages(messages) { ensureLocal(); const state = readState(); state.messages = messages; writeState(state); },
    importLegacyMessages(messages) {
        ensureLocal(); if (!messages.length) return;
        const state = readState(); if (state.messages.length) return;
        state.messages = messages; writeState(state);
    }
};
