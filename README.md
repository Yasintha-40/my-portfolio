# Yasintha Portfolio

Personal portfolio website for Yasintha, a Software Engineering student at SLIIT.

The project combines a modern frontend portfolio with a Node.js backend admin panel so the content can be managed locally.

## Features

- Responsive personal portfolio built with HTML, CSS, and JavaScript.
- Animated sections, smooth scrolling, and a mobile-first layout.
- Admin dashboard for managing portfolio data and contact messages.
- File upload support for images, videos, and PDFs.
- Backend API powered by Express and Multer.

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- File handling: Multer
- Persistent data storage: Supabase; private JSON is used only as a local migration/backup source

## Project Structure

- `frontend/` contains the public portfolio website.
- `frontend/backend/` contains the API server and admin panel.
- `frontend/backend/admin/` contains the admin login and dashboard files.
- `frontend/backend/data.json` is an optional private local source for migration and backup scripts. It is ignored by Git and is not required by local server startup or production builds.
- `scripts/fixtures/portfolio.test-fixture.json` contains synthetic public-shaped test data only.

## Run Locally

1. Install dependencies inside the backend folder:

	```bash
	cd frontend/backend
	npm install
	```

2. Start the server:

	```bash
	npm start
	```

3. Open the site in your browser:

	- Portfolio: `http://localhost:8080`
	- Admin panel: `http://localhost:8080/admin`


## Notes

- The backend serves the public page and assets from `frontend/` without exposing `frontend/backend/`.
- Uploaded files are stored in `frontend/assets/uploads/`.
- Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `frontend/backend/.env` to enable admin login. The `.env` file is ignored by Git.

## SEO and Vercel

- Set `SITE_URL` to the site's origin without a path. Use `http://localhost:8080` in the local `frontend/backend/.env` file and set the actual production HTTPS origin in Vercel's environment variables. Only localhost or `127.0.0.1` may use HTTP. Without a valid `SITE_URL`, the site uses `noindex` and does not publish a sitemap.
- The homepage renders public portfolio data in its initial HTML response. The browser still refreshes the same sections from `/api/portfolio`, and admin changes appear on the next request.
- `robots.txt` and `sitemap.xml` list only the public homepage. Admin and API responses are marked `noindex`; backend files and contact messages are never served as static files.
- Vercel runs the Express app as a function and serves allowlisted assets. Portfolio data, contact messages, sessions and rate limits use Supabase RPCs; uploads use the public `portfolio-public` bucket. Upload requests are limited to 4 MiB in total.
- `frontend/backend/data.json` is private local migration/backup input and must remain untracked. A clean checkout does not include it; restore it locally only when running the offline migration or backup tools. The Vercel build and Supabase-backed runtime do not read this file.

## GitHub language statistics

- The public My Skills percentages show each language's share of code bytes across Yasintha-40's public, non-fork GitHub repositories. They are GitHub code-usage shares, not proficiency scores. Skills and technologies configured in the admin dashboard remain visible as names without ratings.
- The browser requests GitHub's public repository and per-repository language endpoints, then caches a complete result locally for six hours. It never displays partial or estimated percentages. If GitHub is unavailable, the page shows a clear unavailable message or labels an older cached snapshot.
- GitHub's unauthenticated API limits requests. If there are more than 50 eligible repositories or the limit is reached, the page reports that stats are unavailable rather than displaying an incomplete breakdown.

## Security and production readiness

- Local admin sessions, login/contact rate limits, and private contact messages are stored in the ignored `frontend/backend/.local-security-state.json` file during development. This file is private local state and must not be committed or copied to a public location.
- The backend requires Supabase for portfolio data, sessions, rate limits, contact submissions and uploads. These operations fail closed if persistent storage is unavailable.
- Set `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SITE_URL`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`), and a random `RATE_LIMIT_HMAC_SECRET` on the server. Set `NODE_ENV=production` for production. Keep all credentials server-side only.
- Supabase integration still needs persistent portfolio editing, expiring/revocable session records, atomic shared rate-limit counters, private contact-message storage with admin-only access, and private upload storage with server-side signature/type checks. Configure policies so only the server-side service can read/write administrative data; public clients should receive only the portfolio fields intentionally exposed by `/api/portfolio`.
- Admin responses and APIs are no-store. Uploaded content is restricted to raster images, video, and PDFs; SVG and other active formats are rejected. Review new uploads before making them public because accepted public portfolio media is served from the assets path.
- CSP currently permits inline script/style behavior used by existing pages. User-controlled values are escaped and URL/CSS inputs are validated, but removing the inline allowances requires a separate compatibility pass over existing handlers and style attributes.
- Contact messages are stored in Supabase and are never included in the synthetic test fixture. A historical Git commit contains a private contact record. Removing the current JSON file from tracking will not remove that historical copy. Before making the repository public or sharing it with a new audience, review repository visibility and access, then plan any history cleanup with repository collaborators and GitHub's sensitive-data removal process. Do not put historical message contents in tickets, logs, or replacement fixtures.

### SEO checks

1. Start the backend with `npm start` from `frontend/backend` and open `http://localhost:8080/`.
2. View page source and confirm one title, description, canonical link to `http://localhost:8080/`, Open Graph image at `/assets/img/social-preview.jpg` with 1200×630 dimensions, a large Twitter Card, one JSON-LD block, and populated skills, projects, education, experience, and certificates.
3. Request `/backend/data.json`, `/backend/server.js`, and `/backend/.env`; all should return 404. Request `/api/messages` without login; it should return 401.
4. Check `http://localhost:8080/robots.txt` and `http://localhost:8080/sitemap.xml`; the sitemap should contain only the homepage. To simulate production metadata locally, temporarily set `SITE_URL` to your actual production HTTPS origin, restart the server, then request `curl.exe -H "Host: YOUR_DOMAIN" http://localhost:8080/`, `/robots.txt`, and `/sitemap.xml` with the same Host header. Replace `YOUR_DOMAIN` with the hostname from `SITE_URL`. A localhost request with a production `SITE_URL` remains `noindex`.
5. After Vercel deployment, inspect the homepage source for one canonical URL, one title and description, Open Graph and Twitter tags, and Person JSON-LD. Confirm `/admin` and `/api/portfolio` return `X-Robots-Tag: noindex, nofollow`, and check a preview deployment is `noindex`.

