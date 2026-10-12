import crypto from 'node:crypto'

// Admin accounts come from the ADMIN_USERS environment variable, set in the
// host's settings (Vercel or DigitalOcean), never in the code:
//
//   ADMIN_USERS=owner@heritagetipo.com:first-password;worker:second-password
//
// Pairs are separated by ";" and each pair is split at its first ":", so a
// password may contain ":" but not ";". Usernames are case-insensitive.
//
// Sessions are a signed cookie. SESSION_SECRET signs it; if it isn't set, the
// secret is derived from ADMIN_USERS, so changing any password also logs
// everyone out.

const COOKIE = 'tipo_admin'
const SESSION_HOURS = 12

function users() {
  const map = new Map()
  for (const pair of (process.env.ADMIN_USERS || '').split(';')) {
    const at = pair.indexOf(':')
    if (at <= 0) continue
    const name = pair.slice(0, at).trim()
    const password = pair.slice(at + 1)
    if (name && password) map.set(name.toLowerCase(), { name, password })
  }
  return map
}

export function loginConfigured() {
  return users().size > 0
}

function secret() {
  return process.env.SESSION_SECRET || crypto.createHash('sha256').update(`tipo-session:${process.env.ADMIN_USERS || ''}`).digest('hex')
}

function sign(payload) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url')
}

// Comparing hashes keeps the comparison constant-time regardless of length.
function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest()
  const hb = crypto.createHash('sha256').update(String(b)).digest()
  return crypto.timingSafeEqual(ha, hb)
}

export function checkCredentials(username, password) {
  const user = users().get(String(username || '').trim().toLowerCase())
  // Still run a comparison for unknown users so timing doesn't reveal which
  // usernames exist.
  const ok = safeEqual(password || '', user ? user.password : crypto.randomBytes(16).toString('hex'))
  return user && ok ? user.name : null
}

function parseCookies(req) {
  const out = {}
  for (const part of (req.headers.cookie || '').split(';')) {
    const at = part.indexOf('=')
    if (at > 0) out[part.slice(0, at).trim()] = decodeURIComponent(part.slice(at + 1).trim())
  }
  return out
}

function isHttps(req) {
  return req.headers['x-forwarded-proto'] === 'https' || Boolean(req.socket?.encrypted)
}

function cookieHeader(req, value, maxAge) {
  const parts = [`${COOKIE}=${value}`, 'Path=/api/admin', 'HttpOnly', 'SameSite=Strict', `Max-Age=${maxAge}`]
  if (isHttps(req)) parts.push('Secure')
  return parts.join('; ')
}

export function startSession(req, res, username) {
  const payload = Buffer.from(JSON.stringify({ u: username, exp: Date.now() + SESSION_HOURS * 3600e3 })).toString('base64url')
  res.setHeader('Set-Cookie', cookieHeader(req, `${payload}.${sign(payload)}`, SESSION_HOURS * 3600))
}

export function endSession(req, res) {
  res.setHeader('Set-Cookie', cookieHeader(req, '', 0))
}

export function sessionUser(req) {
  const token = parseCookies(req)[COOKIE]
  if (!token) return null
  const [payload, signature] = token.split('.')
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null
  try {
    const { u, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (typeof u !== 'string' || !(exp > Date.now())) return null
    // An account removed from ADMIN_USERS loses access immediately.
    return users().has(u.toLowerCase()) ? u : null
  } catch {
    return null
  }
}

// Slows down password guessing. Counts live in memory: on a long-running
// server (DigitalOcean) this is a real limit; on Vercel each instance keeps
// its own count, so it's a speed bump rather than a wall.
const attempts = new Map()
const WINDOW_MS = 15 * 60e3
const MAX_FAILS = 10

function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim()
}

export function loginBlocked(req) {
  const entry = attempts.get(clientIp(req))
  return Boolean(entry && entry.count >= MAX_FAILS && Date.now() - entry.first < WINDOW_MS)
}

export function recordLoginFailure(req) {
  const ip = clientIp(req)
  const entry = attempts.get(ip)
  if (!entry || Date.now() - entry.first >= WINDOW_MS) attempts.set(ip, { count: 1, first: Date.now() })
  else entry.count++
  if (attempts.size > 5000) attempts.clear()
}

export function clearLoginFailures(req) {
  attempts.delete(clientIp(req))
}
