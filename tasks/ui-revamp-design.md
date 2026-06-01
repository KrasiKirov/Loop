# Bold. — UI Revamp Design Spec

**Date:** 2026-06-01
**Goal:** Completely revamp and polish the UI into a dark, academic-premium design system that reads as crafted, not AI-generated. Restyle every page, fix key UX gaps, and refactor legacy naming — without adding new features.

---

## 1. Direction

- **Vibe:** Academic premium — dark base, sharp typography, high contrast, restrained accents. Matches the "Bold." competitive identity.
- **Accent:** Cyan / electric blue on near-black.
- **Depth:** Visual restyle + key UX fixes. No new features (no leaderboard, profile, or badges).
- **Architecture:** Design tokens in plain CSS custom properties. No new dependencies. Consolidate duplicated stylesheets.

---

## 2. Design Tokens (`src/theme.css`)

Defined as CSS custom properties on `:root`, imported once globally.

### Color

| Token | Value | Use |
|-------|-------|-----|
| `--bg` | `#0B0E14` | App background |
| `--surface` | `#141925` | Cards, navbar, form panels |
| `--surface-raised` | `#1C2333` | Hover/elevated surfaces |
| `--border` | `#252C3D` | 1px hairline borders |
| `--text` | `#E6EAF2` | Primary text (off-white) |
| `--text-muted` | `#8A93A6` | Secondary text, labels |
| `--accent` | `#22D3EE` | Links, ELO meter, selected, primary buttons |
| `--accent-hover` | `#67E8F9` | Accent hover |
| `--accent-dim` | `rgba(34,211,238,0.12)` | Accent backgrounds/glows |
| `--success` | `#3DD68C` | Correct answer |
| `--danger` | `#F76B6B` | Wrong answer, error messages |

**Subject signature colors** (icon/accent only — do not break the unified dark theme):
- `--math: #22D3EE` (cyan)
- `--physics: #8B7CF6` (violet)
- `--chemistry: #F5B544` (amber)
- `--biology: #3DD68C` (green)

### Typography

- Display/headings: **Space Grotesk** (Google Fonts)
- Body/UI: **Inter** (Google Fonts)
- Loaded via `<link>` in `public/index.html`.
- Scale (px): `13 / 14 / 16 / 20 / 28 / 40 / 64`
- Headings: tight line-height (~1.1), Space Grotesk, weight 500–700.
- Body: line-height ~1.6, Inter, weight 400–500.

### Spacing & Shape

- Base grid: 4px → `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64`
- Radii: `--radius-sm: 8px` (inputs/buttons), `--radius-md: 12px` (cards), `--radius-lg: 16px` (modals)
- Shadows: soft and dark only. `--shadow-card: 0 4px 24px rgba(0,0,0,0.4)`. **No neumorphic light-shadow effects** (a key "AI default" tell — removed everywhere).

### Motion

- Easing: `--ease: cubic-bezier(0.4, 0, 0.2, 1)`
- Duration: 150–200ms
- Applied to: hover lifts, accent focus rings, answer-select transitions, question transitions. Nothing bouncy.

---

## 3. Page-by-Page Design

### Landing — `src/pages/Main.js`
- Full-height hero on `--bg`.
- `Bold.` wordmark in Space Grotesk 64px+, the period in `--accent`.
- Tagline "Test yourself. Compete." in `--text-muted`.
- Primary filled-cyan button "Get started" → `/signup`; ghost (bordered) "Log in" → `/login`.
- Faint radial glow / grid behind the wordmark for depth.

### Login / Signup — `src/pages/LoginForm.js`, `src/pages/SignupForm.js`
- Centered card on `--surface`, hairline border, `--shadow-card`. **Neumorphic inset look removed.**
- Cleanly-labelled inputs with cyan focus rings.
- Full-width primary button.
- Errors in `--danger` with icon; success in `--success`.
- Small "Bold." mark atop the card.
- Both forms share one stylesheet (`src/pages/auth.css`).

### Home — `src/pages/Home.js`
- "Choose your arena" heading + one-line ELO/welcome strip.
- Responsive grid of 4 subject cards on `--surface`. Each: signature-colored icon, subject name (Space Grotesk), short description.
- Hover: card raises + border brightens in the subject color.

### Subject topic pages — the 16 components (Calculus, DiscreteMath, ... Thermodynamics)
- Consolidated to one shared layout/stylesheet (`src/subject.css`).
- Breadcrumb (e.g. Home / Math / Calculus).
- Heading + description.
- Three difficulty cards (Easy / Medium / Hard) shown as a ladder: 1/2/3 filled accent pips (not generic stars), each with a one-word descriptor.
- Whole card is the click target with proper cursor, `role="button"`, `tabIndex`, and keyboard focus.

### Quiz screen — `src/pages/Quiz.js` (renamed from `Question2.js`)
Most-used screen, highest polish:
- Top bar: subject chip + real **ELO meter** (number + thin accent progress bar) + current question level.
- Question text large, Space Grotesk, centered, generous spacing.
- Four answer options as full-width cards: rest / hover / **selected** (accent border + `--accent-dim` bg). After submit: correct → `--success`, wrong → `--danger`; feedback text in a panel below.
- Submit button disabled until an answer is selected; **re-enables for the next question** (fixes current stuck-disabled bug).
- Harder / Easier / Similar as a secondary segmented control (not three loud buttons).
- Smooth transition between questions.

### Empty state — `src/pages/no-questions.js`
- Centered empty state: icon, corrected message, styled "Back to subjects" button (not a bare link).
- Quiz screen routes here instead of rendering plain "No questions available" text.

### Navbar (global) — `src/pages/Navbar.js`
- Slim bar on `--surface`, hairline bottom border.
- Left: `Bold.` wordmark → `/home`.
- Right: ELO badge + username + **Log out** button (clears user + localStorage; currently missing).
- Active-link state in `--accent`.

---

## 4. Refactor: rename `Question2`

- `src/pages/Question2.js` → `src/pages/Quiz.js` (component renamed `Question2` → `Quiz`).
- `src/Question2.css` → `src/pages/Quiz.css` (co-located with the component).
- Route `/home/question2` → `/home/quiz`.
- Update import + route in `src/index.js`.
- Update navigation target (`navigate('/home/question2')` / `<Link to="/home/question2">`) in all 16 subject components **and** `Calculus.js`.

---

## 5. UX & Code Fixes (folded into the restyle)

1. **Submit stuck disabled** — reset `answerSubmitted` when a new question loads.
2. **No logout** — add Log out to navbar; clears user context + localStorage.
3. **Plain-text empty state** — Quiz routes to the styled no-questions page when no questions match.
4. **Bare clickable divs** — difficulty/subject cards get `role="button"`, `tabIndex={0}`, cursor, and keyboard handlers.
5. **`class` → `className`** — fix leftovers (Calculus and any others); silences React warnings.
6. **Inline `style` props** — move `style={{cursor:'pointer'}}` etc. into CSS.
7. **CSS consolidation** — 14 stylesheets (4 identical copies) collapse into: `theme.css` (tokens), `subject.css` (shared subject pages), `auth.css` (login+signup), plus per-page files. Remove dead `Question.css`.
8. **Google Fonts** — add Space Grotesk + Inter via `public/index.html`.

---

## 6. Scope Guardrail

In scope: restyle all pages, the 8 fixes above, the `Question2` → `Quiz` rename.
Out of scope: any new feature surface (leaderboard, profile/stats, achievements), backend changes, new dependencies.

---

## 7. Stylesheet Inventory (after revamp)

| File | Responsibility |
|------|----------------|
| `src/theme.css` | Design tokens (`:root` custom properties), global reset, base element styles |
| `src/pages/auth.css` | Login + Signup (shared) |
| `src/subject.css` | All 16 subject topic pages (shared) + 4 subject hub pages |
| `src/pages/Quiz.css` | Quiz screen (renamed from Question2.css) |
| `src/Home.css` | Home subject grid |
| `src/Main.css` | Landing hero |
| `src/Navbar.css` | Navbar |
| `src/pages/NoQuestions.css` | Empty state |
| _removed_ | `Question.css`, `Biology.css`, `Chemistry.css`, `Math.css`, `Physics.css`, `SignupForm.css` (folded into shared files) |
