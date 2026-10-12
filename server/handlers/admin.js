import {
  loadData, mutate, findBatch, sortBatches, sortSerials, batchSummary,
  cleanBatchId, cleanTiles, cleanSerialList, cleanImport, InputError, LIMITS, NO_CHANGE,
} from '../data.js'
import {
  loginConfigured, checkCredentials, startSession, endSession, sessionUser,
  loginBlocked, recordLoginFailure, clearLoginFailures,
} from '../auth.js'
import { storageKind } from '../storage/index.js'
import { withErrors, requireJsonPost, queryParam } from '../http.js'

// Everything the admin pages need, behind one endpoint so it maps to a single
// Vercel function: /api/admin?action=<name>
async function admin(req, res) {
  const action = queryParam(req, 'action')

  if (action === 'login') return login(req, res)
  if (action === 'logout') {
    if (!requireJsonPost(req, res)) return
    endSession(req, res)
    return res.status(200).json({ ok: true })
  }

  const user = sessionUser(req)
  if (!user) return res.status(401).json({ error: 'auth', configured: loginConfigured() })

  const routes = {
    session: () => res.status(200).json({ user, storage: storageKind(), limits: LIMITS }),
    data: () => getData(req, res),
    serials: () => getSerials(req, res),
    export: () => exportData(req, res),
  }
  const postRoutes = {
    'save-batch': saveBatch,
    'delete-batch': deleteBatch,
    'add-serials': addSerials,
    'remove-serials': removeSerials,
    import: importData,
  }

  if (req.method === 'GET' && routes[action]) return routes[action]()
  if (postRoutes[action]) {
    if (!requireJsonPost(req, res)) return
    return postRoutes[action](req, res, user)
  }
  return res.status(404).json({ error: 'action', message: 'Unknown action' })
}

async function login(req, res) {
  if (!requireJsonPost(req, res)) return
  if (!loginConfigured()) {
    return res.status(503).json({ error: 'not-configured', message: 'Admin login has not been set up on this server yet.' })
  }
  if (loginBlocked(req)) {
    return res.status(429).json({ error: 'blocked', message: 'Too many wrong attempts. Please wait 15 minutes and try again.' })
  }
  const { username, password } = req.body || {}
  const name = checkCredentials(username, password)
  if (!name) {
    recordLoginFailure(req)
    await new Promise((r) => setTimeout(r, 400))
    return res.status(401).json({ error: 'credentials', message: 'Wrong username or password.' })
  }
  clearLoginFailures(req)
  startSession(req, res, name)
  return res.status(200).json({ user: name })
}

async function getData(req, res) {
  const { data } = await loadData()
  return res.status(200).json({ batches: sortBatches([...data.batches]).map(batchSummary) })
}

async function getSerials(req, res) {
  const { data } = await loadData()
  const batch = findBatch(data, queryParam(req, 'batch'))
  if (!batch) return res.status(404).json({ error: 'batch', message: 'Batch not found.' })
  return res.status(200).json({ serials: batch.serials })
}

async function exportData(req, res) {
  const { data } = await loadData()
  const stamp = new Date().toISOString()
  res.setHeader('Content-Disposition', `attachment; filename="tipo-traceability-${stamp.slice(0, 10)}.json"`)
  return res.status(200).json({ app: 'tipo-traceability', format: 1, exportedAt: stamp, data })
}

function requireBatch(data, id) {
  const batch = findBatch(data, id)
  if (!batch) throw new InputError(`Batch ${id} no longer exists. It may have been deleted by someone else.`)
  return batch
}

async function saveBatch(req, res, user) {
  const { originalId, id, live, tiles, baseUpdatedAt } = req.body || {}
  const cleanId = cleanBatchId(id)
  const cleanTileList = cleanTiles(tiles)
  let stale = null

  const { result } = await mutate((data) => {
    stale = null
    const clash = findBatch(data, cleanId)
    const now = new Date().toISOString()

    if (originalId == null) {
      if (clash) throw new InputError(`Batch ${clash.id} already exists.`)
      const batch = { id: cleanId, live: Boolean(live), tiles: cleanTileList, serials: [], cardsUpdatedAt: now, updatedAt: now, updatedBy: user }
      data.batches.push(batch)
      sortBatches(data.batches)
      return batch
    }

    const batch = requireBatch(data, originalId)
    // Someone else saved this batch's cards after this editor opened it:
    // don't overwrite their work without the user seeing it first. Serial
    // changes don't count, so adding serials never blocks a card edit.
    if ((batch.cardsUpdatedAt || null) !== (baseUpdatedAt || null)) {
      stale = { updatedAt: batch.updatedAt, updatedBy: batch.updatedBy }
      return NO_CHANGE
    }
    if (clash && clash !== batch) throw new InputError(`Batch ${clash.id} already exists.`)

    Object.assign(batch, { id: cleanId, live: Boolean(live), tiles: cleanTileList, cardsUpdatedAt: now, updatedAt: now, updatedBy: user })
    sortBatches(data.batches)
    return batch
  })

  if (stale) {
    return res.status(409).json({
      error: 'stale',
      message: `${stale.updatedBy || 'Someone'} saved changes to this batch while you were editing. Reload the batch to see them before saving.`,
    })
  }
  return res.status(200).json({ batch: batchSummary(result) })
}

async function deleteBatch(req, res) {
  const { id } = req.body || {}
  await mutate((data) => {
    const batch = requireBatch(data, id)
    data.batches = data.batches.filter((b) => b !== batch)
  })
  return res.status(200).json({ ok: true })
}

async function addSerials(req, res, user) {
  const { id, serials } = req.body || {}
  if (!Array.isArray(serials) || serials.length === 0) throw new InputError('No serial numbers to add.')
  if (serials.length > LIMITS.serialsPerBatch) throw new InputError(`Too many serial numbers in one go (max ${LIMITS.serialsPerBatch}).`)
  const { valid, invalid } = cleanSerialList(serials)

  const { result } = await mutate((data) => {
    const batch = requireBatch(data, id)
    const existing = new Set(batch.serials)
    const fresh = valid.filter((s) => !existing.has(s))
    if (existing.size + fresh.length > LIMITS.serialsPerBatch) {
      throw new InputError(`A batch can hold at most ${LIMITS.serialsPerBatch} serial numbers.`)
    }
    if (fresh.length) {
      batch.serials = sortSerials([...batch.serials, ...fresh])
      batch.updatedAt = new Date().toISOString()
      batch.updatedBy = user
    }
    return { added: fresh.length, alreadyThere: valid.length - fresh.length, total: batch.serials.length, batch }
  })

  return res.status(200).json({
    added: result.added,
    alreadyThere: result.alreadyThere,
    invalidCount: invalid.length,
    invalid: invalid.slice(0, 50),
    total: result.total,
    batch: batchSummary(result.batch),
  })
}

async function removeSerials(req, res, user) {
  const { id, serials, all } = req.body || {}
  if (!all && (!Array.isArray(serials) || serials.length === 0)) throw new InputError('No serial numbers to remove.')
  const { valid } = all ? { valid: [] } : cleanSerialList(serials)

  const { result } = await mutate((data) => {
    const batch = requireBatch(data, id)
    const before = batch.serials.length
    if (all) {
      batch.serials = []
    } else {
      const drop = new Set(valid)
      batch.serials = batch.serials.filter((s) => !drop.has(s))
    }
    const removed = before - batch.serials.length
    if (removed) {
      batch.updatedAt = new Date().toISOString()
      batch.updatedBy = user
    }
    return { removed, notFound: all ? 0 : valid.length - removed, total: batch.serials.length, batch }
  })

  return res.status(200).json({
    removed: result.removed,
    notFound: result.notFound,
    total: result.total,
    batch: batchSummary(result.batch),
  })
}

// mode "replace": the file becomes the whole data set.
// mode "merge":   batches in the file replace same-numbered ones; others stay.
// dryRun: validate and report what would happen without saving.
async function importData(req, res) {
  const { file, mode, dryRun } = req.body || {}
  if (mode !== 'replace' && mode !== 'merge') throw new InputError('Choose replace or merge.')
  const incoming = cleanImport(file)

  const summarize = (data) => {
    const ids = new Set(data.batches.map((b) => b.id.toLowerCase()))
    return {
      batches: incoming.length,
      serials: incoming.reduce((n, b) => n + b.serials.length, 0),
      replacing: incoming.filter((b) => ids.has(b.id.toLowerCase())).map((b) => b.id),
      adding: incoming.filter((b) => !ids.has(b.id.toLowerCase())).map((b) => b.id),
      removing: mode === 'replace'
        ? data.batches.filter((b) => !incoming.some((n) => n.id.toLowerCase() === b.id.toLowerCase())).map((b) => b.id)
        : [],
    }
  }

  if (dryRun) {
    const { data } = await loadData()
    return res.status(200).json({ summary: summarize(data) })
  }

  const { result } = await mutate((data) => {
    const summary = summarize(data)
    if (mode === 'replace') {
      data.batches = incoming
    } else {
      const byId = new Map(data.batches.map((b) => [b.id.toLowerCase(), b]))
      for (const b of incoming) byId.set(b.id.toLowerCase(), b)
      data.batches = sortBatches([...byId.values()])
    }
    return summary
  })
  return res.status(200).json({ summary: result })
}

export default withErrors(admin)
