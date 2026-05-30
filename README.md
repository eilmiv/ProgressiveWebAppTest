# ProgressiveWebAppTest

A starter progressive web app with a Django backend and React + TypeScript frontend.

## Features

- Login/logout backed by Django sessions
- Local-first counters with UUID identifiers
- Each counter persisted separately in IndexedDB for offline-first updates
- Single backend sync endpoint keeps local counters aligned with the server
- Logout clears local user data
- **Full offline support** – the app shell is fully cached by a service worker so
  the UI loads and counters remain editable even when both the frontend dev
  server and the Django backend are unreachable

## Offline Capability

A [Workbox](https://developer.chrome.com/docs/workbox/)-based service worker is
generated automatically during `npm run build` (via
[vite-plugin-pwa](https://vite-pwa-org.netlify.app/)).

Strategy:
- **App shell (static assets)** – cache-first.  All JS, CSS, HTML, and asset
  files produced by Vite are precached on the first visit and served from the
  cache on every subsequent load, including when fully offline.
- **API calls (`/api/*`)** – network-only.  API requests are never cached; the
  app already handles failed requests gracefully (counters continue to work
  locally and are synced to the server the next time a connection is available).

> **Note:** The service worker is only active in the **production build**
> (`npm run build` + `npm run preview`).  It is not injected during `npm run dev`
> so that hot-module replacement (HMR) continues to work normally in development.

## Unique Hostname for Localhost (avoiding PWA conflicts)

Browsers scope PWA service workers and cached data to the **origin**
(`scheme + host + port`).  If you run several PWA projects on the same
`localhost` port, their service workers and IndexedDB databases can collide.

The recommended fix is to give each project its own hostname by adding an alias
to your system hosts file.

### 1. Add a hosts-file entry

Open your hosts file with admin / root privileges:

| OS | Path |
|----|------|
| macOS / Linux | `/etc/hosts` |
| Windows | `C:\Windows\System32\drivers\etc\hosts` |

Append a line that maps a unique hostname to `127.0.0.1`:

```
127.0.0.1  pwa-counter.localhost
```

Any `.localhost` subdomain resolves to `127.0.0.1` in modern browsers
**without** editing the hosts file.  If you prefer a non-`.localhost` domain
(e.g. `pwa-counter.dev`), you must add the hosts-file entry.

### 2. Tell the Vite dev server to bind to that hostname

```bash
cd frontend
npm run dev -- --host pwa-counter.localhost
```

Or add it permanently in `vite.config.ts`:

```ts
server: {
  host: 'pwa-counter.localhost',
  proxy: { '/api': 'http://127.0.0.1:8000' },
},
```

### 3. Open the app at its unique origin

```
http://pwa-counter.localhost:5173
```

Each project that follows this convention will have its own isolated origin,
so service workers, cookies, and IndexedDB data never interfere with one
another.

## Backend (Django)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install django
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

API base URL: `http://127.0.0.1:8000/api`

Run backend tests:

```bash
cd backend
python manage.py test
```

## Frontend (React + TypeScript)

```bash
cd frontend
npm install
npm run dev
```

Vite proxies `/api` requests to `http://127.0.0.1:8000`.

Run frontend tests:

```bash
cd frontend
npm test
```

Build and preview the production build (service worker active):

```bash
cd frontend
npm run build
npm run preview
```
