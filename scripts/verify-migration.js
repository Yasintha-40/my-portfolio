'use strict';

// Offline by default. --remote performs read-only checks only.
const fs = require('node:fs');
const path = require('node:path');
const validators = require('../frontend/backend/validation');

const projectRoot = path.resolve(__dirname, '..');
const dataFile = path.join(projectRoot, 'frontend', 'backend', 'data.json');
const remote = process.argv.includes('--remote');
const expectedKeys = ['profile', 'skills', 'education', 'experience', 'projects', 'certificates', 'messages'];

function stable(value) {
    if (Array.isArray(value)) return value.map(stable);
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
    return value;
}

function safeCounts(data) {
    return {
        frontendSkills: data.skills.frontend.length,
        backendSkills: data.skills.backend.length,
        education: data.education.length,
        experience: data.experience.length,
        projects: data.projects.length,
        certificates: data.certificates.length,
        currentFileMessages: (data.messages || []).length
    };
}

function validateLocal() {
    const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).some(key => !expectedKeys.includes(key))) {
        throw new Error('Current portfolio JSON contains an unsupported top-level structure.');
    }
    const normalized = {
        profile: validators.validateProfile(data.profile),
        skills: validators.validateSkills(data.skills),
        education: validators.validateEducation(data.education),
        experience: validators.validateExperience(data.experience),
        projects: validators.validateProjects(data.projects),
        certificates: validators.validateCertificates(data.certificates),
        messages: data.messages || []
    };
    for (const message of normalized.messages) {
        validators.validateMessage({ name: message.name, email: message.email, message: message.message });
        if (message.id !== undefined && (typeof message.id !== 'string' || message.id.length < 1 || message.id.length > 64)) throw new Error('A contact message ID has an unsupported form.');
        if (message.date !== undefined && (typeof message.date !== 'string' || message.date.length > 160)) throw new Error('A contact message date has an unsupported form.');
        if (message.read !== undefined && typeof message.read !== 'boolean') throw new Error('A contact message read state has an unsupported form.');
    }
    console.log(`Local source passes current backend validators: ${JSON.stringify(safeCounts(normalized))}.`);
    return normalized;
}

function comparable(data) {
    return {
        profile: data.profile,
        skills: data.skills,
        education: data.education,
        experience: data.experience,
        projects: data.projects,
        certificates: data.certificates
    };
}

async function checkRemote(source) {
    const base = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    if (!base || !serviceKey) throw new Error('Remote checks require SUPABASE_URL and a server key. Values are never printed.');
    const baseUrl = new URL(base);
    if (baseUrl.protocol !== 'https:') throw new Error('SUPABASE_URL must use HTTPS.');

    const read = async (relative, key) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
            return await fetch(new URL(relative, baseUrl), {
                headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
                signal: controller.signal
            });
        } finally { clearTimeout(timeout); }
    };
    const publicResponse = await read('/rest/v1/rpc/get_public_portfolio', serviceKey);
    if (!publicResponse.ok) throw new Error(`Public portfolio RPC check failed with HTTP ${publicResponse.status}; response details withheld.`);
    const actual = await publicResponse.json();
    if (JSON.stringify(stable(comparable(actual))) !== JSON.stringify(stable(comparable(source)))) {
        throw new Error('Remote portfolio sections differ from the current JSON source. No content was printed.');
    }
    console.log('Read-only remote check passed: portfolio content matches.');
    if (anonKey) {
        const anonymousResponse = await read('/rest/v1/portfolio_profile?select=singleton_id', anonKey);
        if (![401, 403].includes(anonymousResponse.status)) throw new Error(`Anonymous table access was not denied (HTTP ${anonymousResponse.status}).`);
        console.log('Anonymous table access is denied.');
    } else console.log('Anonymous access check skipped: SUPABASE_ANON_KEY is not configured.');
}

async function main() {
    const data = validateLocal();
    if (!remote) {
        console.log('Offline verification only: no network or database access occurred.');
        return;
    }
    await checkRemote(data);
}

main().catch(error => {
    console.error(`Verification stopped: ${error.message}`);
    process.exitCode = 1;
});
