const { createClient } = require('@supabase/supabase-js');
const crypto = require('node:crypto');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function createAdapter(client) {
    async function rpc(name, args = {}) {
        const { data, error } = await client.rpc(name, args);
        if (error) throw new Error('Persistent storage request failed');
        return data;
    }
    return {
        getPortfolio: () => rpc('get_public_portfolio'),
        saveSection: (section, payload) => rpc(`replace_portfolio_${section}`, { p_payload: payload }),
        createSession: (id, csrf) => rpc('create_admin_session', { p_token_hash: hash(id), p_csrf_token_hash: hash(csrf), p_ttl_seconds: 28800 }),
        async getSession(id) {
            const rows = await rpc('validate_admin_session', { p_token_hash: hash(id) });
            return rows?.[0] || null;
        },
        revokeSession: id => rpc('revoke_admin_session', { p_token_hash: hash(id) }),
        async rateLimit(scope, subject, max, windowMs) {
            const rows = await rpc('consume_rate_limit', { p_scope: scope, p_subject_hash: crypto.createHmac('sha256', process.env.RATE_LIMIT_HMAC_SECRET || process.env.ADMIN_PASSWORD).update(subject).digest('hex'), p_max_requests: max, p_window_seconds: Math.ceil(windowMs / 1000) });
            if (!rows?.[0]) throw new Error('Invalid rate limit response');
            return rows[0];
        },
        listMessages: () => rpc('list_contact_messages'),
        insertMessage: m => rpc('insert_contact_message', { p_id: m.id, p_name: m.name, p_email: m.email, p_message: m.message, p_date_label: m.date }),
        toggleMessage: id => rpc('toggle_contact_message', { p_id: id }),
        deleteMessage: id => rpc('delete_contact_message', { p_id: id || null }),
        async upload(file) {
            const name = `${crypto.randomBytes(16).toString('hex')}${require('node:path').extname(file.originalname).toLowerCase()}`;
            const bucket = client.storage.from('portfolio-public');
            const { error } = await bucket.upload(name, file.buffer, { contentType: file.mimetype, upsert: false });
            if (error) throw new Error('Storage upload failed');
            return bucket.getPublicUrl(name).data.publicUrl;
        }
    };
}
function fromEnvironment() {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
    if (!process.env.SUPABASE_URL || !key || !(process.env.RATE_LIMIT_HMAC_SECRET || process.env.ADMIN_PASSWORD)) return null;
    return createAdapter(createClient(process.env.SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } }));
}
module.exports = { createAdapter, fromEnvironment, hash };
