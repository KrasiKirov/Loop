# Deployment Guide

A minimal, cheap deploy: **managed Postgres** + a **Node web service** for the backend + a **static host** for the React frontend. Examples use Render + Neon + Vercel, but any equivalent works (Railway, Fly.io, Supabase, Netlify).

The app uses a two-role, row-level-security Postgres setup, so deployment has one extra step most apps don't: creating the `app_auth` / `app_user` roles with passwords. The `setup-db` script does that for you.

---

## 1. Provision Postgres

Create a managed Postgres database (Neon free tier, Render Postgres, or Supabase). Copy its **owner connection string** — it looks like:

```
postgres://OWNER:PASSWORD@HOST:5432/DBNAME
```

Note the **host**, **port**, and **database name** separately — the runtime needs them.

## 2. Bootstrap the database (one-time)

From `Backend/`, run the bootstrap script with the **owner** connection string and the two app-role passwords you want to use. Generate strong passwords (`openssl rand -hex 24`).

```bash
cd Backend
npm install
DATABASE_URL="postgres://OWNER:PW@HOST:5432/DBNAME" \
DB_AUTH_PASSWORD="<strong-secret-1>" \
DB_APP_PASSWORD="<strong-secret-2>" \
npm run setup-db
```

This applies `schema.sql` (tables, the `app_auth`/`app_user` roles, grants, RLS, the 18 patterns), sets the two role passwords, and loads all card decks. It prints `Done. patterns=18 cards=151`. It's safe to re-run (it skips the schema and decks if already present). The owner role must be allowed to `CREATE ROLE` (Neon/Render/Supabase owners are).

## 3. Deploy the backend (Render web service)

- **Root directory:** `Backend`
- **Build command:** `npm install`
- **Start command:** `npm start`
- **Environment variables:**

| Var | Value |
|---|---|
| `PORT` | `10000` (Render injects its own; the app reads `PORT`) |
| `JWT_ACCESS_SECRET` | a long random secret (`openssl rand -hex 32`) |
| `DB_HOST` | your Postgres host |
| `DB_PORT` | `5432` |
| `DB_NAME` | your database name |
| `DB_SSL` | `true` |
| `DB_AUTH_USER` | `app_auth` |
| `DB_AUTH_PASSWORD` | `<strong-secret-1>` (same as step 2) |
| `DB_APP_USER` | `app_user` |
| `DB_APP_PASSWORD` | `<strong-secret-2>` (same as step 2) |
| `CORS_ORIGINS` | your frontend URL (set after step 4, no trailing slash) |

The runtime connects as the two **app roles** (not the owner), so it never has more privilege than RLS allows.

## 4. Deploy the frontend (Vercel / Netlify)

- **Framework preset:** Create React App
- **Build command:** `npm run build`
- **Output directory:** `build`
- **Environment variable:** `REACT_APP_API_URL` = your deployed backend URL (e.g. `https://your-backend.onrender.com`), no trailing slash.

After the frontend has a URL, set the backend's `CORS_ORIGINS` to it and redeploy the backend.

## 5. Verify

- `curl https://your-backend.onrender.com/patterns` → `401` (route exists, needs auth).
- Open the frontend, sign up, and drill a Sliding Window card.

---

## Notes

- **Secrets** are never committed (`Backend/.env` is gitignored; use `Backend/.env.example` as the template).
- **Free tiers sleep:** a free Render service cold-starts after inactivity, so the first request may take ~30s. Fine for a portfolio demo.
- **Single-platform alternative:** Render can host the backend, the Postgres, and the frontend (as a static site) together — set the same env vars and the same `setup-db` step.
