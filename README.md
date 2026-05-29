# ProgressiveWebAppTest

A starter progressive web app with a Django backend and React + TypeScript frontend.

## Features

- Login/logout backed by Django sessions
- Add/remove counters and increment/decrement them
- Counters persisted locally in IndexedDB so they can still be used offline
- Logout clears local user data; login reloads counters from the server

## Backend (Django)

```bash
cd /tmp/workspace/eilmiv/ProgressiveWebAppTest/backend
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
cd /tmp/workspace/eilmiv/ProgressiveWebAppTest/backend
python manage.py test
```

## Frontend (React + TypeScript)

```bash
cd /tmp/workspace/eilmiv/ProgressiveWebAppTest/frontend
npm install
npm run dev
```

Vite proxies `/api` requests to `http://127.0.0.1:8000`.

Run frontend tests:

```bash
cd /tmp/workspace/eilmiv/ProgressiveWebAppTest/frontend
npm test
```
