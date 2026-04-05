# Live URLs — BELIBELI / BLB

Use this as a quick reference for **production** endpoints. Replace with your own domains if you add custom DNS later.

---

## Web (frontend SPA)

| Purpose | URL |
|--------|-----|
| **Production (primary alias)** | https://blb-one.vercel.app |

Vercel may also show a unique URL per deployment (e.g. `https://blb-<hash>-<team>.vercel.app`). The **blb-one** hostname is the stable production alias when configured in the Vercel project.

**Hosting:** [Vercel](https://vercel.com) — static build from `dist/apps/web` (see `vercel.json`).

---

## API / backend (PocketBase)

| Purpose | URL |
|--------|-----|
| **PocketBase (REST, auth, realtime, files)** | https://blb-pocketbase.fly.dev |

- Admin UI is typically: `https://blb-pocketbase.fly.dev/_/`
- The **web app** must have `VITE_POCKETBASE_URL` set to this origin in Vercel (no trailing slash). See `apps/web/.env.example`.

**Hosting:** [Fly.io](https://fly.io) — app name `blb-pocketbase` (see `apps/pocketbase/fly.toml`).

---

## Local development

| Purpose | URL |
|--------|-----|
| Vite dev server (web) | http://localhost:3000 (default in `apps/web`) |
| PocketBase (when run locally) | http://127.0.0.1:8090 |

Dev proxy: the web app calls **`/hcgi/platform`**; Vite proxies that to PocketBase (default **Fly** URL unless `VITE_POCKETBASE_PROXY_TARGET` points to local PB). See `apps/web/vite.config.js` and `apps/web/.env.example`.

---

## Source code

| Purpose | URL |
|--------|-----|
| Git remote (example from project) | https://github.com/gson463/blb.git |

Update this row if the repository moves.

---

## Checklist after redeploy

- [ ] Vercel project env: `VITE_POCKETBASE_URL=https://blb-pocketbase.fly.dev`
- [ ] Fly: `PB_ENCRYPTION_KEY` and any Twilio/SMS secrets set if used
- [ ] PocketBase **Settings → Allowed origins** includes your Vercel URL(s) if you use the JS SDK from the browser against Fly directly (when not using only the dev proxy)

---

*If URLs change, update this file and `TECH_STACK.md` / `.env.example` as needed.*
