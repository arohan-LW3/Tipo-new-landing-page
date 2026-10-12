// All traceability data lives in one JSON document. Each backend only knows
// how to read it and write it back, plus a version token so two people saving
// at the same moment can't silently overwrite each other.
//
//   read()                -> { data, version } | null   (null = nothing saved yet)
//   write(data, version)  -> newVersion, or throws ConflictError if the stored
//                            version is no longer `version` (null = "expect empty")
//
// Which backend runs is decided by the environment, so the same code works
// everywhere:
//   - Vercel (testing):           Vercel Blob, private store
//   - DigitalOcean App Platform:  Postgres via DATABASE_URL
//   - Local dev / a plain server: a JSON file on disk (DATA_DIR)
// STORAGE=file|blob|postgres overrides the automatic choice.

export class ConflictError extends Error {
  constructor() {
    super('The data was changed by someone else.')
    this.name = 'ConflictError'
  }
}

export function storageKind() {
  const forced = (process.env.STORAGE || '').trim().toLowerCase()
  if (forced) return forced
  if (process.env.DATABASE_URL) return 'postgres'
  if (process.env.VERCEL || process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN) return 'blob'
  return 'file'
}

let backendPromise = null

function loadBackend() {
  const kind = storageKind()
  if (kind === 'postgres') return import('./postgres.js')
  if (kind === 'blob') return import('./blob.js')
  if (kind === 'file') return import('./file.js')
  throw new Error(`Unknown STORAGE "${kind}" (use file, blob or postgres)`)
}

export async function getBackend() {
  if (!backendPromise) {
    backendPromise = loadBackend()
    backendPromise.catch(() => { backendPromise = null })
  }
  return backendPromise
}
