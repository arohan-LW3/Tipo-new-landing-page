import express from 'express'
import trace from './handlers/trace.js'
import admin from './handlers/admin.js'
import submitForm from './handlers/submit-form.js'

// The /api routes as an Express app. On Vercel the same handlers run as
// functions from /api instead; this app is used by the standalone server
// (DigitalOcean, Docker) and by the Vite dev server.
export function createApiApp() {
  const app = express()
  app.disable('x-powered-by')
  app.use('/api', express.json({ limit: '20mb' }))
  app.all('/api/trace', trace)
  app.all('/api/admin', admin)
  app.all('/api/submit-form', submitForm)
  app.get('/api/health', (req, res) => res.status(200).json({ ok: true }))
  app.use('/api', (req, res) => res.status(404).json({ error: 'not-found' }))
  return app
}
