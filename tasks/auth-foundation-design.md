# Auth Foundation — Design Spec

**Date:** 2026-06-01
**Goal:** Replace the current spoofable auth (a username stored in localStorage, trusted by the API) with a real token-based system: JWT access tokens + DB-backed rotating refresh tokens, and server-side identity on every protected write.

**Context:** First of four "foundation" sub-projects. The others — cloud hosting, account management (password reset / email verification / deletion), and legal (privacy policy) — are separate specs that follow this one.

---

## 1. Architecture & Token Flow

The server becomes the sole source of truth for identity. No endpoint trusts a client-supplied username.

```
Login/Signup ──> server verifies credentials ──> issues:
   • access token  (JWT, signed, 15-min expiry, payload = { sub: userId, username })
   • refresh token (random 256-bit opaque string, 30-day expiry, stored HASHED in DB)

Every protected API call ──> Authorization: Bearer <access token>
   requireAuth middleware verifies the JWT ──> sets req.user = { id, username }

Access token expired (401) ──> client calls /auth/refresh with the refresh token
   server matches its sha256 hash in DB ──> rotates (old revoked, new issued) ──> client retries

Refresh token reused after rotation (theft signal) ──> server revokes ALL that user's tokens
Logout ──> server revokes the supplied refresh token
```

**Critical security fix:** `POST /user/elo` will derive the user from `req.user.id` (verified token), never from the request body. Today any client can update any user's ELO by sending their username.

**New libraries:** `jsonwebtoken` (access tokens); Node built-in `crypto` (refresh token generation + sha256 hashing). `bcryptjs`, `pg`, `express`, `cors` already present.

---

## 2. Backend

### 2.1 Data model — one new table

```sql
CREATE TABLE refresh_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,        -- sha256 hex of the refresh token
  expires_at TIMESTAMP NOT NULL,
  revoked    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_refresh_user ON refresh_tokens(user_id);
```

`users` is unchanged (already has `id`).

### 2.2 Endpoints

| Method | Route | Access-token required | Behavior |
|--------|-------|:---:|----------|
| POST | `/auth/signup` | — | Create user (bcrypt hash), issue token pair, return `{ accessToken, refreshToken, user }` |
| POST | `/auth/login` | — | Verify password, issue token pair, same response |
| POST | `/auth/refresh` | — | Validate refresh token against DB → rotate → return new pair. Reuse of a revoked token ⇒ revoke all user tokens, respond 401 |
| POST | `/auth/logout` | — | Revoke the supplied refresh token, respond 204 |
| GET | `/questions` | ✅ | Requires a valid access token |
| POST | `/user/elo` | ✅ | Updates `users.score` for `req.user.id`; body carries only `elo` |

The `/auth/*` routes are not "open" — signup is public by definition; login is guarded by username+password; refresh and logout are guarded by the refresh token itself. The access-token column means "guarded by the `requireAuth` middleware."

`user` object returned to the client: `{ name, username, elo }` (same shape as today, derived from the `users` row; `elo` = `score`).

### 2.3 Token rules

- **Access token:** JWT signed with `JWT_ACCESS_SECRET`, payload `{ sub: userId, username }`, `expiresIn: 15m`.
- **Refresh token:** `crypto.randomBytes(32).toString('hex')`, returned to client as opaque string; only its `sha256` hash is stored. 30-day expiry.
- **Rotation:** every successful `/auth/refresh` marks the presented token's row `revoked = true` and inserts a fresh row.
- **Reuse detection:** if a presented refresh token's hash matches a row already `revoked = true` (and unexpired), treat as theft — set `revoked = true` for all of that user's rows and respond 401.

### 2.4 File structure (split server.js by responsibility)

| File | Responsibility |
|------|----------------|
| `Backend/db.js` | Shared `pg` Pool (extracted from server.js) |
| `Backend/auth/tokens.js` | sign/verify access tokens; create/rotate/revoke/verify refresh tokens |
| `Backend/auth/routes.js` | the `/auth/*` Express router |
| `Backend/middleware/requireAuth.js` | Bearer-token guard → sets `req.user` |
| `Backend/server.js` | wires middleware + routers; keeps `/questions` and `/user/elo` (now guarded) |

### 2.5 Secrets

Add to `Backend/.env`: `JWT_ACCESS_SECRET=<random>`. Access expiry 15m, refresh expiry 30d (constants in `tokens.js`).

---

## 3. Frontend

### 3.1 Token storage
`localStorage` keys: `accessToken`, `refreshToken`, `user`. (Capacitor later swaps these for secure native storage behind the same interface — a one-file change.)

### 3.2 API client — `src/api/client.js`
Exports `apiFetch(path, options)`:
- Attaches `Authorization: Bearer <accessToken>` automatically.
- On `401`: calls `/auth/refresh` **once**, stores the rotated pair, retries the original request.
- If refresh fails: clears storage, redirects to `/login`.
- No component touches tokens directly — they call `apiFetch`.

### 3.3 `UserContext` → `AuthContext` (`src/AuthContext.js`)
- Holds `{ user, accessToken }`, initialised from localStorage.
- `login(credentials)` / `signup(data)` → call endpoints, persist pair + user.
- `logout()` → call `/auth/logout` to revoke, clear storage, redirect.
- Keeps the `useUser()` hook export name so Navbar/Quiz need minimal edits.

### 3.4 Component edits
- `PrivateRoute` → gate on a present `accessToken` (instead of `user.username`).
- `LoginForm` / `SignupForm` → call `login()` / `signup()` from context (hit `/auth/*`).
- `Navbar` logout → `logout()` from context.
- `Quiz` ELO save → `apiFetch('/user/elo', { method:'POST', body: { elo } })` — no username in body.

### 3.5 Error handling
Centralized in `apiFetch`: network errors surface a message string; auth failures trigger logout. Components display a simple error string, as today.

---

## 4. Testing

Add a backend integration suite (Node built-in `node:test` runner + `supertest`) against a disposable test database:
- signup creates a user + returns a valid token pair
- login succeeds with correct password, returns 401 with wrong
- a valid access token reaches `/user/elo`; missing/invalid token gets 401
- refresh rotates the token (old one stops working)
- reuse detection: replaying a rotated refresh token revokes the whole family (subsequent refresh 401s)
- `/user/elo` updates the authenticated user, ignoring any body-supplied identity

Frontend: one focused test for `apiFetch`'s refresh-and-retry path (mocked `fetch`).

---

## 5. Scope Boundaries

**Out of scope** (each a later spec):
- Password reset + email verification (needs an email provider)
- Account deletion + privacy policy (legal sub-project)
- Rate limiting on `/auth/*` (fast follow)
- Cloud hosting / HTTPS (sub-project B)
- Capacitor packaging

**Migration:** existing users keep working — login issues tokens normally. On first deploy, stale `user`-only localStorage is treated as logged-out; users log in once to obtain tokens.

---

## 6. Success Criteria

- No endpoint trusts a client-supplied identity; `/user/elo` updates only the token's user.
- Access tokens expire in 15m; clients refresh transparently without re-login.
- Logout revokes the refresh token server-side; a revoked/reused token cannot mint new access tokens.
- All integration tests pass; production build compiles.
