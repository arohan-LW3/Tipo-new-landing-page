// Thin wrapper over /api/admin. Errors carry the server's plain-language
// message so pages can show it as-is.
export class ApiError extends Error {
  constructor(status, body) {
    super(body?.message || (status === 0 ? 'Could not reach the server. Check your internet connection.' : `Request failed (${status}).`))
    this.status = status
    this.code = body?.error
    this.body = body
  }
}

async function request(action, { method = 'GET', body, query } = {}) {
  const params = new URLSearchParams({ action, ...query })
  let res
  try {
    res = await fetch(`/api/admin?${params}`, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0)
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401 && action !== 'login') window.dispatchEvent(new Event('tipo-admin-logged-out'))
    throw new ApiError(res.status, data)
  }
  return data
}

export const adminApi = {
  session: () => request('session'),
  login: (username, password) => request('login', { method: 'POST', body: { username, password } }),
  logout: () => request('logout', { method: 'POST', body: {} }),
  data: () => request('data'),
  serials: (batch) => request('serials', { query: { batch } }),
  exportData: () => request('export'),
  saveBatch: (payload) => request('save-batch', { method: 'POST', body: payload }),
  deleteBatch: (id) => request('delete-batch', { method: 'POST', body: { id } }),
  addSerials: (id, serials) => request('add-serials', { method: 'POST', body: { id, serials } }),
  removeSerials: (id, serials) => request('remove-serials', { method: 'POST', body: { id, serials } }),
  removeAllSerials: (id) => request('remove-serials', { method: 'POST', body: { id, all: true } }),
  importData: (file, mode, dryRun) => request('import', { method: 'POST', body: { file, mode, dryRun } }),
}

export function downloadFile(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function formatDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
