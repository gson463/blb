import Pocketbase from 'pocketbase';

/** Dev: Vite proxy uses /hcgi/platform. Prod (e.g. Vercel): set VITE_POCKETBASE_URL to your hosted PocketBase origin (no trailing slash). */
const POCKETBASE_API_URL =
  import.meta.env.VITE_POCKETBASE_URL?.replace(/\/$/, '') || '/hcgi/platform';

const pocketbaseClient = new Pocketbase(POCKETBASE_API_URL);

export default pocketbaseClient;

export { pocketbaseClient };
