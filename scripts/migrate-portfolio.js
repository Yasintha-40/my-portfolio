'use strict';

// Offline by default. Apply imports only public portfolio sections and refuses overwrite.
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const validators = require('../frontend/backend/validation');

const projectRoot = path.resolve(__dirname, '..');
const dataFile = path.join(projectRoot, 'frontend', 'backend', 'data.json');
const assetsRoot = path.join(projectRoot, 'frontend', 'assets');
const allowedKeys = new Set(['profile', 'skills', 'education', 'experience', 'projects', 'certificates', 'messages']);

function isWithin(parent, candidate) {
    const relative = path.relative(parent, candidate);
    return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`));
}

function validateMessages(messages) {
    if (!Array.isArray(messages)) throw new Error('Current messages field must be an array.');
    const ids = new Set();
    for (const item of messages) {
        validators.validateMessage({ name: item.name, email: item.email, message: item.message });
        if (item.id !== undefined) {
            if (typeof item.id !== 'string' || item.id.length < 1 || item.id.length > 64 || ids.has(item.id)) {
                throw new Error('A current contact message ID is invalid or duplicated.');
            }
            ids.add(item.id);
        }
        if (item.date !== undefined && (typeof item.date !== 'string' || item.date.length > 160)) {
            throw new Error('A current contact message date is invalid.');
        }
        if (item.read !== undefined && typeof item.read !== 'boolean') {
            throw new Error('A current contact message read state is invalid.');
        }
    }
}

function validateMedia(data) {
    const refs = [];
    for (const project of data.projects) refs.push(project.image, project.video);
    for (const certificate of data.certificates) refs.push(certificate.image, certificate.pdf);
    const assetsRealPath = fs.realpathSync(assetsRoot);
    const localFiles = new Set();
    for (const reference of refs) {
        if (typeof reference !== 'string' || !reference.startsWith('/assets/')) continue;
        const decodedPath = decodeURIComponent(new URL(reference, 'https://migration.invalid').pathname);
        if (decodedPath.split('/').includes('..')) throw new Error('A local media reference escapes the assets directory.');
        const filePath = path.resolve(projectRoot, 'frontend', `.${decodedPath}`);
        if (!isWithin(assetsRoot, filePath) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
            throw new Error('A referenced local media file is missing or outside the assets directory.');
        }
        if (!isWithin(assetsRealPath, fs.realpathSync(filePath))) {
            throw new Error('A referenced media symlink resolves outside the assets directory.');
        }
        localFiles.add(filePath);
    }
    return localFiles.size;
}

function rpcDiagnostic(error, status) {
    // PostgREST details, hints, and arbitrary messages can contain source data.
    const code = typeof error?.code === 'string' && /^(?:[0-9A-Z]{5}|PGRST[0-9]{3})$/.test(error.code) ? error.code : null;
    const http = Number.isInteger(status) && status >= 100 && status <= 599 ? status : null;
    const known = {
        'DELETE requires a WHERE clause': 'The database safe-update protection rejected an unqualified DELETE in the import function.',
        'invalid import arguments': 'The RPC rejected its arguments.',
        'invalid portfolio JSON structure': 'The RPC rejected the portfolio JSON structure.',
        'portfolio data already exists; explicit overwrite authorization is required': 'The database rejected the import because portfolio records already exist.'
    };
    const category = known[error?.message] || ({ '42501': 'The server key lacks permission to execute the RPC.', 'PGRST202': 'The RPC signature is unavailable in the API schema.', '23502': 'A required database field is null.', '23503': 'A database reference constraint failed.', '23505': 'A database uniqueness constraint failed.', '23514': 'A database check constraint failed.', '22P02': 'A value could not be converted to its database type.', '22003': 'A numeric value is outside its database type range.' }[code]) || 'The RPC or network request failed; server details were withheld.';
    return `${category} (HTTP ${http ?? 'unavailable'}, code ${code ?? 'unavailable'}). No overwrite was requested.`;
}

async function main() {
    const args = process.argv.slice(2);
    if (args.some(arg => !['--dry-run', '--apply'].includes(arg)) || args.length > 1) throw new Error('Choose exactly one of --dry-run or --apply.');
    const apply = args[0] === '--apply';

    const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    if (!data || typeof data !== 'object' || Array.isArray(data)
        || Object.keys(data).some(key => !allowedKeys.has(key))) {
        throw new Error('Current data.json has an unsupported top-level structure.');
    }
    validators.validateProfile(data.profile);
    validators.validateSkills(data.skills);
    validators.validateEducation(data.education);
    validators.validateExperience(data.experience);
    validators.validateProjects(data.projects);
    validators.validateCertificates(data.certificates);
    validateMessages(data.messages || []);

    const counts = {
        frontendSkills: data.skills.frontend.length,
        backendSkills: data.skills.backend.length,
        education: data.education.length,
        experience: data.experience.length,
        projects: data.projects.length,
        certificates: data.certificates.length,
        currentFileMessages: (data.messages || []).length
    };
    console.log('Current working-tree data.json passed backend schema validation.');
    console.log(`Validated record counts: ${JSON.stringify(counts)}.`);
    console.log(`Referenced local media files found: ${validateMedia(data)}.`);
    if (!apply) { console.log('Dry run only: no network connection or database changes were made.'); return; }
    if (typeof process.loadEnvFile === 'function') {
        try { process.loadEnvFile(path.join(projectRoot, 'frontend', 'backend', '.env')); } catch {}
    }
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
    if (!process.env.SUPABASE_URL || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
    const { createClient } = require('../frontend/backend/node_modules/@supabase/supabase-js');
    const payload = Object.fromEntries(['profile', 'skills', 'education', 'experience', 'projects', 'certificates'].map(key => [key, data[key]]));
    const sourceHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    const client = createClient(process.env.SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: result, error, status } = await client.rpc('import_portfolio_json', { p_payload: payload, p_source_hash: sourceHash, p_allow_overwrite: false });
    if (error) throw new Error(rpcDiagnostic(error, status));
    if (!result || !['imported', 'unchanged'].includes(result.status)) throw new Error('Unexpected import response; verify the database before retrying.');
    console.log(`Import status: ${result.status}. No messages or media were imported.`);
}

if (require.main === module) main().catch(error => { console.error(`Migration stopped: ${error.message}`); process.exitCode = 1; });
module.exports = { rpcDiagnostic };
