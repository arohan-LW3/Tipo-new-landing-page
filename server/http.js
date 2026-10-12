import { InputError } from './data.js'
import { ConflictError } from './storage/index.js'

// Handlers are written against the small request/response surface that both
// Vercel functions and Express provide: req.method, req.query, req.body,
// req.headers, res.status().json(), res.setHeader().
export function withErrors(handler) {
  return async function wrapped(req, res) {
    res.setHeader('Cache-Control', 'no-store')
    try {
      await handler(req, res)
    } catch (err) {
      if (err instanceof InputError) return res.status(400).json({ error: 'invalid', message: err.message })
      if (err instanceof ConflictError) {
        return res.status(409).json({ error: 'conflict', message: 'Someone else saved changes at the same moment. Reload and try again.' })
      }
      console.error(err)
      return res.status(500).json({ error: 'server', message: 'Something went wrong on the server. Please try again.' })
    }
  }
}

// POSTs must be JSON. Browsers can't send a cross-site JSON request without
// the site's permission, so together with the SameSite cookie this blocks
// forged requests from other websites.
export function requireJsonPost(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method', message: 'Method not allowed' })
    return false
  }
  if (!String(req.headers['content-type'] || '').includes('application/json')) {
    res.status(415).json({ error: 'content-type', message: 'Expected JSON' })
    return false
  }
  return true
}

export function queryParam(req, name) {
  const value = req.query?.[name]
  return Array.isArray(value) ? value[0] : value
}
