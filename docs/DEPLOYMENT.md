# Production deployment

Host: GitHub Pages at https://itsdanli.github.io/meal-planner/

Source lives on `main`; published static assets live on `gh-pages`. From `app/`, run `npm run deploy` to test, build, and push the generated artifact. GitHub Pages is configured to publish the root of `gh-pages`. A source push alone does not redeploy. The saved Git credential lacks workflow-write scope, so automatic source-triggered deployment is deferred; an optional workflow example is in `docs/examples/github-pages-workflow.yml`. The existing root HTML/JSON application is included at `/meal-planner/legacy/`. Source, local environment files, and database migrations are not included in the published artifact.

The local production build reads `app/.env.local` for the Supabase project URL and publishable key as public browser configuration. Configure these from `.env.example` before deploying from another machine. Never add a service-role key, secret API key, or database password to the workflow or a `VITE_` variable. This deployment continues using the development project's existing accounts and data; a separate staging project is a future improvement.

## Supabase Auth URL configuration

Set Site URL to `https://itsdanli.github.io/meal-planner/` and allow these exact redirect URLs:

- `https://itsdanli.github.io/meal-planner/`
- `http://127.0.0.1:5173/`
- `http://localhost:5173/`

Keep the trailing slash. The registration form derives the redirect from the current app directory. Supabase must allow that exact production URL before production confirmation emails can reliably return there.

## Verification

Check the GitHub Actions run, public HTTPS page, loaded JavaScript/CSS, sign-in form, and legacy page. Then verify a real sign-in/save/reload and a production-origin confirmation email with the owner. Local successes alone do not establish the production auth flow.

## Rollback

The original app remains directly available at `/legacy/`. For an app regression, revert the specific offending source commit, push the revert to main, then run `npm run deploy` from `app/` to publish the corrected build. Do not roll back database tables or delete account data as part of a frontend rollback. Failed tests or builds do not update the deployment branch. The deploy script uses ordinary pushes, preserving deployment history and refusing concurrent branch overwrites.

## First deployment verification

September 21, 2026: published source revision `bfa1fb19` to `gh-pages`. Verified the public HTTPS page renders the new planner, its JavaScript/CSS return HTTP 200, the sign-in form opens, and `/legacy/` returns HTTP 200. All 24 local tests and the production build passed before publishing. The owner reports saving the production Site URL and redirect allowlist in Supabase. Production account sign-in/save and a production confirmation email still require owner verification.
