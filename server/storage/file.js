import { promises as fs } from 'node:fs'
import path from 'node:path'
import { ConflictError } from './index.js'

const DIR = path.resolve(process.env.DATA_DIR || 'data')
const FILE = path.join(DIR, 'tipo-data.json')

// Writes in one process are queued so a read-check-write can't interleave.
let queue = Promise.resolve()

async function readDoc() {
  try {
    return JSON.parse(await fs.readFile(FILE, 'utf8'))
  } catch (err) {
    if (err.code === 'ENOENT') return null
    throw err
  }
}

export async function read() {
  const doc = await readDoc()
  return doc ? { data: doc.data, version: String(doc.revision) } : null
}

export function write(data, version) {
  const run = queue.then(async () => {
    const current = await readDoc()
    const currentVersion = current ? String(current.revision) : null
    if (currentVersion !== version) throw new ConflictError()

    const revision = (current?.revision || 0) + 1
    await fs.mkdir(DIR, { recursive: true })
    // Write to a temp file and rename, so a crash mid-write never leaves a
    // half-written data file behind.
    const tmp = `${FILE}.${process.pid}.tmp`
    await fs.writeFile(tmp, JSON.stringify({ revision, data }))
    await fs.rename(tmp, FILE)
    return String(revision)
  })
  queue = run.catch(() => {})
  return run
}
