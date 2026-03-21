# Technical Architecture Reference
## Reusable Blueprint for Claude Code + Boutique Web Projects

> **Purpose:** Reference doc to bootstrap similar projects — copy the relevant sections into a new `CLAUDE.md` or use as onboarding context for Claude.

---

## 1. Claude Code — Available Skills

Claude Code ships with built-in **skills** (slash commands). These are invoked with the `Skill` tool internally, or via `/skill-name` in the chat.

### `frontend-design`
**Trigger:** Before writing ANY frontend code — every session, no exceptions.

Produces production-grade, distinctive UI code. Avoids generic AI aesthetics.
- Generates creative, polished HTML/CSS/JS
- Enforces brand color usage, layered shadows, proper hover/focus/active states
- Uses Tailwind CDN + inline styles by default

**Rule to add in CLAUDE.md:**
```
### Always Do First
- Invoke the `frontend-design` skill before writing any frontend code, every session, no exceptions.
```

### `simplify`
Reviews changed code for reuse, quality, and efficiency, then fixes issues found. Run after completing a feature.

### `commit`
Handles git commits following the repo's message style. Run after completing work if the user asks to commit.

### `claude-api`
Triggered when code imports `anthropic` / `@anthropic-ai/sdk`. Provides correct patterns for Claude API usage, tool use, streaming, and the Agent SDK.

### `loop`
Sets up a recurring task (e.g., `/loop 5m /some-command`). Used for polling, monitoring, or periodic automation.

### `keybindings-help`
Customizes keyboard shortcuts in `~/.claude/keybindings.json`.

---

## 2. Tech Stack — Proven Pattern

| Layer | Technology | Notes |
|-------|-----------|-------|
| Backend | Node.js + Express (ESM `.mjs`) | Single `api.mjs` file, extend don't replace |
| Database | Supabase (PostgreSQL + Storage) | UUID PKs, `email` as dedup key for clients |
| PDF generation | Puppeteer + HTML template | `pdf-template.mjs` exports builder functions |
| AI (internal) | Claude API (`claude-sonnet-4-6`) | Route advisor, content generation |
| AI (public) | OpenAI GPT-4o | Existing chatbot features — keep separate |
| Email | Resend | Transactional emails |
| Lead log | Google Sheets API | Lightweight CRM fallback |
| Automations | n8n (self-hosted VPS) | File sync, Drive upload, notifications |
| Admin dashboard | `admin/index.html` (SPA inline) | Single file, all logic inline |
| Dev server | `serve.mjs` (port 3000) | Express static server for local dev |
| Screenshots | `screenshot.mjs` + Puppeteer v24 | Visual review loop |

---

## 3. Project Structure Pattern

```
project-root/
  CLAUDE.md              ← project context + dev rules (required)
  docs/                  ← planning docs, system plan, specs
  admin/
    index.html           ← admin dashboard SPA (all logic inline)
    itinerary.html       ← sub-pages if needed
  brand_assets/          ← logos, SVGs (always check before designing)
  briefs/                ← technical briefs, architecture docs
  api.mjs                ← Express API (single file, ESM)
  pdf-template.mjs       ← Puppeteer HTML template builders
  serve.mjs              ← local dev server
  screenshot.mjs         ← Puppeteer screenshot tool
  index.html             ← public website
```

---

## 4. Frontend Dev Workflow

### Local Server
```bash
node serve.mjs           # serves project root at http://localhost:3000
```
- Never screenshot `file:///` URLs — always use localhost
- If already running, do not start a second instance

### Screenshot Workflow
```bash
# Step 1 — start server (background)
node serve.mjs

# Step 2 — take screenshot
node screenshot.mjs http://localhost:3000
node screenshot.mjs http://localhost:3000 hero           # with label
node screenshot.mjs http://localhost:3000 mobile --width=390 --height=844
node screenshot.mjs http://localhost:3000 full --full    # full-page

# Step 3 — read PNG with Read tool and review
# Screenshots saved to: ./temporary screenshots/screenshot-N[-label].png
```

**Rule:** Do at least **2 compare → fix rounds** before stopping.

### Puppeteer Paths (Windows local)
```
Puppeteer:  C:/Users/execu/AppData/Local/Temp/puppeteer-test/
Chrome:     C:/Users/execu/.cache/puppeteer/chrome/win64-146.0.7680.31/chrome-win64/chrome.exe
```

### Anti-Generic Guardrails
- Never use default Tailwind palette (`indigo-500`, `blue-600`, etc.) — use brand colors
- Never flat `shadow-md` — use layered, color-tinted shadows with low opacity
- Never same font for headings and body
- Never `transition-all` — only animate `transform` and `opacity`
- Every clickable element needs `hover`, `focus-visible`, and `active` states
- Images: gradient overlay + `mix-blend-multiply` color treatment
- Surfaces: base → elevated → floating layering system

### Output Defaults
```html
<!-- Tailwind CDN -->
<script src="https://cdn.tailwindcss.com"></script>

<!-- Placeholder images -->
<img src="https://placehold.co/800x400">
```
- Single HTML file, all styles inline
- Mobile-first responsive

---

## 5. Backend Pattern (`api.mjs`)

### Structure
```javascript
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Auth middleware
const requireAdmin = (req, res, next) => {
  const token = req.headers['x-admin-token'];
  if (token !== process.env.ADMIN_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

// Routes under /api/admin/
app.get('/api/admin/stats', requireAdmin, async (req, res) => { ... });

app.listen(process.env.PORT || 3000);
```

### Required Environment Variables
```
SUPABASE_URL
SUPABASE_SERVICE_KEY
ADMIN_TOKEN
OPENAI_API_KEY
RESEND_API_KEY
FROM_EMAIL
PAOLA_EMAIL
GOOGLE_SHEET_ID
GOOGLE_CLIENT_EMAIL
GOOGLE_PRIVATE_KEY
```

### API Endpoint Convention
| Method | Pattern | Use |
|--------|---------|-----|
| GET | `/api/admin/resource` | List all |
| GET | `/api/admin/resource/:id` | Get one |
| POST | `/api/admin/resource` | Create |
| PATCH | `/api/admin/resource/:id` | Partial update |
| DELETE | `/api/admin/resource/:id` | Delete |
| POST | `/api/admin/resource/:id/action` | Trigger action (generate, send, etc.) |

---

## 6. Supabase Patterns

### Client Init
```javascript
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
```

### Core Table Pattern
```sql
-- clients: dedup by email
CREATE TABLE clients (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text UNIQUE NOT NULL,
  full_name  text,
  phone      text,
  source     text CHECK (source IN ('form', 'whatsapp', 'referral', 'other')),
  created_at timestamptz DEFAULT now()
);

-- requests: main entity, status drives the entire pipeline
CREATE TABLE trip_requests (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  uuid REFERENCES clients(id),
  status     text CHECK (status IN ('new', 'in_progress', 'proposal_sent', 'approved', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Status Pipeline Pattern
Define valid transitions — never allow arbitrary status jumps:
```javascript
const VALID_TRANSITIONS = {
  new:           ['in_progress', 'cancelled'],
  in_progress:   ['proposal_sent', 'cancelled'],
  proposal_sent: ['approved', 'cancelled'],
  approved:      ['completed', 'cancelled'],
  cancelled:     ['in_progress'],  // recovery path
  completed:     [],
};
```

### Upsert by Email (client dedup)
```javascript
const { data } = await supabase
  .from('clients')
  .upsert({ email, full_name, phone }, { onConflict: 'email' })
  .select()
  .single();
```

### JSONB for AI-generated structured data
Use `jsonb` columns for AI output (route options, day details, quotes). Avoids premature normalization.

---

## 7. PDF Generation (Puppeteer)

### Pattern
```javascript
// pdf-template.mjs — export HTML builder functions
export function buildPdfHtml(data) {
  return `<!DOCTYPE html><html>...${data.content}...</html>`;
}

// api.mjs — render to PDF
import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.RENDER
    ? await chromium.executablePath()
    : 'C:/Users/execu/.cache/puppeteer/chrome/win64-146.0.7680.31/chrome-win64/chrome.exe',
  args: process.env.RENDER ? chromium.args : ['--no-sandbox', '--disable-setuid-sandbox'],
});
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'networkidle0' });
const pdfBuffer = await page.pdf({ format: 'A4' });

// CRITICAL: convert Uint8Array to Buffer before sending
res.set('Content-Type', 'application/pdf');
res.send(Buffer.from(pdfBuffer));
```

### CSS for Multi-Page PDFs
```css
/* Cover page: full-bleed, no margin */
@page :first { size: A4; margin: 0; }

/* Content pages: top margin prevents overlap with fixed headers */
@page { size: A4; margin: 40px 0 20px; }

/* Page breaks: use inline style, NOT separate div */
/* BAD:  <div style="min-height:297mm"></div><div class="page-break"></div> */
/* GOOD: <div style="page-break-before: always"> */
```

---

## 8. AI Integration Patterns

### Claude API (internal tools)
```javascript
import Anthropic from '@anthropic-ai/sdk';
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 4096,
  messages: [{ role: 'user', content: prompt }],
});
const result = JSON.parse(response.content[0].text);
```

### OpenAI (public-facing / existing features)
```javascript
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: prompt }],
  response_format: { type: 'json_object' },
});
```

### Force JSON output from AI
Always include in prompt:
```
Respond ONLY with valid JSON. No markdown, no explanation, no code fences.
```

---

## 9. Admin Dashboard SPA Pattern

Single `admin/index.html` file — all HTML, CSS, and JS inline. No build step.

### Auth Pattern (simple token)
```javascript
const token = localStorage.getItem('adminToken');  // Use localStorage, NOT sessionStorage
// sessionStorage is NOT shared between tabs — breaks multi-tab workflows

async function apiCall(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'x-admin-token': token, 'Content-Type': 'application/json', ...options.headers },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
```

### Progressive Disclosure Pattern
Adapt the UI based on the entity's current status:
```javascript
function updateViewByStatus(status) {
  const isEarly   = ['new', 'in_progress'].includes(status);
  const isSent    = status === 'proposal_sent';
  const isLate    = ['approved', 'completed'].includes(status);

  document.getElementById('early-stage-section').style.display  = isEarly ? '' : 'none';
  document.getElementById('proposal-mini-card').style.display   = isSent  ? '' : 'none';
  document.getElementById('final-work-section').style.display   = isLate  ? '' : 'none';
}
```

### Confirm Modal (branded, not `window.confirm`)
Never use `window.confirm()` for destructive actions. Build a modal:
```javascript
function confirmDelete(id, name) {
  document.getElementById('confirm-modal-name').textContent = name;
  document.getElementById('confirm-modal').style.display = 'flex';
  window._pendingDeleteId = id;
}
function executeDelete() {
  const id = window._pendingDeleteId;
  apiCall(`/requests/${id}`, { method: 'DELETE' }).then(() => {
    closeModal();
    refreshTable();
  });
}
```

### Escaping HTML in onclick attributes
```javascript
// BAD — breaks if name contains quotes
`<button onclick="doThing('${name}')">Delete</button>`

// GOOD — use data attributes
`<button data-id="${id}" data-name="${esc(name)}" onclick="handleDelete(this)">Delete</button>`
function handleDelete(el) { confirmDelete(el.dataset.id, el.dataset.name); }
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;'); }
```

---

## 10. Infrastructure

### Deployment
| Service | Purpose |
|---------|---------|
| **Render** | Node.js API (`api.mjs`) — auto-deploys on push to `main` |
| **Namecheap** | Static files (`*.html`, `admin/`) |
| **GitHub** | Source of truth — `main` branch |
| **Supabase** | DB + Storage — managed cloud |

### Git Rules
- **Never push automatically** — only when explicitly told "push" or "publish"
- Always create new commits rather than amending
- Never `--no-verify` unless explicitly asked

### Render Environment
When deploying Puppeteer on Render, add `@sparticuz/chromium`:
```javascript
import chromium from '@sparticuz/chromium';

const isRender = !!process.env.RENDER;
const browser = await puppeteer.launch({
  executablePath: isRender ? await chromium.executablePath() : LOCAL_CHROME_PATH,
  args: isRender ? chromium.args : ['--no-sandbox', '--disable-setuid-sandbox'],
  headless: isRender ? chromium.headless : true,
});
```

---

## 11. Coding Principles

- **Practical over perfect** — small teams, avoid over-engineering
- **No `window.confirm()`** — always build branded modals for destructive actions
- **Spanish** for client-facing copy; **English** for code and internal docs
- **localStorage over sessionStorage** for anything shared across tabs
- **Single HTML files** for admin UIs — no build tooling, no frameworks
- **Inline forms** (no `prompt()`) — keyboard: Enter = confirm, Escape = cancel
- **AI output → always parse as JSON** — prompt explicitly for JSON-only responses
- **Two-step Supabase FK lookups** when joins with nested relations are unreliable
- **PDF: `Buffer.from(pdfBuffer)`** — Puppeteer v24 returns `Uint8Array`, must wrap before `res.send()`

---

## 12. Quick-Start Checklist for a New Similar Project

- [ ] Copy `serve.mjs` and `screenshot.mjs` to new project root
- [ ] Create `CLAUDE.md` with: tech stack, brand colors, fonts, frontend-design skill rule
- [ ] Set up Supabase project → create `clients` + main entity table with `status` column
- [ ] Bootstrap `api.mjs` with: Express, Supabase client, `requireAdmin` middleware, CORS
- [ ] Create `admin/index.html` SPA with: auth check, token in `localStorage`, `apiCall()` helper
- [ ] Add all required env vars to Render dashboard
- [ ] Set GitHub remote → connect to Render auto-deploy
- [ ] Run `node serve.mjs` + take first screenshot to verify setup
