import { loadData, findBatch, normalizeSerial, sortBatches } from '../data.js'
import { withErrors, queryParam } from '../http.js'

// Public endpoint used by the customer-facing traceability pages.
//   GET /api/trace                      -> list of batches for the dropdown
//   GET /api/trace?batch=1&serial=25    -> that batch's timeline cards
async function trace(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method', message: 'Method not allowed' })

  const { data } = await loadData()
  const batchParam = queryParam(req, 'batch')

  if (batchParam == null) {
    const batches = sortBatches([...data.batches]).map((b) => ({ id: b.id, live: b.live }))
    return res.status(200).json({ batches })
  }

  const batch = findBatch(data, batchParam)
  if (!batch || !batch.live) {
    const live = sortBatches(data.batches.filter((b) => b.live)).map((b) => b.id)
    return res.status(404).json({ error: 'batch', liveBatches: live })
  }

  // A batch with no serials registered yet accepts any serial (or none), so a
  // batch can go live before its serial list is uploaded.
  const serial = normalizeSerial(queryParam(req, 'serial'))
  if (batch.serials.length > 0) {
    if (!serial) return res.status(404).json({ error: 'serial-missing' })
    if (!batch.serials.includes(serial)) return res.status(404).json({ error: 'serial' })
  }

  return res.status(200).json({ batch: batch.id, serial, tiles: batch.tiles })
}

export default withErrors(trace)
