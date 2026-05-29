# ProgressiveWebAppTest

A starter progressive web app with a Django backend and React + TypeScript frontend.

## Features

- Login/logout backed by Django sessions
- Local-first counters with UUID identifiers
- Each counter persisted separately in IndexedDB for offline-first updates
- Single backend sync endpoint keeps local counters aligned with the server
- Logout clears local user data

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
