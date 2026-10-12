# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## Traceability admin

Tipo staff manage batches, timeline cards and serial numbers at `/admin`
(the "Admin login" link at the bottom of `/trace`).

- **Local:** `npm run dev`. Put a test login in `.env.local`:
  `ADMIN_USERS=admin@tipo.test:some-password` and `STORAGE=file`.
  Data is saved in `data/`.
- **Vercel (testing):** data is stored in a private Vercel Blob store.
  `ADMIN_USERS` is set in the project's environment variables.
- **DigitalOcean (live):** see [DEPLOY.md](DEPLOY.md). It uses the
  Dockerfile and a Postgres database.

The code lives in `server/` (shared by Vercel functions in `api/`, the
Express server for DigitalOcean, and the dev server) and `src/admin/`.
