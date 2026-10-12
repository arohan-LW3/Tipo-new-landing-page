import { get, put, BlobPreconditionFailedError } from '@vercel/blob'
import { ConflictError } from './index.js'

// Private store: the file is never reachable by a public URL, only through
// this server code.
const PATHNAME = 'tipo/traceability-data.json'

export async function read() {
  // useCache: false so a save is visible on the very next read.
  const result = await get(PATHNAME, { access: 'private', useCache: false })
  if (!result || result.statusCode !== 200) return null
  const text = await new Response(result.stream).text()
  // get() reports the ETag in weak form (W/"…") but put()'s ifMatch only
  // accepts the strong form, so strip the prefix.
  return { data: JSON.parse(text), version: result.blob.etag.replace(/^W\//, '') }
}

export async function write(data, version) {
  const options = {
    access: 'private',
    addRandomSuffix: false,
    contentType: 'application/json',
  }
  // With a version, only overwrite if nobody saved in between. Without one,
  // the blob must not exist yet (put refuses to overwrite by default).
  if (version) options.ifMatch = version

  try {
    const result = await put(PATHNAME, JSON.stringify(data), options)
    return result.etag
  } catch (err) {
    if (err instanceof BlobPreconditionFailedError) throw new ConflictError()
    if (!version && /already exists/i.test(err?.message || '')) throw new ConflictError()
    throw err
  }
}
