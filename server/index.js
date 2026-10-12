// Standalone server for DigitalOcean (or any Node host): serves the built
// website from dist/ plus the /api routes. Run `npm run build` first, then
// `npm start`.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { createApiApp } from './app.js'
import { storageKind } from './storage/index.js'
import { loginConfigured } from './auth.js'

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist')
const app = createApiApp()

app.use(express.static(dist, { index: false, maxAge: '1h' }))
// Every other path is a page of the single-page app (same as the rewrite in
// vercel.json), so refreshing /traceability or /admin works.
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next()
  res.setHeader('Cache-Control', 'no-cache')
  res.sendFile(path.join(dist, 'index.html'))
})

const port = Number(process.env.PORT) || 8080
app.listen(port, () => {
  console.log(`Tipo site listening on port ${port}`)
  console.log(`Storage: ${storageKind()} · Admin login ${loginConfigured() ? 'configured' : 'NOT configured (set ADMIN_USERS)'}`)
})
