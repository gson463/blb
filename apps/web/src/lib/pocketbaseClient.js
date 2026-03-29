import Pocketbase from 'pocketbase';

/**
 * Dev: defaults to `/hcgi/platform` (Vite proxies to Fly by default — see vite.config `VITE_POCKETBASE_PROXY_TARGET`).
 * Prod (Vercel): set `VITE_POCKETBASE_URL` to your PocketBase origin (e.g. https://blb-pocketbase.fly.dev), no trailing slash.
 */
const POCKETBASE_API_URL =
  import.meta.env.VITE_POCKETBASE_URL?.replace(/\/$/, '') || '/hcgi/platform';

const pocketbaseClient = new Pocketbase(POCKETBASE_API_URL);

export default pocketbaseClient;

export { pocketbaseClient };
