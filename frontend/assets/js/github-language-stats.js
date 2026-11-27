/* Public GitHub code-language usage. Percentages measure bytes, not proficiency. */
const GitHubLanguageStats = (() => {
    const USERNAME = 'Yasintha-40';
    const CACHE_KEY = 'portfolio-github-language-usage-v2';
    const CACHE_AGE_MS = 6 * 60 * 60 * 1000;
    const MAX_REPOSITORIES = 50; // Stay within GitHub's unauthenticated hourly request limit.
    let repositoriesPromise;

    function summarize(languageMaps, repositoryCount, repositorySummary) {
        const totals = new Map();
        for (const languages of languageMaps) {
            for (const [name, bytes] of Object.entries(languages)) {
                if (Number.isFinite(bytes) && bytes > 0) {
                    totals.set(name, (totals.get(name) || 0) + bytes);
                }
            }
        }
        const totalBytes = [...totals.values()].reduce((sum, bytes) => sum + bytes, 0);
        if (!totalBytes) throw new Error('No language data is available for these repositories.');
        return {
            repositoryCount,
            repositorySummary,
            totalBytes,
            updatedAt: new Date().toISOString(),
            languages: [...totals].map(([name, bytes]) => ({
                name,
                bytes,
                percentage: Math.round(bytes / totalBytes * 1000) / 10
            })).sort((a, b) => b.bytes - a.bytes || a.name.localeCompare(b.name))
        };
    }

    function summarizeRepositories(repositories) {
        return {
            repositoryCount: repositories.length,
            totalStars: repositories.reduce((sum, repo) => sum + (Number(repo.stargazers_count) || 0), 0),
            reactReposCount: repositories.filter(repo =>
                repo.name.toLowerCase().includes('react') ||
                (repo.description && repo.description.toLowerCase().includes('react'))
            ).length
        };
    }

    function readCache() {
        try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch { return null; }
    }

    function isCacheFresh(cached) {
        const age = Date.now() - Date.parse(cached?.updatedAt);
        return Number.isFinite(age) && age >= 0 && age < CACHE_AGE_MS;
    }

    async function getJson(url) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
            const response = await fetch(url, {
                headers: { Accept: 'application/vnd.github+json' },
                signal: controller.signal
            });
            if (!response.ok) throw new Error(`GitHub API returned ${response.status}.`);
            return await response.json();
        } finally {
            clearTimeout(timeout);
        }
    }

    async function fetchRepositories() {
        const repositories = [];
        for (let page = 1; page <= 10; page++) {
            const batch = await getJson(`https://api.github.com/users/${USERNAME}/repos?per_page=100&page=${page}&type=owner`);
            if (!Array.isArray(batch)) throw new Error('Unexpected GitHub repository response.');
            repositories.push(...batch.filter(repo => !repo.fork && !repo.private));
            if (batch.length < 100) break;
            if (page === 10) throw new Error('Repository list is too large to calculate accurately.');
        }
        if (repositories.length > MAX_REPOSITORIES) throw new Error('Too many repositories for the public GitHub API limit.');
        if (!repositories.length) throw new Error('No public, non-fork repositories were found.');

        return { repositories, summary: summarizeRepositories(repositories) };
    }

    function getRepositories() {
        if (!repositoriesPromise) {
            repositoriesPromise = fetchRepositories().catch(error => {
                repositoriesPromise = null;
                throw error;
            });
        }
        return repositoriesPromise;
    }

    function getRepositorySummary() {
        const cached = readCache();
        if (cached?.repositorySummary && isCacheFresh(cached)) return Promise.resolve(cached.repositorySummary);
        return getRepositories().then(({ summary }) => summary).catch(error => {
            if (cached?.repositorySummary) return { ...cached.repositorySummary, stale: true };
            throw error;
        });
    }

    async function fetchCurrent() {
        const { repositories, summary } = await getRepositories();

        const languageMaps = [];
        for (let start = 0; start < repositories.length; start += 5) {
            const batch = repositories.slice(start, start + 5);
            const results = await Promise.all(batch.map(repo => {
                const url = new URL(repo.languages_url);
                if (url.hostname !== 'api.github.com' || url.protocol !== 'https:') throw new Error('Unexpected GitHub language URL.');
                return getJson(url.href);
            }));
            languageMaps.push(...results);
        }
        return summarize(languageMaps, repositories.length, summary);
    }

    async function load() {
        const cached = readCache();
        if (cached?.languages?.length && cached.repositorySummary && isCacheFresh(cached)) {
            return cached;
        }
        try {
            const current = await fetchCurrent();
            try { localStorage.setItem(CACHE_KEY, JSON.stringify(current)); } catch {}
            return current;
        } catch (error) {
            if (cached?.languages?.length) return { ...cached, stale: true };
            throw error;
        }
    }

    return { load, getRepositorySummary, summarize };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = GitHubLanguageStats;
