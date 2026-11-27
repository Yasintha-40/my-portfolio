'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const dataFile = path.join(projectRoot, 'frontend', 'backend', 'data.json');
const assetsRoot = path.join(projectRoot, 'frontend', 'assets');

function isWithin(parent, candidate) {
    const relative = path.relative(parent, candidate);
    return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`));
}

function sha256(filePath) {
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function referencedLocalMedia(data) {
    const candidates = [];
    for (const project of data.projects || []) {
        candidates.push(project.image, project.video);
    }
    for (const certificate of data.certificates || []) {
        candidates.push(certificate.image, certificate.pdf);
    }

    const paths = new Set();
    for (const value of candidates) {
        if (typeof value !== 'string' || !value.startsWith('/assets/')) continue;
        const pathname = new URL(value, 'https://backup.invalid').pathname;
        const decoded = decodeURIComponent(pathname);
        if (decoded.split('/').includes('..')) throw new Error('Unsafe local asset path in portfolio data.');
        const source = path.resolve(projectRoot, 'frontend', `.${decoded}`);
        if (!isWithin(assetsRoot, source)) throw new Error('Portfolio asset path is outside the assets directory.');
        if (!fs.existsSync(source) || !fs.statSync(source).isFile()) {
            throw new Error('A locally referenced portfolio asset is missing; backup stopped.');
        }
        const realAssetsRoot = fs.realpathSync(assetsRoot);
        const realSource = fs.realpathSync(source);
        if (!isWithin(realAssetsRoot, realSource)) throw new Error('A referenced asset resolves outside the assets directory.');
        paths.add(realSource);
    }
    return [...paths].sort();
}

function parseOutArgument() {
    const index = process.argv.indexOf('--out');
    if (index === -1) return path.join(os.homedir(), 'portfolio-private-backups');
    if (!process.argv[index + 1]) throw new Error('Use --out followed by a backup directory outside the repository.');
    return path.resolve(process.argv[index + 1]);
}

function restrictBackupPermissions(directory) {
    if (process.platform !== 'win32') return;
    const account = process.env.USERDOMAIN && process.env.USERNAME
        ? `${process.env.USERDOMAIN}\\${process.env.USERNAME}`
        : process.env.USERNAME;
    if (!account) throw new Error('Cannot determine the current Windows account to secure the backup.');
    const inherited = [`${account}:(OI)(CI)F`, 'NT AUTHORITY\\SYSTEM:(OI)(CI)F', 'BUILTIN\\Administrators:(OI)(CI)F'];
    const explicit = [`${account}:F`, 'NT AUTHORITY\\SYSTEM:F', 'BUILTIN\\Administrators:F'];
    const restrictTree = spawnSync('icacls.exe', [
        directory,
        '/inheritance:r',
        '/grant:r',
        ...explicit,
        '/T',
        '/C'
    ], { windowsHide: true, encoding: 'utf8' });
    const protectFutureChildren = spawnSync('icacls.exe', [directory, '/grant', ...inherited], {
        windowsHide: true,
        encoding: 'utf8'
    });
    if (restrictTree.error || restrictTree.status !== 0 || protectFutureChildren.error || protectFutureChildren.status !== 0) {
        throw new Error('Could not restrict Windows access to the private backup.');
    }
}

function main() {
    if (!fs.existsSync(dataFile)) throw new Error('Portfolio JSON file was not found.');
    const raw = fs.readFileSync(dataFile);
    const data = JSON.parse(raw.toString('utf8'));
    const mediaFiles = referencedLocalMedia(data);
    let backupRoot = parseOutArgument();
    if (isWithin(projectRoot, backupRoot)) {
        throw new Error('Backup destination must be outside the repository.');
    }

    fs.mkdirSync(backupRoot, { recursive: true, mode: 0o700 });
    backupRoot = fs.realpathSync(backupRoot);
    if (isWithin(projectRoot, backupRoot)) {
        throw new Error('Backup destination resolves inside the repository; choose an external directory.');
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `portfolio-${stamp}-${crypto.randomBytes(4).toString('hex')}`;
    const tempDir = path.join(backupRoot, `.${backupName}.tmp`);
    const finalDir = path.join(backupRoot, backupName);
    fs.mkdirSync(tempDir, { mode: 0o700 });

    try {
        const jsonDestination = path.join(tempDir, 'frontend', 'backend', 'data.json');
        fs.mkdirSync(path.dirname(jsonDestination), { recursive: true, mode: 0o700 });
        fs.copyFileSync(dataFile, jsonDestination, fs.constants.COPYFILE_EXCL);
        fs.chmodSync(jsonDestination, 0o600);

        const manifestFiles = [{
            path: 'frontend/backend/data.json',
            bytes: raw.length,
            sha256: sha256(dataFile)
        }];
        for (const source of mediaFiles) {
            const relativeAsset = path.relative(assetsRoot, source);
            const destination = path.join(tempDir, 'frontend', 'assets', relativeAsset);
            fs.mkdirSync(path.dirname(destination), { recursive: true, mode: 0o700 });
            fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
            fs.chmodSync(destination, 0o600);
            manifestFiles.push({
                path: path.join('frontend', 'assets', relativeAsset).replace(/\\/g, '/'),
                bytes: fs.statSync(source).size,
                sha256: sha256(source)
            });
        }

        const manifest = {
            createdAt: new Date().toISOString(),
            source: 'current working-tree files only',
            files: manifestFiles,
            recordCounts: {
                skillsFrontend: data.skills?.frontend?.length || 0,
                skillsBackend: data.skills?.backend?.length || 0,
                education: data.education?.length || 0,
                experience: data.experience?.length || 0,
                projects: data.projects?.length || 0,
                certificates: data.certificates?.length || 0,
                currentJsonMessages: data.messages?.length || 0
            }
        };
        const manifestPath = path.join(tempDir, 'manifest.json');
        fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
        restrictBackupPermissions(tempDir);
        fs.renameSync(tempDir, finalDir);
        console.log(`Private backup created outside the repository: ${finalDir}`);
        console.log(`Backed up ${manifestFiles.length} files; source data and message contents were not printed.`);
    } catch (error) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        throw error;
    }
}

try {
    main();
} catch (error) {
    console.error(`Backup failed: ${error.message}`);
    process.exitCode = 1;
}
