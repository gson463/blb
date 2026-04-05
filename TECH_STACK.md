# BELIBELI / BLB — Tech stack reference

Monorepo (`npm` workspaces) for **BELIBELI Digital Manager**: a property / units / tenants / leases / invoices / payments web app backed by **PocketBase**.

---

## Architecture

| Layer | Technology |
|--------|------------|
| **Frontend** | Single-page app (SPA) in `apps/web`, built with Vite, deployed as static assets |
| **Backend / API / DB** | PocketBase (REST + realtime + auth + file storage + SQLite) in `apps/pocketbase` |
| **Integration** | Official PocketBase JS SDK; production SPA uses `VITE_POCKETBASE_URL`; local dev proxies `/hcgi/platform` to PocketBase (default Fly, overridable) |

---

## Frontend (`apps/web`)

### Core

| Tech | Role |
|------|------|
| **React** `^18.3` | UI |
| **Vite** `^7.3` | Dev server, HMR, production build |
| **React Router** `^7.13` | Client-side routing (`BrowserRouter`) |
| **JavaScript (ESM)** | `package.json` `"type": "module"`; JSX in `.jsx` |

### Styling & UI

| Tech | Role |
|------|------|
| **Tailwind CSS** `^3.4` | Utility-first CSS |
| **PostCSS** + **Autoprefixer** | CSS pipeline |
| **tailwindcss-animate** | Animation utilities |
| **class-variance-authority (cva)** | Component variants |
| **clsx** + **tailwind-merge** | Class name composition |
| **Radix UI** (`@radix-ui/react-*`) | Accessible primitives (dialogs, dropdowns, tabs, etc.) |
| **Lucide React** | Icons |
| **shadcn-style components** | `src/components/ui/*` (built on Radix + Tailwind) |

### Data & forms

| Tech | Role |
|------|------|
| **PocketBase JS SDK** `^0.25` | Auth, CRUD, subscriptions, file URLs |
| **React Hook Form** + **@hookform/resolvers** + **Zod** | Forms / validation (where used) |
| **date-fns** | Date handling |
| **react-day-picker** | Calendar UI |

### UX & content

| Tech | Role |
|------|------|
| **react-helmet** | Document title / meta |
| **sonner** | Toast notifications |
| **framer-motion** | Animation (where used) |
| **recharts** | Charts (reports) |
| **next-themes** | Theme handling (if enabled in UI) |

### PDF & exports

| Tech | Role |
|------|------|
| **jsPDF** + **jspdf-autotable** | PDF generation (invoices, leases, reports) |

### Tooling (frontend)

| Tech | Role |
|------|------|
| **ESLint** + **eslint-plugin-react** / **react-hooks** / **import** | Linting |
| **@vitejs/plugin-react** | React Fast Refresh |
| **Custom Vite plugins** | `apps/web/plugins/*` (e.g. dev-only UI helpers, PocketBase auth helper) |

### Build output

- Production bundle: `dist/apps/web/` (Vite `outDir` from repo root context in `apps/web` scripts).
- **Vercel** reads `vercel.json`: `outputDirectory` → `dist/apps/web`, SPA rewrites to `index.html`.

---

## Backend (`apps/pocketbase`)

| Tech | Role |
|------|------|
| **PocketBase** `v0.36.7` (Linux amd64 in Docker / Fly) | Embedded Go binary: API, auth, collections, SQLite, files |
| **SQLite** | Default database (under `pb_data/` locally; Fly volume at `/data`) |
| **JavaScript hooks** | `pb_hooks/*.pb.js` — `onRecord*` handlers (e.g. payment ↔ invoice sync, Twilio, lease validation) |
| **Migrations** | `pb_migrations/*.js` — schema and rule changes versioned in repo |
| **dotenv-cli** | Load `.env` for local `npm run dev` in `apps/pocketbase` |

### Local vs production

- **Local:** `pocketbase` binary + `dotenv` (see `apps/pocketbase/package.json` scripts).
- **Production (Fly):** **Alpine 3.20** Docker image; PocketBase served on `:8090`, migrations + hooks baked in; **Fly volume** for persistent `/data`.

---

## DevOps & hosting

| Service | Purpose |
|---------|---------|
| **Vercel** | Hosts the static **web** app; set `VITE_POCKETBASE_URL` to your PocketBase origin (e.g. `https://<app>.fly.dev`). |
| **Fly.io** | Runs **PocketBase** (`apps/pocketbase/fly.toml`, Dockerfile, region e.g. `iad`). |
| **GitHub Actions** | `.github/workflows/deploy-pocketbase.yml` — deploys PocketBase on push to `main` when `apps/pocketbase/**` changes (requires `FLY_API_TOKEN` secret). |

---

## Monorepo root

| Tech | Role |
|------|------|
| **concurrently** | Run web + PocketBase dev scripts together (`npm run dev` at repo root) |
| **npm workspaces** | `apps/*` |

---

## Environment variables (summary)

Documented in **`apps/web/.env.example`**:

- **`VITE_POCKETBASE_URL`** — Production / Vercel: full PocketBase URL (no trailing slash).
- **`VITE_POCKETBASE_PROXY_TARGET`** — Local Vite only: where `/hcgi/platform` is proxied (default Fly; use `http://127.0.0.1:8090` for local PocketBase).

PocketBase secrets (e.g. **`PB_ENCRYPTION_KEY`**, API keys) belong in Fly secrets / local `.env`, not in the web bundle.

---

## Notable repository paths

| Path | Contents |
|------|----------|
| `apps/web/src/` | React app (pages, components, contexts, lib) |
| `apps/web/src/lib/pocketbaseClient.js` | PocketBase client singleton |
| `apps/pocketbase/pb_migrations/` | Schema migrations |
| `apps/pocketbase/pb_hooks/` | Server-side JS hooks |
| `vercel.json` | Vercel build & SPA routing |
| `dist/apps/web/` | Web build output (gitignored) |

---

## Version pinning note

- **PocketBase server** version is pinned in **`apps/pocketbase/Dockerfile`** (`PB_VERSION=0.36.7`).
- **PocketBase JS SDK** version is in **`apps/web/package.json`** — keep compatible with server capabilities when upgrading either.

---

*Last updated from repository layout and `package.json` files; bump versions in this doc when dependencies change materially.*
