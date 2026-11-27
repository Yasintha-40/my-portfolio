const plainObject = value => value && typeof value === 'object' && !Array.isArray(value);
const text = (value, max, { optional = false, multiline = false } = {}) => {
    if (optional && (value === undefined || value === null || value === '')) return '';
    if (typeof value !== 'string') throw new Error('Invalid request data.');
    const clean = value.trim();
    if (!clean || clean.length > max || (!multiline && /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(clean))) throw new Error('Invalid request data.');
    return clean;
};
const array = (value, max, validateItem) => {
    if (!Array.isArray(value) || value.length > max) throw new Error('Invalid request data.');
    return value.map(validateItem);
};
const allowedKeys = (value, keys) => {
    if (!plainObject(value) || Object.keys(value).some(key => !keys.includes(key))) throw new Error('Invalid request data.');
};
const educationBullet = value => {
    if (typeof value !== 'string' || value.length > 800) throw new Error('Invalid request data.');
    const plain = value.replace(/<\/?strong>/gi, '');
    if (/[<>]/.test(plain) || (value.match(/<strong>/gi) || []).length !== (value.match(/<\/strong>/gi) || []).length) throw new Error('Invalid request data.');
    return text(value, 800, { multiline: true });
};

function safeUrl(value, { optional = true, local = true } = {}) {
    if (optional && !value) return '';
    const url = text(value, 2048);
    if (local && /^\/assets\/(?!\/)[a-zA-Z0-9_./-]+(?:\?[a-zA-Z0-9_=&.-]*)?$/.test(url) && !url.split(/[/?#]/).includes('..')) return url;
    try {
        const parsed = new URL(url);
        if (parsed.protocol === 'https:' && !parsed.username && !parsed.password) return parsed.href;
    } catch {}
    throw new Error('Invalid request data.');
}

function validateProfile(value) {
    const keys = ['name', 'titles', 'description', 'aboutTitle', 'aboutText', 'aboutEducation', 'aboutProjects'];
    allowedKeys(value, keys);
    return {
        name: text(value.name, 100), titles: array(value.titles, 12, item => text(item, 80)),
        description: text(value.description, 1200, { multiline: true }),
        aboutTitle: text(value.aboutTitle, 160), aboutText: text(value.aboutText, 2000, { multiline: true }),
        aboutEducation: text(value.aboutEducation, 180), aboutProjects: text(value.aboutProjects, 100)
    };
}

function validateSkills(value) {
    allowedKeys(value, ['frontend', 'backend']);
    const skill = item => {
        allowedKeys(item, ['name', 'percentage', 'icon']);
        if (!Number.isFinite(item.percentage) || item.percentage < 0 || item.percentage > 100 || !/^[a-z0-9-]{1,48}$/i.test(item.icon || '')) throw new Error('Invalid request data.');
        return { name: text(item.name, 80), percentage: item.percentage, icon: item.icon };
    };
    return { frontend: array(value.frontend, 40, skill), backend: array(value.backend, 40, skill) };
}

function validateEducation(value) {
    return array(value, 30, item => {
        allowedKeys(item, ['date', 'title', 'subtitle', 'desc', 'bullets', 'tags', 'icon']);
        return { date: text(item.date, 80), title: text(item.title, 160), subtitle: text(item.subtitle, 200), desc: text(item.desc, 1200, { multiline: true }),
            bullets: array(item.bullets || [], 20, educationBullet),
            tags: array(item.tags || [], 30, tag => text(tag, 50)), icon: text(item.icon, 48) };
    });
}

function validateExperience(value) {
    return array(value, 30, item => {
        allowedKeys(item, ['date', 'title', 'type', 'typeClass', 'company', 'bullets', 'tags', 'icon', 'themeColor', 'themeColorRGB']);
        const themeColor = text(item.themeColor, 32);
        if (!/^(var\(--[a-z0-9-]+\)|#[0-9a-f]{3,8}|rgba?\([0-9,. %]+\))$/i.test(themeColor)) throw new Error('Invalid request data.');
        if (!/^\d{1,3},\s*\d{1,3},\s*\d{1,3}$/.test(item.themeColorRGB || '')) throw new Error('Invalid request data.');
        if (!/^exp-timeline__type--[a-z-]+$/.test(item.typeClass || '')) throw new Error('Invalid request data.');
        return { date: text(item.date, 80), title: text(item.title, 160), type: text(item.type, 60), typeClass: item.typeClass,
            company: text(item.company, 180), bullets: array(item.bullets || [], 30, line => text(line, 1000, { multiline: true })),
            tags: array(item.tags || [], 40, tag => text(tag, 50)), icon: text(item.icon, 48), themeColor, themeColorRGB: item.themeColorRGB };
    });
}

function validateProjects(value) {
    return array(value, 50, item => {
        allowedKeys(item, ['name', 'category', 'language', 'description', 'html_url', 'homepage', 'image', 'video', 'stargazers_count', 'forks_count']);
        return { name: text(item.name, 120), category: text(item.category || 'Web App', 40), language: text(item.language || '', 60, { optional: true }),
            description: text(item.description || '', 1200, { optional: true, multiline: true }), html_url: safeUrl(item.html_url, { optional: false, local: false }),
            homepage: safeUrl(item.homepage), image: safeUrl(item.image), video: safeUrl(item.video),
            stargazers_count: Number.isSafeInteger(item.stargazers_count) ? Math.max(0, item.stargazers_count) : 0,
            forks_count: Number.isSafeInteger(item.forks_count) ? Math.max(0, item.forks_count) : 0 };
    });
}

function validateCertificates(value) {
    return array(value, 50, item => {
        allowedKeys(item, ['name', 'issuer', 'date', 'credential_url', 'pdf', 'image']);
        return { name: text(item.name, 160), issuer: text(item.issuer, 160), date: text(item.date, 80),
            credential_url: safeUrl(item.credential_url), pdf: safeUrl(item.pdf), image: safeUrl(item.image) };
    });
}

function validateMessage(value) {
    allowedKeys(value, ['name', 'email', 'message']);
    const name = text(value.name, 100), email = text(value.email, 254).toLowerCase(), message = text(value.message, 3000, { multiline: true });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid request data.');
    return { name, email, message };
}

module.exports = { validateProfile, validateSkills, validateEducation, validateExperience, validateProjects, validateCertificates, validateMessage };
