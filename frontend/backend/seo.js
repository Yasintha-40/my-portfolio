const template = require('./page-template');
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const list = (items, render) => (Array.isArray(items) ? items : []).map(render).join('');
const educationBullet = value => escape(value).replace(/&lt;strong&gt;/gi, '<strong>').replace(/&lt;\/strong&gt;/gi, '</strong>');
const safePublicUrl = value => {
    const candidate = String(value || '');
    if (['/assets/uploads/1783915516862-830469790.pdf', '/assets/uploads/1795680342064-697995500.pdf', '/assets/pdf/Yasintha_Randika_CV.pdf'].includes(candidate)) return '';
    if (/^\/assets\/(?!\/)[a-zA-Z0-9_./-]+$/.test(candidate) && !candidate.split('/').includes('..')) return candidate;
    try { const url = new URL(candidate); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; } catch { return ''; }
};
const safeThemeColor = value => /^(var\(--[a-z0-9-]+\)|#[0-9a-f]{3,8}|rgba?\([0-9,. %]+\))$/i.test(String(value || '')) ? value : 'var(--secondary-color)';
const safeThemeRGB = value => /^\d{1,3},\s*\d{1,3},\s*\d{1,3}$/.test(String(value || '')) ? value : '6, 182, 212';

function siteOrigin() {
    try {
        const url = new URL(process.env.SITE_URL || '');
        const isLocalHttp = url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
        if ((!isLocalHttp && url.protocol !== 'https:') || url.pathname !== '/' || url.search || url.hash || url.username || url.password) return null;
        return url.origin;
    } catch { return null; }
}

function replaceContainer(html, id, contents) {
    const pattern = new RegExp(`(<[^>]+id="${id}"[^>]*>)[\\s\\S]*?(</div>)`);
    return html.replace(pattern, (_, start, end) => `${start}${contents}${end}`);
}

function renderPage(data, hostname) {
    const profile = data.profile || {};
    const displayName = String(profile.name || 'Yasintha').trim();
    const fullName = displayName === 'Yasintha' ? 'Yasintha Randika' : displayName;
    const name = escape(displayName);
    const origin = siteOrigin();
    const indexable = origin && hostname === new URL(origin).hostname;
    const imageUrl = origin ? `${origin}/assets/img/social-preview.jpg` : null;
    const imageAlt = `Portrait of ${fullName}`;
    const title = `${fullName} | Software Developer Portfolio`;
    const description = 'Yasintha Randika is a software development intern and software engineering student at SLIIT. Explore projects, skills, education, and experience.';
    const person = {
        '@context': 'https://schema.org', '@type': 'Person',
        name: fullName,
        description: profile.description || description,
        sameAs: ['https://github.com/Yasintha-40']
    };
    if (origin) { person.url = `${origin}/`; person.image = `${origin}/assets/img/yasintha.jpg`; }
    const metadata = [
        `<title>${escape(title)}</title>`,
        `<meta name="description" content="${escape(description)}">`,
        `<meta name="robots" content="${indexable ? 'index, follow' : 'noindex, nofollow'}">`,
        origin ? `<link rel="canonical" href="${origin}/">` : '',
        `<meta property="og:type" content="profile">`,
        `<meta property="og:title" content="${escape(title)}">`,
        `<meta property="og:description" content="${escape(description)}">`,
        origin ? `<meta property="og:url" content="${origin}/">` : '',
        imageUrl ? `<meta property="og:image" content="${imageUrl}">` : '',
        imageUrl ? `<meta property="og:image:type" content="image/jpeg">` : '',
        imageUrl ? `<meta property="og:image:width" content="1200">` : '',
        imageUrl ? `<meta property="og:image:height" content="630">` : '',
        imageUrl ? `<meta property="og:image:alt" content="${escape(imageAlt)}">` : '',
        `<meta name="twitter:card" content="${imageUrl ? 'summary_large_image' : 'summary'}">`,
        `<meta name="twitter:title" content="${escape(title)}">`,
        `<meta name="twitter:description" content="${escape(description)}">`,
        imageUrl ? `<meta name="twitter:image" content="${imageUrl}">` : '',
        imageUrl ? `<meta name="twitter:image:alt" content="${escape(imageAlt)}">` : '',
        `<script type="application/ld+json">${JSON.stringify(person).replace(/</g, '\\u003c')}</script>`
    ].filter(Boolean).join('\n  ');
    let html = template.replace('<!-- SEO_METADATA -->', metadata);
    const titles = Array.isArray(profile.titles) ? profile.titles : [];
    html = html.replace('<body>', `<body data-portfolio-rendered="true" data-portfolio-titles="${escape(JSON.stringify(titles))}">`);
    html = html.replace(/(<h1 class="home__title">)[\s\S]*?(<\/h1>)/, (_, start, end) => `${start}Hi, I'm <span class="home__title-color">${name}</span>${end}`);
    html = html.replace(/(<p class="home__description">)[\s\S]*?(<\/p>)/, (_, start, end) => `${start}${escape(profile.description || '')}${end}`);
    html = html.replace(/(<h3 class="about__subtitle">)[\s\S]*?(<\/h3>)/, (_, start, end) => `${start}${escape(profile.aboutTitle || '')}${end}`);
    html = html.replace(/(<p class="about__text">)[\s\S]*?(<\/p>)/, (_, start, end) => `${start}${escape(profile.aboutText || '')}${end}`);
    let detailIndex = 0;
    html = html.replace(/(<p class="about__detail-subtitle">)[\s\S]*?(<\/p>)/g, (_, start, end) => {
        const value = detailIndex++ === 0 ? profile.aboutEducation : profile.aboutProjects;
        return `${start}${escape(value || '')}${end}`;
    });

    const skills = data.skills || {};
    const configuredSkills = [...(skills.frontend || []), ...(skills.backend || [])];
    const tools = list(configuredSkills, item => `<div class="skills__data"><div class="skills__names"><span class="skills__name-item"><i class="bx ${escape(item.icon)} skills__icon"></i> ${escape(item.name)}</span></div></div>`);
    html = replaceContainer(html, 'skills-container', `<div class="skills__category glass"><h3 class="skills__category-title"><i class="bx bx-code-alt"></i> GitHub Code Languages</h3><p class="skills__source" id="github-language-source">Loading verified GitHub language usage…</p><div class="skills__list" id="github-language-list"></div></div><div class="skills__category glass"><h3 class="skills__category-title"><i class="bx bx-server"></i> Skills & Technologies</h3><div class="skills__list">${tools}</div></div>`);
    html = replaceContainer(html, 'education-timeline', list(data.education, item => `<div class="timeline__item glass"><div class="timeline__marker"><i class="bx ${escape(item.icon)} timeline__icon"></i></div><div class="timeline__content"><span class="timeline__date">${escape(item.date)}</span><h3 class="timeline__title">${escape(item.title)}</h3><h4 class="timeline__subtitle">${escape(item.subtitle)}</h4><p class="timeline__desc">${escape(item.desc)}</p><ul class="education__bullets">${list(item.bullets, b => `<li>${educationBullet(b)}</li>`)}</ul><div class="education__tags">${list(item.tags, t => `<span class="edu-tag">${escape(t)}</span>`)}</div></div></div>`));
    html = replaceContainer(html, 'experience-timeline', list(data.experience, item => { const color = safeThemeColor(item.themeColor), rgb = safeThemeRGB(item.themeColorRGB); return `<div class="exp-timeline__item glass" style="border-top-color: ${escape(color)}; --item-color: ${escape(color)}; --item-color-rgb: ${escape(rgb)};"><div class="exp-timeline__marker" style="background: ${escape(color)}; box-shadow: 0 0 15px rgba(${escape(rgb)}, 0.45);"><i class="bx ${escape(item.icon)} exp-timeline__icon"></i></div><div class="exp-timeline__content"><div class="exp-timeline__header"><div><span class="exp-timeline__date" style="color: ${escape(color)}; background: rgba(${escape(rgb)}, 0.08); border-color: rgba(${escape(rgb)}, 0.18);"><i class="bx bx-calendar"></i> ${escape(item.date)}</span><h3 class="exp-timeline__title">${escape(item.title)} <span class="exp-timeline__type ${escape(item.typeClass)}">${escape(item.type)}</span></h3><h4 class="exp-timeline__company"><i class="bx bx-buildings"></i> ${escape(item.company)}</h4></div></div><ul class="exp-timeline__bullets">${list(item.bullets, b => `<li>${educationBullet(b)}</li>`)}</ul><div class="exp-timeline__tags">${list(item.tags, t => `<span class="exp-tag">${escape(t)}</span>`)}</div></div></div>`; }));
    html = replaceContainer(html, 'certificates-container', list(data.certificates, cert => { const credential = safePublicUrl(cert.credential_url), documentUrl = safePublicUrl(cert.pdf) || safePublicUrl(cert.image); return `<div class="certificates__card glass"><div class="certificates__icon-wrapper"><i class="bx bx-award"></i></div><h3 class="certificates__title">${escape(cert.name)}</h3><span class="certificates__issuer"><i class="bx bx-buildings"></i> ${escape(cert.issuer)}</span><span class="certificates__date"><i class="bx bx-calendar"></i> Issued: ${escape(cert.date)}</span><div class="certificates__links">${credential ? `<a href="${escape(credential)}" target="_blank" rel="noopener noreferrer" class="certificates__btn certificates__btn-primary">View Credential <i class="bx bx-link-external"></i></a>` : ''}${documentUrl ? `<a href="${escape(documentUrl)}" target="_blank" rel="noopener noreferrer" class="certificates__btn certificates__btn-secondary">View Certificate <i class="bx bx-award"></i></a>` : ''}</div></div>`; }));
    html = replaceContainer(html, 'github-projects-container', list(data.projects, project => { const git = safePublicUrl(project.html_url), live = safePublicUrl(project.homepage), image = safePublicUrl(project.image), video = safePublicUrl(project.video); return `<div class="work__card glass" role="button" tabindex="0" aria-label="View ${escape(project.name)} project details" data-title="${escape(project.name)}" data-category="${escape(project.category || 'Web App')}" data-tech="${escape(project.language)}" data-desc="${escape(project.description)}" data-git="${escape(git)}" data-live="${escape(live)}" data-image="${escape(image)}" data-video="${escape(video)}">${image ? `<img src="${escape(image)}" alt="Preview of ${escape(project.name)} project" class="work__img" loading="lazy" decoding="async">` : ''}<div class="work__details-overlay"><h3 class="work__title">${escape(project.name)}</h3></div></div>`; }));
    return html;
}

module.exports = { renderPage, siteOrigin };
