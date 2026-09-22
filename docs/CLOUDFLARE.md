# Cloudflare deployment

Target: Cloudflare Workers Static Assets on the Free plan, with the existing Supabase backend. No domain purchase is required. GitHub Pages remains available until the Cloudflare site is verified.

## Dashboard / Git integration

1. In Workers & Pages, create an application connected to GitHub repository `itsdanli/meal-planner`.
2. Grant repository access only to this repository when installing the Git integration.
3. Use Worker name `weeknight-planner`, production branch `main`, and root directory `app`.
4. Build command: `npm run build:cloudflare` (includes tests and validates public configuration).
5. Deploy command: `npx wrangler deploy`.
6. Set these **build** environment variables to the existing Supabase project's public values:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
7. Deploy. The Wrangler config publishes only `app/dist`, with single-page-app fallback routing. It contains no server script, so static requests do not execute application server code.

The root `recipes.json` is intentionally imported from the parent of `app`; keep the full repository checkout available. Do not use `npm run deploy` as the Cloudflare deploy command: that is the legacy GitHub Pages script.

## CLI alternative

From `app/`, configure `.env.local` from `.env.example`, authenticate with `npx wrangler login`, then run `npm run deploy:cloudflare`. Credentials belong in Wrangler's normal login storage or CI secret settings, never committed source. A browser authorization step may be required.

## Authentication cutover

After Cloudflare provides the verified HTTPS URL, add its exact root URL, including trailing slash, to Supabase Auth redirect URLs and set it as Site URL. Preserve GitHub Pages and local redirects while validating the transition. Existing accounts and data remain in the same Supabase project; users sign in again on the new origin.

Verify the live app, sign-in, save/reload, production confirmation email redirect, and another browser. Do not mark migration complete based solely on a successful upload. After verification, decide whether GitHub Pages should remain a demo or redirect to the new app.

## Costs and rollback

Start on the Free plan; no paid resources are configured by `wrangler.jsonc`. Model calls and server-side grocery integration remain separate future work. Use Cloudflare deployment history to roll back a frontend release; leave the database unchanged. Reverting a source commit and deploying it is also supported.
