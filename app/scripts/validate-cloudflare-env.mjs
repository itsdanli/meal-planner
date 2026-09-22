import { loadEnv } from 'vite';

const env = { ...loadEnv('production', process.cwd(), 'VITE_'), ...process.env };
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key || !key.startsWith('sb_publishable_')) {
  throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in Cloudflare build variables or local .env.local before building. Use only the publishable key.');
}
if (new URL(url).protocol !== 'https:') throw new Error('Production Supabase URL must use HTTPS.');
console.log('Public Supabase build configuration is present.');
