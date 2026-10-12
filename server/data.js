import { getBackend, ConflictError } from './storage/index.js'
import { seedData } from './seed.js'

// Shape of the stored document:
// {
//   batches: [{
//     id: '1', live: true,
//     tiles: [{ title, rows: [{ label, value, emphasis }], footer: { label, value } }],
//     serials: ['1', '2', 'A-17', ...],   // normalized, sorted, unique
//     cardsUpdatedAt: ISO string     // last card edit, for the stale-edit check
//     updatedAt: ISO string, updatedBy: username,   // last change of any kind
//   }]
// }

export class InputError extends Error {
  constructor(message) {
    super(message)
    this.name = 'InputError'
  }
}

export const LIMITS = {
  batchId: 20,
  tiles: 30,
  rows: 12,
  title: 80,
  label: 60,
  value: 120,
  serial: 40,
  serialsPerBatch: 200000,
}

const BATCH_ID_RE = /^[A-Za-z0-9][A-Za-z0-9 _-]*$/
const SERIAL_RE = /^[A-Z0-9][A-Z0-9_/-]*$/

export async function loadData() {
  const backend = await getBackend()
  const stored = await backend.read()
  if (!stored) return { data: seedData(), version: null }
  return { data: stored.data, version: stored.version }
}

// Returned by a mutate() change function to skip saving.
export const NO_CHANGE = Symbol('no change')

// Read-modify-write with a retry when someone else saved in between. `change`
// receives a fresh copy of the data each attempt and may throw InputError.
export async function mutate(change) {
  const backend = await getBackend()
  for (let attempt = 0; attempt < 8; attempt++) {
    // After a clash, wait a short random moment so simultaneous saves don't
    // keep colliding with each other.
    if (attempt > 0) await new Promise((r) => setTimeout(r, 20 + Math.random() * 80 * attempt))
    const { data, version } = await loadData()
    const result = change(data)
    if (result === NO_CHANGE) return { data, version, result }
    try {
      const newVersion = await backend.write(data, version)
      return { data, version: newVersion, result }
    } catch (err) {
      if (!(err instanceof ConflictError)) throw err
    }
  }
  throw new ConflictError()
}

export function normalizeBatchId(raw) {
  return String(raw ?? '').trim().replace(/\s+/g, ' ')
}

export function findBatch(data, id) {
  const wanted = normalizeBatchId(id).toLowerCase()
  return data.batches.find((b) => b.id.toLowerCase() === wanted) || null
}

// Batch numbers sort naturally: 2 before 10.
export function sortBatches(batches) {
  return batches.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }))
}

// Serials compare case-insensitively, and all-digit serials ignore leading
// zeros, so a customer typing "025" finds serial "25".
export function normalizeSerial(raw) {
  let s = String(raw ?? '').trim().toUpperCase().replace(/\s+/g, '')
  if (/^\d+$/.test(s)) s = s.replace(/^0+(?=\d)/, '')
  return s
}

export function isValidSerial(s) {
  return s.length > 0 && s.length <= LIMITS.serial && SERIAL_RE.test(s)
}

export function sortSerials(list) {
  return list.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}

function text(value, max, field) {
  const s = String(value ?? '').trim()
  if (s.length > max) throw new InputError(`${field} is too long (max ${max} characters).`)
  return s
}

export function cleanBatchId(raw) {
  const id = normalizeBatchId(raw)
  if (!id) throw new InputError('Batch number is required.')
  if (id.length > LIMITS.batchId) throw new InputError(`Batch number is too long (max ${LIMITS.batchId} characters).`)
  if (!BATCH_ID_RE.test(id)) throw new InputError('Batch number can only use letters, numbers, spaces, - and _.')
  return id
}

export function cleanTiles(raw) {
  if (!Array.isArray(raw) || raw.length === 0) throw new InputError('A batch needs at least one card.')
  if (raw.length > LIMITS.tiles) throw new InputError(`A batch can have at most ${LIMITS.tiles} cards.`)

  return raw.map((tile, i) => {
    const where = `Card ${i + 1}`
    const title = text(tile?.title, LIMITS.title, `${where} title`)
    if (!title) throw new InputError(`${where} needs a title.`)

    const rawRows = Array.isArray(tile?.rows) ? tile.rows : []
    if (rawRows.length > LIMITS.rows) throw new InputError(`${where} can have at most ${LIMITS.rows} lines.`)
    const rows = rawRows
      .map((row) => ({
        label: text(row?.label, LIMITS.label, `${where} line label`),
        value: text(row?.value, LIMITS.value, `${where} line value`),
        emphasis: Boolean(row?.emphasis),
      }))
      .filter((row) => row.label || row.value)

    const footer = {
      label: text(tile?.footer?.label, LIMITS.label, `${where} footer label`),
      value: text(tile?.footer?.value, LIMITS.value, `${where} footer value`),
    }

    return { title, rows, footer }
  })
}

// Splits a list of raw serials into ones that can be stored and ones that
// can't. Ranges are expanded on the client; here every entry is one serial.
export function cleanSerialList(raw) {
  if (!Array.isArray(raw)) throw new InputError('Serial numbers must be a list.')
  const valid = new Set()
  const invalid = []
  for (const item of raw) {
    const s = normalizeSerial(item)
    if (!s) continue
    if (isValidSerial(s)) valid.add(s)
    else invalid.push(String(item).slice(0, 60))
  }
  return { valid: [...valid], invalid }
}

// Validates a full document coming from an import file.
export function cleanImport(raw) {
  const batches = raw?.data?.batches ?? raw?.batches
  if (!Array.isArray(batches)) throw new InputError('This file is not a Tipo traceability data file.')

  const seen = new Set()
  const clean = batches.map((b, i) => {
    let id
    try {
      id = cleanBatchId(b?.id)
    } catch (err) {
      throw new InputError(`Batch ${i + 1} in the file: ${err.message}`)
    }
    if (seen.has(id.toLowerCase())) throw new InputError(`Batch ${id} appears twice in the file.`)
    seen.add(id.toLowerCase())

    let tiles
    try {
      tiles = cleanTiles(b?.tiles)
    } catch (err) {
      throw new InputError(`Batch ${id}: ${err.message}`)
    }
    const { valid } = cleanSerialList(Array.isArray(b?.serials) ? b.serials : [])
    if (valid.length > LIMITS.serialsPerBatch) throw new InputError(`Batch ${id} has too many serial numbers.`)

    return {
      id,
      live: Boolean(b?.live),
      tiles,
      serials: sortSerials(valid),
      cardsUpdatedAt: typeof b?.cardsUpdatedAt === 'string' ? b.cardsUpdatedAt : null,
      updatedAt: typeof b?.updatedAt === 'string' ? b.updatedAt : null,
      updatedBy: typeof b?.updatedBy === 'string' ? b.updatedBy.slice(0, 100) : null,
    }
  })
  return sortBatches(clean)
}

export function batchSummary(b) {
  return {
    id: b.id,
    live: b.live,
    tiles: b.tiles,
    serialCount: b.serials.length,
    cardsUpdatedAt: b.cardsUpdatedAt || null,
    updatedAt: b.updatedAt,
    updatedBy: b.updatedBy,
  }
}
