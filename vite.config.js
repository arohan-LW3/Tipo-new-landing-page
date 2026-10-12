import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Serves the /api routes inside `npm run dev`, using the same Express app as
// the production server, so the admin works locally without Vercel.
function localApi() {
  return {
    name: 'tipo-local-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/')) return next()
        try {
          const { createApiApp } = await server.ssrLoadModule('/server/app.js')
          createApiApp()(req, res, next)
        } catch (err) {
          next(err)
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // Make .env / .env.local values (ADMIN_USERS, STORAGE, ...) visible to the
  // API code during local development. Real environment variables win.
  const env = loadEnv(mode, process.cwd(), '')
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) process.env[key] = value
  }

  return {
    plugins: [react(), tailwindcss(), localApi()],
  }
})
