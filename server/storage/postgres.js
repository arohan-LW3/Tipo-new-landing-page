import pg from 'pg'
import { ConflictError } from './index.js'

const KEY = 'traceability'
let pool = null
let ready = null

function getPool() {
  if (pool) return pool
  // DigitalOcean's connection string carries sslmode=require, which newer
  // versions of pg treat as "verify against the system CAs" and DO's
  // certificate isn't in that list. Strip it and configure SSL here instead:
  // verify with DO's CA when it's provided (DATABASE_CA_CERT), otherwise keep
  // the connection encrypted without verification.
  const url = new URL(process.env.DATABASE_URL)
  const sslmode = url.searchParams.get('sslmode')
  url.searchParams.delete('sslmode')
  const ca = process.env.DATABASE_CA_CERT
  let ssl = false
  if (ca) ssl = { ca }
  else if (sslmode && sslmode !== 'disable') ssl = { rejectUnauthorized: false }

  pool = new pg.Pool({ connectionString: url.toString(), ssl, max: 5 })
  return pool
}

async function ensureTable() {
  if (!ready) {
    ready = getPool().query(`
      CREATE TABLE IF NOT EXISTS tipo_store (
        key        text PRIMARY KEY,
        value      jsonb NOT NULL,
        revision   integer NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `)
    ready.catch(() => { ready = null })
  }
  await ready
}

export async function read() {
  await ensureTable()
  const { rows } = await getPool().query('SELECT value, revision FROM tipo_store WHERE key = $1', [KEY])
  if (!rows.length) return null
  return { data: rows[0].value, version: String(rows[0].revision) }
}

export async function write(data, version) {
  await ensureTable()
  const json = JSON.stringify(data)
  const { rows } = version
    ? await getPool().query(
      `UPDATE tipo_store SET value = $2, revision = revision + 1, updated_at = now()
       WHERE key = $1 AND revision = $3 RETURNING revision`,
      [KEY, json, Number(version)],
    )
    : await getPool().query(
      `INSERT INTO tipo_store (key, value, revision) VALUES ($1, $2, 1)
       ON CONFLICT (key) DO NOTHING RETURNING revision`,
      [KEY, json],
    )
  if (!rows.length) throw new ConflictError()
  return String(rows[0].revision)
}
