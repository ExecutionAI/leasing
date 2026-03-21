# Omar Leasing — Project Context & Dev Rules

## What We're Building

Two-part project for **Omar**, a car leasing professional in Mexico who serves high-profile clients:

1. **Public Webpage** — A super creative, modern, and professional landing page that explains Omar's leasing services to potential new customers.
2. **Mini CRM** — A backend system for managing Omar's *cartera de clientes* (client portfolio).

**Language:** Everything client-facing is in **Spanish**. Code and internal docs in English.

---

## About Omar & His Business

- Omar operates in Mexico offering **car leasing** services.
- His clients are high-profile individuals and companies.
- Main product: car leasing contracts and management.

---

## Part 1 — Public Webpage

A visually striking, modern landing page targeting potential leasing customers. It should:
- Communicate Omar's services clearly and professionally.
- Feel premium and trustworthy — matching the profile of high-profile clients.
- Drive leads to contact Omar directly.

### Design Direction
- Dark, premium, modern aesthetic
- NOT default Tailwind colors
- NOT generic layouts — creative and distinctive
- Think: sophisticated, precise typography, subtle motion

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Single `index.html` — Tailwind CDN + inline styles |
| Backend | None (static page only) |
| Dev server | `serve.mjs` (port 3000) |
| Screenshots | `screenshot.mjs` + Puppeteer |

### Frontend Dev Rules

#### Always Do First
- **Invoke the `frontend-design` skill** before writing any frontend code, every session, no exceptions.

#### Local Server
```bash
node serve.mjs   # serves at http://localhost:3000
```
- Never screenshot `file:///` — always use localhost
- Do at least **2 compare + fix rounds** before stopping

#### Puppeteer Paths (Windows local)
```
Chrome: C:/Users/execu/.cache/puppeteer/chrome/win64-146.0.7680.31/chrome-win64/chrome.exe
```

#### Anti-Generic Guardrails
- Never use default Tailwind palette (`indigo-500`, `blue-600`, etc.)
- Never flat `shadow-md` — use layered, color-tinted shadows
- Never same font for headings and body
- Never `transition-all` — only animate `transform` and `opacity`
- Every clickable element needs `hover`, `focus-visible`, and `active` states

---

## Part 2 — Mini CRM (Cartera de Clientes)

A backend system for Omar to manage his client portfolio. Scope TBD, but core needs:
- Client records (contact info, leasing contracts, status)
- Contract tracking (active, pending, expired)
- Basic dashboard / reporting

Tech stack for the CRM is TBD — to be defined when we start that phase.

---

## Coding Principles
- Mobile-first responsive
- Spanish for all client-facing copy
- Never `window.confirm()` — build branded modals if needed
- Keep it fast: no heavy libraries, no unnecessary dependencies
