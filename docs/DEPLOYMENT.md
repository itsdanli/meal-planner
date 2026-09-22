# Production deployment

Host: GitHub Pages at https://itsdanli.github.io/meal-planner/

The workflow `.github/workflows/deploy.yml` tests and builds `app/` on each push to main, then publishes only the generated static artifact. The existing root HTML/JSON application is included at `/meal-planner/legacy/`. Source, local environment files, and database migrations are not included in the published artifact.

The build uses the Supabase project URL and publishable key as public browser configuration. Never add a service-role key, secret API key, or database password to the workflow or a `VITE_` variable. This deployment continues using the development project's existing accounts and data; a separate staging project is a future improvement.

## Supabase Auth URL configuration

Set Site URL to `https://itsdanli.github.io/meal-planner/` and allow these exact redirect URLs:

- `https://itsdanli.github.io/meal-planner/`
- `http://127.0.0.1:5173/`
- `http://localhost:5173/`

Keep the trailing slash. The registration form derives the redirect from the current app directory. Supabase must allow that exact production URL before production confirmation emails can reliably return there.

## Verification

Check the GitHub Actions run, public HTTPS page, loaded JavaScript/CSS, sign-in form, and legacy page. Then verify a real sign-in/save/reload and a production-origin confirmation email with the owner. Local successes alone do not establish the production auth flow.

## Rollback

The original app remains directly available at `/legacy/`. For an app regression, revert the specific offending commit and push the revert to main; the same tested deployment workflow publishes the corrected build. Do not roll back database tables or delete account data as part of a frontend rollback. Failed builds do not replace the current Pages deployment.
