const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');
const { renderPage, siteOrigin } = require('./seo');
const { fromEnvironment, hash } = require('./supabase-adapter');
const validators = require('./validation');

const store = fromEnvironment();
const app = express();
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
const PORT = process.env.PORT || 8080;
const SESSION_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-portfolio_session' : 'portfolio_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const SESSION_TTL_SECONDS = SESSION_TTL_MS / 1000;

function allowedOrigins() {
    const configured = siteOrigin();
    const origins = configured ? [configured] : [];
    if (process.env.NODE_ENV !== 'production') origins.push('http://localhost:8080', 'http://127.0.0.1:8080');
    return new Set(origins);
}

app.use(cors({ origin(origin, callback) { callback(null, !origin || allowedOrigins().has(origin)); }, methods: ['GET', 'POST', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'X-CSRF-Token'] }));
app.use(express.json({ limit: '128kb', strict: true }));
app.use((req, res, next) => {
    const cookies = {};
    for (const part of (req.headers.cookie || '').split(';')) {
        const index = part.indexOf('=');
        if (index > 0) {
            try { cookies[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim()); } catch {}
        }
    }
    req.cookies = cookies;
    next();
});
app.use((req, res, next) => {
    res.set('Content-Security-Policy', "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self' https://formsubmit.co; script-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com; font-src 'self' https://fonts.gstatic.com https://unpkg.com; img-src 'self' data: https:; connect-src 'self' https://api.github.com https://formsubmit.co; frame-src https://www.youtube.com https://player.vimeo.com; media-src 'self' https:");
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.set('Cache-Control', 'no-store');
    if (process.env.NODE_ENV === 'production') res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    if (req.path.startsWith('/api/') || req.path.startsWith('/admin')) res.set('X-Robots-Tag', 'noindex, nofollow');
    next();
});

function setSessionCookie(res, id) {
    res.cookie(SESSION_COOKIE, id, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: SESSION_TTL_MS });
}

function clearSessionCookie(res) {
    res.clearCookie(SESSION_COOKIE, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
}

function rejectCrossOrigin(req) {
    const origin = req.get('Origin');
    if (!origin) return false;
    try { return !allowedOrigins().has(new URL(origin).origin); } catch { return true; }
}

function equalCredential(candidate, expected) {
    const candidateHash = crypto.createHash('sha256').update(String(candidate)).digest();
    const expectedHash = crypto.createHash('sha256').update(String(expected)).digest();
    return crypto.timingSafeEqual(candidateHash, expectedHash);
}

function csrfFor(id) {
    return crypto.createHmac('sha256', process.env.ADMIN_PASSWORD).update(`portfolio-csrf:${id}`).digest('base64url');
}
async function authenticateSession(req, res, next) {
    if (!store || !process.env.ADMIN_PASSWORD) return res.status(503).json({ error: 'Persistent security storage is not configured.' });
    const id = req.cookies?.[SESSION_COOKIE];
    if (!id) return res.status(401).json({ error: 'Authentication required.' });
    try {
        const session = await store.getSession(id);
        if (!session) { clearSessionCookie(res); return res.status(401).json({ error: 'Authentication required.' }); }
        const csrfToken = csrfFor(id);
        if (hash(csrfToken) !== session.csrf_token_hash) return res.status(401).json({ error: 'Authentication required.' });
        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
            const supplied = Buffer.from(req.get('X-CSRF-Token') || '');
            const expected = Buffer.from(csrfToken);
            if (rejectCrossOrigin(req) || supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return res.status(403).json({ error: 'Request verification failed.' });
        }
        req.adminSessionId = id;
        req.adminSession = { csrfToken, expiresAt: new Date(session.expires_at).getTime() };
        next();
    } catch { res.status(503).json({ error: 'Persistent security storage is unavailable.' }); }
}
function rateLimit(bucket, max, windowMs) {
    return async (req, res, next) => {
        if (!store) return res.status(503).json({ error: 'Persistent security storage is not configured.' });
        try {
            const result = await store.rateLimit(bucket, req.ip || 'unknown', max, windowMs);
            res.set('RateLimit-Limit', String(max));
            res.set('RateLimit-Remaining', String(result.remaining_count));
            if (!result.is_allowed) { res.set('Retry-After', String(result.retry_after_seconds)); return res.status(429).json({ error: 'Request limit reached. Try again later.' }); }
            next();
        } catch { res.status(503).json({ error: 'Persistent security storage is unavailable.' }); }
    };
}

// Helper functions for reading/writing data
const defaultProfile = {
    name: 'Yasintha',
    titles: ["Web Developer", "Software Engineer", "UI/UX Designer", "IT Student @ SLIIT"],
    description: 'Software Engineering Student at the Sri Lanka Institute of Information Technology (SLIIT). I design and build highly interactive, modern web and mobile applications with an eye for premium user experiences.',
    aboutTitle: 'Developing Software to Solve Real Problems',
    aboutText: 'I am a dedicated IT undergraduate student specializing in Software Engineering at SLIIT. Passionate about exploring computer technologies, web design, and full-stack development. I enjoy writing clean, semantic code and designing engaging interfaces that connect users with technology.',
    aboutEducation: 'BSc (Hons) in IT (SE) at SLIIT',
    aboutProjects: '5 Completed Apps'
};

const defaultSkills = {
    frontend: [
        { name: 'HTML5', percentage: 95, icon: 'bxl-html5' },
        { name: 'CSS3 & Tailwind', percentage: 85, icon: 'bxl-css3' },
        { name: 'JavaScript', percentage: 75, icon: 'bxl-javascript' },
        { name: 'React JS', percentage: 75, icon: 'bxl-react' },
        { name: 'UI/UX Design', percentage: 80, icon: 'bxs-paint' }
    ],
    backend: [
        { name: 'PHP & Laravel', percentage: 80, icon: 'bxl-php' },
        { name: 'MySQL & databases', percentage: 85, icon: 'bxs-data' },
        { name: 'React Native / Mobile', percentage: 70, icon: 'bxl-react' },
        { name: 'Git & GitHub', percentage: 90, icon: 'bxl-git' }
    ]
};

const defaultEducation = [
    {
        date: '2023 - Present',
        title: 'BSc (Hons) in Information Technology',
        subtitle: 'Sri Lanka Institute of Information Technology (SLIIT)',
        desc: 'Specializing in Software Engineering. Learning comprehensive engineering principles, modern software design architectures, and advanced programming paradigms.',
        bullets: [
            '<strong>Core Modules:</strong> Web Application Development, Database Management Systems, Data Structures & Algorithms, Object-Oriented Programming (Java/C++), and Agile Methodologies.',
            '<strong>Key Project Portfolio:</strong> Developed a Tourism Portal Web Application using PHP and MySQL database integration; built dynamic React dashboard elements using REST APIs.',
            '<strong>Extracurriculars:</strong> Active member of the SLIIT Computer Society, collaborating in team hackathons and software coding challenges.'
        ],
        tags: ['Java', 'C++', 'PHP', 'React', 'MySQL', 'Agile'],
        icon: 'bx-graduation'
    },
    {
        date: '2020 - 2022',
        title: 'G.C.E. Advanced Level (A/L)',
        subtitle: 'Commerce Stream · Mo/Medagama National School',
        desc: 'Completed secondary education in Commerce Stream, focusing on Accounting, Business Studies, and Economics to build a solid business intelligence and financial foundation.',
        bullets: [
            'Acquired strong business analysis, decision-making, and financial problem-solving skills through advanced commercial and economic principles.',
            'Active member of the school Commerce Society and participated in regional youth entrepreneurship seminars.'
        ],
        tags: ['Accounting', 'Business Studies', 'Economics'],
        icon: 'bx-book-open'
    },
    {
        date: '2014 - 2019',
        title: 'G.C.E. Ordinary Level (O/L)',
        subtitle: 'Secondary School Education · Mo/Medagama National School',
        desc: 'Completed junior secondary school curriculum with high honors and outstanding academic distinction across core disciplines.',
        bullets: [
            '<strong>Academic Achievement:</strong> Successfully passed G.C.E. Ordinary Level examination with 9 \'A\' (Distinction) grades including Mathematics, Science, English, and Information Technology.',
            '<strong>Leadership & Activities:</strong> Selected as a Junior Prefect and represented the school in regional IT and science exhibitions.'
        ],
        tags: ['ICT', 'Mathematics', 'English', 'Leadership'],
        icon: 'bx-book-bookmark'
    }
];

const defaultExperience = [
    {
        date: 'May 2026 – Present',
        title: 'Software Development Intern',
        type: 'Internship',
        typeClass: 'exp-timeline__type--intern',
        company: 'Sri Lanka Tourism Development Authority (SLTDA)',
        bullets: [
            'Developed a Pension Scheme Management System to streamline pension-related administrative processes and data management.',
            'Developed Tourist Guide ID Printing and Inspection Officer ID Printing Systems to simplify information management, ID card generation, and printing.',
            'Contributed to the redesign and development of the new Sri Lanka Travel official website (srilanka.travel), focusing on responsive design, UI/UX improvements, functionality, and SEO optimization.',
            'Maintained and enhanced the existing Sri Lanka Travel official website through content updates, bug fixes, troubleshooting, and functionality improvements.',
            'Performed full-stack development, database management, system integration, software testing, debugging, and collaborative development using version control.'
        ],
        tags: ['React.js', 'JavaScript', 'HTML', 'CSS', 'PHP', 'MySQL', 'Git', 'GitHub', 'Figma', 'Adobe Photoshop', 'XAMPP', 'VS Code'],
        icon: 'bx-code-block',
        themeColor: 'var(--secondary-color)',
        themeColorRGB: '6, 182, 212'
    }
];

async function readData() {
    if (!store) throw new Error('Persistent storage is not configured');
    return await store.getPortfolio();
}

const uploadTypes = {
    '.png': { field: 'image', mime: 'image/png' }, '.jpg': { field: 'image', mime: 'image/jpeg' }, '.jpeg': { field: 'image', mime: 'image/jpeg' }, '.webp': { field: 'image', mime: 'image/webp' },
    '.mp4': { field: 'video', mime: 'video/mp4' }, '.webm': { field: 'video', mime: 'video/webm' }, '.pdf': { field: 'pdf', mime: 'application/pdf' }
};

function validFileSignature(file) {
    const b = file.buffer;
    switch (path.extname(file.originalname).toLowerCase()) {
        case '.png': return b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
        case '.jpg': case '.jpeg': return b[0] === 0xff && b[1] === 0xd8 && b[b.length - 2] === 0xff && b[b.length - 1] === 0xd9;
        case '.webp': return b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP';
        case '.pdf': return b.toString('ascii', 0, 5) === '%PDF-' && !/\/(?:JavaScript|JS|OpenAction|AA|Launch|EmbeddedFile)\b/i.test(b.toString('latin1'));
        case '.mp4': return b.toString('ascii', 4, 8) === 'ftyp';
        case '.webm': return b.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
        default: return false;
    }
}

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 4 * 1024 * 1024, files: 3, fields: 0, parts: 3 },
    fileFilter(req, file, callback) {
        const expected = uploadTypes[path.extname(file.originalname).toLowerCase()];
        if (!expected || expected.field !== file.fieldname || expected.mime !== file.mimetype) return callback(new Error('Unsupported upload type.'));
        callback(null, true);
    }
});
app.post('/api/upload', authenticateSession, rateLimit('upload', 20, 60 * 60 * 1000), upload.fields([
    { name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }, { name: 'pdf', maxCount: 1 }
]), async (req, res) => {
    const files = Object.values(req.files || {}).flat();
    if (!files.length || files.reduce((sum, file) => sum + file.size, 0) > 4 * 1024 * 1024 || files.some(file => !validFileSignature(file))) return res.status(400).json({ error: 'Unsupported upload content.' });
    try {
        const result = {};
        for (const file of files) result[file.fieldname] = await store.upload(file);
        res.json({ success: true, ...result });
    } catch { res.status(503).json({ error: 'File storage is unavailable.' }); }
});

/*===== API ENDPOINTS =====*/

function validateRequest(res, validator, value) {
    try { return validator(value); } catch { res.status(400).json({ error: 'Invalid request data.' }); return null; }
}

// Credentials remain server-side; session and CSRF tokens are stored only as hashes.
app.post('/api/login', rateLimit('login', 8, 15 * 60 * 1000), async (req, res) => {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD || !equalCredential(username, process.env.ADMIN_USERNAME) || !equalCredential(password, process.env.ADMIN_PASSWORD) || rejectCrossOrigin(req)) return res.status(401).json({ success: false, error: 'Invalid username or password.' });
    const id = crypto.randomBytes(32).toString('base64url');
    const csrfToken = csrfFor(id);
    try { await store.createSession(id, csrfToken); setSessionCookie(res, id); res.json({ success: true, csrfToken, expiresIn: SESSION_TTL_SECONDS }); }
    catch { res.status(503).json({ error: 'Persistent security storage is unavailable.' }); }
});
app.get('/api/session', authenticateSession, (req, res) => res.json({ authenticated: true, ...req.adminSession }));
app.post('/api/logout', authenticateSession, async (req, res) => {
    try { await store.revokeSession(req.adminSessionId); clearSessionCookie(res); res.json({ success: true }); }
    catch { res.status(503).json({ error: 'Persistent security storage is unavailable.' }); }
});
app.get('/api/portfolio', async (req, res) => {
    try { res.json(await readData()); } catch { res.status(503).json({ error: 'Portfolio storage is unavailable.' }); }
});
for (const [section, validator] of Object.entries({ profile: validators.validateProfile, skills: validators.validateSkills, education: validators.validateEducation, experience: validators.validateExperience, projects: validators.validateProjects, certificates: validators.validateCertificates })) {
    app.post(`/api/${section}`, authenticateSession, async (req, res) => {
        const payload = validateRequest(res, validator, req.body);
        if (!payload) return;
        try { await store.saveSection(section, payload); res.json({ success: true, message: 'Saved.' }); }
        catch { res.status(503).json({ error: 'Portfolio storage is unavailable.' }); }
    });
}
app.get('/api/messages', authenticateSession, async (req, res) => {
    try { res.json(await store.listMessages()); } catch { res.status(503).json({ error: 'Private-message storage is unavailable.' }); }
});
app.post('/api/messages', rateLimit('contact', 5, 60 * 60 * 1000), async (req, res) => {
    const input = validateRequest(res, validators.validateMessage, req.body);
    if (!input) return;
    try { await store.insertMessage({ id: crypto.randomUUID(), ...input, date: new Date().toLocaleString() }); res.json({ success: true, message: 'Contact request logged successfully.' }); }
    catch { res.status(503).json({ error: 'Private-message storage is unavailable.' }); }
});
app.post('/api/messages/read', authenticateSession, async (req, res) => {
    const { id } = req.body || {};
    if (typeof id !== 'string' || !id || id.length > 64) return res.status(400).json({ error: 'Invalid request data.' });
    try { if (!await store.toggleMessage(id)) return res.status(404).json({ error: 'Message not found.' }); res.json({ success: true, message: 'Message status updated.' }); }
    catch { res.status(503).json({ error: 'Private-message storage is unavailable.' }); }
});
app.delete('/api/messages', authenticateSession, async (req, res) => {
    const { id } = req.body || {};
    if (id !== undefined && (typeof id !== 'string' || !id || id.length > 64)) return res.status(400).json({ error: 'Invalid request data.' });
    try { await store.deleteMessage(id); res.json({ success: true, message: 'Message(s) deleted.' }); }
    catch { res.status(503).json({ error: 'Private-message storage is unavailable.' }); }
});

/*===== STATIC ASSETS HOSTING =====*/
// Host admin statically at /admin
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Serve only intended public assets, never the backend directory or data.json.
// Public assets are served by Vercel static routes or the local development entrypoint.

app.get('/google445b1cc64cd53216.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'google445b1cc64cd53216.html'));
});

app.get('/robots.txt', (req, res) => {
    const origin = siteOrigin();
    res.type('text/plain').send(origin && req.hostname === new URL(origin).hostname
        ? `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`
        : 'User-agent: *\nDisallow: /\n');
});

app.get('/sitemap.xml', (req, res) => {
    const origin = siteOrigin();
    if (!origin || req.hostname !== new URL(origin).hostname) return res.status(503).type('text/plain').send('Sitemap is available only on the configured production domain.');
    res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${origin}/</loc></url></urlset>`);
});

app.get(['/', '/index.html'], async (req, res) => {
    if (req.path === '/index.html') return res.redirect(301, '/');
    try { res.type('html').send(renderPage(await readData(), req.hostname)); } catch { res.status(503).type('text/plain').send('Portfolio temporarily unavailable.'); }
});

// Fallback for route /admin (loads /admin/index.html)
app.get('/admin', (req, res) => {
    if (req.path === '/admin') return res.redirect(302, '/admin/');
    res.sendFile(require.resolve('./admin/index.html'));
});

// Keep parser/upload failures controlled and avoid reflecting backend error details.
app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    const status = err?.type === 'entity.too.large' ? 413 : err instanceof multer.MulterError || err?.message === 'Unsupported upload type.' || err?.type === 'entity.parse.failed' ? 400 : 500;
    if (status >= 500) console.error('Request processing failed.');
    res.status(status).json({ error: status === 413 ? 'Request is too large.' : 'Invalid request.' });
});

// Start Server locally; Vercel will invoke the exported app directly.
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running at http://localhost:${PORT}`);
    });
}

module.exports = app;
