# Weeknight application

The replacement application lives here while the original root website remains available.

```sh
cd app
npm install
npm run dev
```

Open the local URL printed by Vite. The sample household saves only in this browser. To enable account sign-in, copy `.env.example` to `.env.local` and fill the project URL and publishable key, then restart Vite. Signed-in plans and pantry edits use the Save changes button. No grocery accounts, payments, or model calls are used.

```sh
npm test
npm run build
npm run preview
```

The production output is `app/dist`. The relative asset base supports static hosting under a subdirectory. Run `npm run deploy` to test and publish the production build to the `gh-pages` branch. See `docs/DEPLOYMENT.md` for hosting and auth redirects.

See `docs/PRD.md` and `docs/ARCHITECTURE.md` in the repository root for scope, acceptance criteria, and the next authenticated persistence milestone. Backend setup is documented separately in `docs/BACKEND.md`.
