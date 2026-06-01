# Retention Surfaces (Leaderboard + Stats) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface the per-subject rating + answer history as a per-subject leaderboard and a personal stats/profile page with ELO trend sparklines.

**Architecture:** Two auth-protected read endpoints in a new `Backend/routes/insights.js` aggregate from `user_ratings` + `answers`. The frontend adds a pure-SVG `Sparkline`, a `Stats` page, and a `Leaderboard` page, wired into the navbar + router.

**Tech Stack:** Node/Express, PostgreSQL (`pg`); React (CRA); tests via `node:test` + `supertest` (backend) and Jest + `@testing-library/react` (frontend). No new dependencies.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `Backend/routes/insights.js` | Create | `GET /me/stats`, `GET /leaderboard/:subject` |
| `Backend/server.js` | Modify | Mount the insights router |
| `Backend/test/insights.test.js` | Create | Endpoint tests |
| `src/components/Sparkline.jsx` | Create | Pure SVG trend line |
| `src/components/Sparkline.test.js` | Create | Coordinate + edge-case tests |
| `src/pages/Stats.js` + `src/pages/Stats.css` | Create | Profile/stats page |
| `src/pages/Leaderboard.js` + `src/pages/Leaderboard.css` | Create | Leaderboard page |
| `src/pages/Navbar.js` | Modify | Add Leaderboard + Profile links |
| `src/Navbar.css` | Modify | Nav-link styles |
| `src/index.js` | Modify | Add `/home/stats` + `/home/leaderboard` routes |

---

## Task 1: Insights endpoints (`/me/stats`, `/leaderboard/:subject`)

**Files:**
- Create: `Backend/routes/insights.js`
- Modify: `Backend/server.js`
- Create: `Backend/test/insights.test.js`

- [ ] **Step 1: Write the failing test `Backend/test/insights.test.js`**

```js
require('./setup');
const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { resetDb, pool } = require('./setup');
const app = require('../server');

async function signup(username) {
  const res = await request(app).post('/auth/signup').send({ name: 'N', username, password: 'pw' });
  return res.body.accessToken;
}
function answer(t, body) {
  return request(app).post('/answers').set('Authorization', `Bearer ${t}`).send(body);
}

test('GET /me/stats requires a token', async () => {
  await resetDb();
  const res = await request(app).get('/me/stats');
  assert.strictEqual(res.status, 401);
});

test('GET /me/stats returns empty shape for a fresh user', async () => {
  await resetDb();
  const t = await signup('fresh');
  const res = await request(app).get('/me/stats').set('Authorization', `Bearer ${t}`);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body, { overall: { answered: 0, correct: 0, accuracy: 0 }, subjects: [] });
});

test('GET /me/stats aggregates per subject + overall, with chronological trend', async () => {
  await resetDb();
  const t = await signup('learner');
  await answer(t, { subject: 'Calculus', isCorrect: true, questionScore: 800, rating: 1010 });
  await answer(t, { subject: 'Calculus', isCorrect: false, questionScore: 820, rating: 1002 });
  await answer(t, { subject: 'Anatomy', isCorrect: true, questionScore: 700, rating: 1009 });

  const res = await request(app).get('/me/stats').set('Authorization', `Bearer ${t}`);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body.overall, { answered: 3, correct: 2, accuracy: 0.67 });

  const calc = res.body.subjects.find((s) => s.subject === 'Calculus');
  assert.strictEqual(calc.rating, 1002);
  assert.strictEqual(calc.answered, 2);
  assert.strictEqual(calc.correct, 1);
  assert.strictEqual(calc.accuracy, 0.5);
  assert.deepStrictEqual(calc.trend, [1010, 1002]); // chronological
});

test('GET /leaderboard ranks by rating, computes my rank, 400 invalid, null when unplayed', async () => {
  await resetDb();
  const a = await signup('alice');
  const b = await signup('bob');
  const c = await signup('carol');
  await answer(a, { subject: 'Calculus', isCorrect: true, questionScore: 800, rating: 1300 });
  await answer(b, { subject: 'Calculus', isCorrect: true, questionScore: 800, rating: 1100 });
  await answer(c, { subject: 'Calculus', isCorrect: true, questionScore: 800, rating: 1200 });

  const res = await request(app).get('/leaderboard/Calculus').set('Authorization', `Bearer ${b}`);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.subject, 'Calculus');
  assert.deepStrictEqual(res.body.top.map((r) => r.username), ['alice', 'carol', 'bob']);
  assert.deepStrictEqual(res.body.top.map((r) => r.rank), [1, 2, 3]);
  assert.deepStrictEqual(res.body.me, { rank: 3, rating: 1100 }); // bob is lowest

  const bio = await request(app).get('/leaderboard/Anatomy').set('Authorization', `Bearer ${b}`);
  assert.strictEqual(bio.body.me, null); // bob never played Anatomy

  const bad = await request(app).get('/leaderboard/Nope').set('Authorization', `Bearer ${b}`);
  assert.strictEqual(bad.status, 400);

  const noauth = await request(app).get('/leaderboard/Calculus');
  assert.strictEqual(noauth.status, 401);
});

test.after(() => pool.end());
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd Backend && npm test`
Expected: FAIL — the `/me/stats` and `/leaderboard` routes don't exist (404s).

- [ ] **Step 3: Implement `Backend/routes/insights.js`**

```js
const express = require('express');
const pool = require('../db');
const requireAuth = require('../middleware/requireAuth');
const VALID_SUBJECTS = require('../subjects');

const router = express.Router();
const TREND_LIMIT = 30;

const accuracy = (correct, answered) =>
  answered > 0 ? Math.round((correct / answered) * 100) / 100 : 0;

router.get('/me/stats', requireAuth, async (req, res) => {
  try {
    const overallQ = await pool.query(
      `SELECT count(*)::int AS answered,
              count(*) FILTER (WHERE is_correct)::int AS correct
         FROM answers WHERE user_id = $1`,
      [req.user.id]
    );
    const o = overallQ.rows[0];
    const overall = { answered: o.answered, correct: o.correct, accuracy: accuracy(o.correct, o.answered) };

    const subjQ = await pool.query(
      `SELECT r.subject, r.rating,
              count(a.id)::int AS answered,
              count(a.id) FILTER (WHERE a.is_correct)::int AS correct
         FROM user_ratings r
         LEFT JOIN answers a ON a.user_id = r.user_id AND a.subject = r.subject
        WHERE r.user_id = $1
        GROUP BY r.subject, r.rating
        ORDER BY r.subject`,
      [req.user.id]
    );

    const trendQ = await pool.query(
      `SELECT subject, rating_after FROM answers
        WHERE user_id = $1 ORDER BY created_at ASC, id ASC`,
      [req.user.id]
    );
    const trends = {};
    for (const row of trendQ.rows) {
      (trends[row.subject] = trends[row.subject] || []).push(row.rating_after);
    }

    const subjects = subjQ.rows.map((s) => ({
      subject: s.subject,
      rating: s.rating,
      answered: s.answered,
      correct: s.correct,
      accuracy: accuracy(s.correct, s.answered),
      trend: (trends[s.subject] || []).slice(-TREND_LIMIT),
    }));

    res.json({ overall, subjects });
  } catch (err) {
    console.error('Error building stats:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/leaderboard/:subject', requireAuth, async (req, res) => {
  const { subject } = req.params;
  if (!VALID_SUBJECTS.includes(subject)) {
    return res.status(400).json({ error: 'Invalid subject' });
  }
  try {
    const topQ = await pool.query(
      `SELECT u.username, r.rating
         FROM user_ratings r JOIN users u ON u.id = r.user_id
        WHERE r.subject = $1
        ORDER BY r.rating DESC, u.username ASC
        LIMIT 20`,
      [subject]
    );
    const top = topQ.rows.map((row, i) => ({ rank: i + 1, username: row.username, rating: row.rating }));

    const mineQ = await pool.query(
      'SELECT rating FROM user_ratings WHERE user_id = $1 AND subject = $2',
      [req.user.id, subject]
    );
    let me = null;
    if (mineQ.rows.length) {
      const myRating = mineQ.rows[0].rating;
      const higherQ = await pool.query(
        'SELECT count(*)::int AS higher FROM user_ratings WHERE subject = $1 AND rating > $2',
        [subject, myRating]
      );
      me = { rank: higherQ.rows[0].higher + 1, rating: myRating };
    }

    res.json({ subject, top, me });
  } catch (err) {
    console.error('Error building leaderboard:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
```

- [ ] **Step 4: Mount it in `Backend/server.js`**

Add the require after `const practiceRoutes = require('./routes/practice');`:
```js
const insightsRoutes = require('./routes/insights');
```
Mount it right after `app.use(practiceRoutes);`:
```js
app.use(insightsRoutes);
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd Backend && npm test`
Expected: all pass (the 5 new insights tests + existing suites).

- [ ] **Step 6: Commit**

```bash
git add Backend/routes/insights.js Backend/server.js Backend/test/insights.test.js
git commit -m "feat: /me/stats + /leaderboard/:subject read endpoints (tested)"
```

---

## Task 2: Sparkline component

**Files:**
- Create: `src/components/Sparkline.jsx`
- Create: `src/components/Sparkline.test.js`

- [ ] **Step 1: Write the failing test `src/components/Sparkline.test.js`**

```js
import { render } from '@testing-library/react';
import Sparkline from './Sparkline';

test('renders a polyline with normalized coordinates', () => {
  const { container } = render(<Sparkline points={[0, 5, 10]} width={100} height={30} />);
  const polyline = container.querySelector('polyline');
  expect(polyline).not.toBeNull();
  // min->bottom (y=height), max->top (y=0); x evenly spaced
  expect(polyline.getAttribute('points')).toBe('0,30 50,15 100,0');
});

test('empty input renders no polyline and does not throw', () => {
  const { container } = render(<Sparkline points={[]} width={100} height={30} />);
  expect(container.querySelector('polyline')).toBeNull();
});

test('single point renders a flat mid-line without throwing', () => {
  const { container } = render(<Sparkline points={[7]} width={100} height={30} />);
  const polyline = container.querySelector('polyline');
  expect(polyline).not.toBeNull();
  expect(polyline.getAttribute('points')).toBe('50,15');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `CI=true npx react-scripts test src/components/Sparkline.test.js --watchAll=false`
Expected: FAIL — `Cannot find module './Sparkline'`.

- [ ] **Step 3: Implement `src/components/Sparkline.jsx`**

```jsx
import React from 'react';

// A small, dependency-free trend line. Pure function of its props.
const Sparkline = ({ points = [], width = 120, height = 32, className }) => {
  if (!points || points.length === 0) {
    return <svg className={className} width={width} height={height} aria-hidden="true" />;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const n = points.length;

  const coords = points.map((v, i) => {
    const x = n === 1 ? width / 2 : (i / (n - 1)) * width;
    const y = max === min ? height / 2 : height - ((v - min) / (max - min)) * height;
    return `${+x.toFixed(2)},${+y.toFixed(2)}`;
  });

  const line = coords.join(' ');
  const lastX = n === 1 ? width / 2 : width;
  const area = `0,${height} ${line} ${lastX},${height}`;

  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polygon points={area} fill="var(--accent-dim)" stroke="none" />
      <polyline points={line} fill="none" stroke="var(--accent)" strokeWidth="2" />
    </svg>
  );
};

export default Sparkline;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `CI=true npx react-scripts test src/components/Sparkline.test.js --watchAll=false`
Expected: PASS (3/3).

- [ ] **Step 5: Commit**

```bash
git add src/components/Sparkline.jsx src/components/Sparkline.test.js
git commit -m "feat: pure-SVG Sparkline component (tested)"
```

---

## Task 3: Stats (profile) page

**Files:**
- Create: `src/pages/Stats.js`
- Create: `src/pages/Stats.css`

- [ ] **Step 1: Create `src/pages/Stats.js`**

```jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import Sparkline from '../components/Sparkline';
import './Stats.css';

const pct = (a) => `${Math.round(a * 100)}%`;

const Stats = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/me/stats');
        if (!res.ok) throw new Error('failed');
        setData(await res.json());
      } catch (e) {
        setError('Could not load your stats.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="stats"><p className="stats-status">Loading…</p></div>;
  if (error) return <div className="stats"><p className="stats-status">{error}</p></div>;

  const { overall, subjects } = data;

  return (
    <div className="stats">
      <div className="stats-header">
        <h1>Your progress</h1>
        {overall.answered > 0 ? (
          <p>{overall.answered} questions answered · {pct(overall.accuracy)} accuracy</p>
        ) : (
          <p>No questions answered yet.</p>
        )}
      </div>

      {subjects.length === 0 ? (
        <div className="stats-empty">
          <p>Answer some questions to see your progress.</p>
          <Link to="/home" className="btn btn-primary">Start practicing</Link>
        </div>
      ) : (
        <div className="stats-grid">
          {subjects.map((s) => (
            <div key={s.subject} className="stat-card">
              <div className="stat-card-head">
                <h5>{s.subject}</h5>
                <span className="stat-rating">{s.rating}</span>
              </div>
              <Sparkline points={s.trend} width={260} height={48} className="stat-spark" />
              <div className="stat-meta">
                <span>{pct(s.accuracy)} accuracy</span>
                <span>{s.answered} answered</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Stats;
```

- [ ] **Step 2: Create `src/pages/Stats.css`**

```css
.stats {
  max-width: 1000px;
  margin: 0 auto;
  padding: var(--space-12) var(--space-6) var(--space-16);
}

.stats-status {
  text-align: center;
  color: var(--text-muted);
  padding: var(--space-16) 0;
}

.stats-header {
  text-align: center;
  margin-bottom: var(--space-12);
}

.stats-header h1 {
  font-size: 40px;
  letter-spacing: -0.02em;
}

.stats-header p {
  color: var(--text-muted);
  margin-top: var(--space-3);
}

.stats-empty {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  color: var(--text-muted);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-4);
}

.stat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-6);
}

.stat-card-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}

.stat-card-head h5 {
  font-family: var(--font-display);
  font-size: 17px;
}

.stat-rating {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 700;
  color: var(--accent);
}

.stat-spark {
  display: block;
  width: 100%;
}

.stat-meta {
  display: flex;
  justify-content: space-between;
  margin-top: var(--space-3);
  font-size: 13px;
  color: var(--text-muted);
}

@media (max-width: 720px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 3: Verify the build compiles**

Run: `CI=true npx react-scripts build 2>&1 | grep -E "Compiled|Failed|Module not found"`
Expected: `Compiled successfully.` (the page isn't routed yet — that's Task 5; this just confirms it compiles.)

- [ ] **Step 4: Commit**

```bash
git add src/pages/Stats.js src/pages/Stats.css
git commit -m "feat: stats/profile page with per-subject cards + sparklines"
```

---

## Task 4: Leaderboard page

**Files:**
- Create: `src/pages/Leaderboard.js`
- Create: `src/pages/Leaderboard.css`

- [ ] **Step 1: Create `src/pages/Leaderboard.js`**

```jsx
import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import './Leaderboard.css';

const SUBJECT_GROUPS = [
  { label: 'Mathematics', subjects: ['Calculus', 'DiscreteMath', 'LinearAlgebra', 'Statistics'] },
  { label: 'Biology', subjects: ['Anatomy', 'Microbiology', 'MolecularBiology', 'Physiology'] },
  { label: 'Chemistry', subjects: ['AnalyticalChemistry', 'Biochemistry', 'InorganicChemistry', 'OrganicChemistry'] },
  { label: 'Physics', subjects: ['Astrophysics', 'Electromagnetics', 'QuantumMechanics', 'Thermodynamics'] },
];

const myUsername = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}').username;
  } catch {
    return undefined;
  }
};

const Leaderboard = () => {
  const [subject, setSubject] = useState('Calculus');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const me = myUsername();

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const res = await apiFetch(`/leaderboard/${subject}`);
        if (!res.ok) throw new Error('failed');
        const json = await res.json();
        if (active) { setData(json); setError(''); }
      } catch (e) {
        if (active) setError('Could not load the leaderboard.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [subject]);

  const meInTop = data && data.top.some((r) => r.username === me);

  return (
    <div className="leaderboard">
      <div className="leaderboard-header">
        <h1>Leaderboard</h1>
        <select className="subject-select" value={subject} onChange={(e) => setSubject(e.target.value)}>
          {SUBJECT_GROUPS.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.subjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </optgroup>
          ))}
        </select>
      </div>

      {loading && <p className="lb-status">Loading…</p>}
      {error && <p className="lb-status">{error}</p>}

      {data && !loading && !error && (
        <>
          {data.top.length === 0 ? (
            <p className="lb-status">No one has played this subject yet.</p>
          ) : (
            <ol className="lb-list">
              {data.top.map((row) => (
                <li key={row.rank} className={`lb-row ${row.username === me ? 'is-me' : ''}`}>
                  <span className="lb-rank">#{row.rank}</span>
                  <span className="lb-name">{row.username}</span>
                  <span className="lb-rating">{row.rating}</span>
                </li>
              ))}
            </ol>
          )}
          {data.me && !meInTop && (
            <div className="lb-me">Your rank — #{data.me.rank} · {data.me.rating}</div>
          )}
          {!data.me && (
            <div className="lb-me">Play this subject to get ranked.</div>
          )}
        </>
      )}
    </div>
  );
};

export default Leaderboard;
```

- [ ] **Step 2: Create `src/pages/Leaderboard.css`**

```css
.leaderboard {
  max-width: 640px;
  margin: 0 auto;
  padding: var(--space-12) var(--space-6) var(--space-16);
}

.leaderboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-8);
  flex-wrap: wrap;
}

.leaderboard-header h1 {
  font-size: 40px;
  letter-spacing: -0.02em;
}

.subject-select {
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
}

.subject-select:focus {
  outline: none;
  border-color: var(--accent);
}

.lb-status {
  text-align: center;
  color: var(--text-muted);
  padding: var(--space-12) 0;
}

.lb-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.lb-row {
  display: grid;
  grid-template-columns: 56px 1fr auto;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.lb-row.is-me {
  border-color: var(--accent);
  background: var(--accent-dim);
}

.lb-rank {
  font-family: var(--font-display);
  font-weight: 600;
  color: var(--text-muted);
}

.lb-name {
  font-weight: 500;
}

.lb-rating {
  font-family: var(--font-display);
  font-weight: 700;
  color: var(--accent);
}

.lb-me {
  margin-top: var(--space-4);
  padding: var(--space-3) var(--space-4);
  text-align: center;
  border: 1px dashed var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-size: 14px;
}
```

- [ ] **Step 3: Verify the build compiles**

Run: `CI=true npx react-scripts build 2>&1 | grep -E "Compiled|Failed|Module not found"`
Expected: `Compiled successfully.`

- [ ] **Step 4: Commit**

```bash
git add src/pages/Leaderboard.js src/pages/Leaderboard.css
git commit -m "feat: per-subject leaderboard page"
```

---

## Task 5: Navbar links + routes

**Files:**
- Modify: `src/pages/Navbar.js`
- Modify: `src/Navbar.css`
- Modify: `src/index.js`

- [ ] **Step 1: Add nav links in `src/pages/Navbar.js`**

Replace the `<nav className="navbar"> ... </nav>` block's contents so a center link group sits between the brand and the right-side group:
```jsx
      <nav className="navbar">
        <NavLink className="navbar-brand" to="/home">
          Bold<span className="brand-dot">.</span>
        </NavLink>

        <div className="navbar-links">
          <NavLink className="navbar-link" to="/home/leaderboard">Leaderboard</NavLink>
          <NavLink className="navbar-link" to="/home/stats">Profile</NavLink>
        </div>

        <div className="navbar-right">
          {user && user.username && (
            <span className="navbar-user">{user.username}</span>
          )}
          <button className="navbar-logout" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </nav>
```

- [ ] **Step 2: Add nav-link styles to `src/Navbar.css`**

Append:
```css
.navbar-links {
  display: flex;
  gap: var(--space-4);
  margin-right: auto;
  margin-left: var(--space-8);
}

.navbar-link {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-muted);
  transition: color var(--dur) var(--ease);
}

.navbar-link:hover {
  color: var(--text);
}

.navbar-link.active {
  color: var(--accent);
}

@media (max-width: 600px) {
  .navbar-links {
    margin-left: var(--space-4);
    gap: var(--space-3);
  }
}
```

(`NavLink` adds the `active` class automatically on the matched route.)

- [ ] **Step 3: Add the routes in `src/index.js`**

Add the imports near the other page imports:
```js
import Stats from './pages/Stats';
import Leaderboard from './pages/Leaderboard';
```
Inside the `<Route element={<Navbar />}>` block, alongside `/home/quiz` and `/home/no-questions`, add:
```jsx
                <Route path="/home/leaderboard" element={<Leaderboard />} />
                <Route path="/home/stats" element={<Stats />} />
```

- [ ] **Step 4: Verify the build compiles**

Run: `CI=true npx react-scripts build 2>&1 | grep -E "Compiled|Failed|Module not found"`
Expected: `Compiled successfully.`

- [ ] **Step 5: Commit**

```bash
git add src/pages/Navbar.js src/Navbar.css src/index.js
git commit -m "feat: navbar links + routes for leaderboard and profile"
```

---

## Task 6: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full backend suite**

Run: `cd Backend && npm test`
Expected: all pass (insights + practice + auth + tokens + requireAuth).

- [ ] **Step 2: Frontend tests**

Run: `CI=true npx react-scripts test --watchAll=false`
Expected: `Sparkline`, `client`, and `Navbar` suites pass.

- [ ] **Step 3: Production build**

Run: `CI=true npx react-scripts build 2>&1 | grep -E "Compiled|Failed"`
Expected: `Compiled successfully.`

- [ ] **Step 4: Live end-to-end smoke test**

```bash
cd Backend
PORT=4057 node server.js > /tmp/surfaces-smoke.log 2>&1 &
SRV=$!
sleep 2
B=http://localhost:4057
mk() { curl -s -X POST $B/auth/signup -H 'Content-Type: application/json' -d "{\"name\":\"N\",\"username\":\"$1\",\"password\":\"pw\"}" | python3 -c "import sys,json;print(json.load(sys.stdin)['accessToken'])"; }
ans() { curl -s -o /dev/null -X POST $B/answers -H "Authorization: Bearer $1" -H 'Content-Type: application/json' -d "$2"; }
A=$(mk "lb_a_$RANDOM"); BTOK=$(mk "lb_b_$RANDOM")
ans "$A" '{"subject":"Calculus","isCorrect":true,"questionScore":800,"rating":1300}'
ans "$BTOK" '{"subject":"Calculus","isCorrect":false,"questionScore":800,"rating":1100}'
echo "stats (B): "; curl -s $B/me/stats -H "Authorization: Bearer $BTOK"
echo; echo "leaderboard Calculus (as B, expect B rank 2): "; curl -s $B/leaderboard/Calculus -H "Authorization: Bearer $BTOK"
echo; kill $SRV 2>/dev/null
psql -d adaptive_learning -c "DELETE FROM users WHERE username LIKE 'lb_%';" >/dev/null 2>&1
echo "=== cleaned up ==="
```
Expected: B's stats show Calculus rating 1100, answered 1, accuracy 0; leaderboard lists alice-equivalent first, B with `me.rank` 2.

- [ ] **Step 5: Push**

```bash
git push personal master
```

---

## Notes for the implementer

- **No new dependencies** — the sparkline is hand-built SVG; charts use no library.
- **Identity:** `/me/stats` and the `me` field in `/leaderboard` come from `req.user.id`; `top` exposes only `username` + `rating`.
- **Accuracy** is a 0–1 float rounded to 2 decimals server-side; the pages render it as a percentage.
- **Test DB** already has `user_ratings` + `answers` (from the foundation work); no schema changes here.
