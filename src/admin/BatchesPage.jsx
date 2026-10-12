import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi, downloadFile, formatDate } from './api'
import { AdminPage, Dialog, Notice, Spinner, useLoggedOutRedirect, useFlag } from './ui'
import Icon from './icons'
import { EXPORT_FORMATS, buildExport, fileName } from './exporters'

export default function BatchesPage() {
  const navigate = useNavigate()
  useLoggedOutRedirect()
  const [user, setUser] = useState(null)
  const [batches, setBatches] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [importState, setImportState] = useState(null)
  const [downloaded, flagDownloaded] = useFlag()
  const [menuOpen, setMenuOpen] = useState(false)
  const [exporting, setExporting] = useState(null)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return
    const close = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', close)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])
  const fileInput = useRef(null)

  const load = useCallback(() => {
    setError('')
    return adminApi.data()
      .then((body) => setBatches(body.batches))
      .catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    adminApi.session()
      .then((s) => { setUser(s.user); return load() })
      .catch(() => navigate('/admin/login', { replace: true }))
  }, [load, navigate])

  async function logout() {
    await adminApi.logout().catch(() => {})
    navigate('/admin/login', { replace: true })
  }

  async function exportAll(format) {
    setMenuOpen(false)
    setError('')
    setExporting(format.key)
    try {
      const body = await adminApi.exportData()
      const file = await buildExport(body, format.key)
      downloadFile(fileName(body, format.ext), file, file.type)
      flagDownloaded()
      setMessage(format.key === 'csv' || format.key === 'pdf'
        ? `Downloaded all data as ${format.label}. To upload data back later, use the JSON (or ZIP) download.`
        : `Downloaded all data as ${format.label}. Keep this file safe - it can be uploaded again on any Tipo admin.`)
    } catch (err) {
      setError(err.message || "Couldn't create the download. Please try again.")
    } finally {
      setExporting(null)
    }
  }

  async function pickImportFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    let parsed
    try {
      parsed = JSON.parse(await readDataFile(file))
    } catch {
      setError(`${file.name} isn't a Tipo data file. Use the JSON or ZIP file from "Download all data".`)
      return
    }
    setImportState({ file: parsed, name: file.name, mode: 'replace', summary: null, busy: true })
    try {
      const { summary } = await adminApi.importData(parsed, 'replace', true)
      setImportState({ file: parsed, name: file.name, mode: 'replace', summary, busy: false })
    } catch (err) {
      setImportState(null)
      setError(err.message)
    }
  }

  async function changeImportMode(mode) {
    setImportState((s) => ({ ...s, mode, busy: true }))
    try {
      const { summary } = await adminApi.importData(importState.file, mode, true)
      setImportState((s) => ({ ...s, summary, busy: false }))
    } catch (err) {
      setImportState(null)
      setError(err.message)
    }
  }

  async function confirmImport() {
    setImportState((s) => ({ ...s, busy: true }))
    try {
      const { summary } = await adminApi.importData(importState.file, importState.mode, false)
      setImportState(null)
      setMessage(`Uploaded ${summary.batches} batch${summary.batches === 1 ? '' : 'es'} with ${summary.serials.toLocaleString()} serial numbers. The website is updated.`)
      load()
    } catch (err) {
      setImportState(null)
      setError(err.message)
    }
  }

  return (
    <AdminPage
      wide
      title="Traceability admin"
      onBack={() => navigate('/trace')}
      actions={<button type="button" className="admin-btn quiet small" onClick={logout}>Log out</button>}
    >
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4" style={{ marginBottom: '22px' }}>
        <div>
          <h1 className="text-[1.3rem]" style={{ color: 'var(--a-gold-text)', fontWeight: 'normal' }}>Batches</h1>
          {user && <p className="text-[0.8rem]" style={{ color: 'var(--a-muted)', marginTop: '4px' }}>Logged in as {user}</p>}
        </div>
        <button type="button" className="admin-btn primary" onClick={() => navigate('/admin/batch/new')}>
          <Icon name="add" size={18} /> New batch
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {message && <Notice tone="ok" onClose={() => setMessage('')}>{message}</Notice>}
        {error && <Notice tone="error" onClose={() => setError('')}>{error}</Notice>}
      </div>

      {batches === null && !error && <Spinner />}

      {batches && batches.length === 0 && (
        <div className="admin-panel text-center" style={{ padding: '32px 20px', marginTop: '12px' }}>
          <p className="text-[0.9rem]">No batches yet.</p>
          <p className="text-[0.8rem]" style={{ color: 'var(--a-muted)', marginTop: '6px' }}>Create the first one with “New batch”.</p>
        </div>
      )}

      {batches && batches.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2" style={{ marginTop: '12px' }}>
          {batches.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => navigate(`/admin/batch/${encodeURIComponent(b.id)}`)}
                className="admin-panel w-full text-left cursor-pointer flex flex-col gap-3"
                style={{ padding: '18px', fontFamily: 'inherit', color: 'inherit', transition: 'border-color 0.2s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--a-gold)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '' }}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[1.05rem]" style={{ color: 'var(--a-gold-text)' }}>Batch {b.id}</span>
                  <span className="flex items-center gap-2">
                    <LiveBadge live={b.live} />
                    <Icon name="arrowForwardIos" size={16} style={{ color: 'var(--a-muted)' }} />
                  </span>
                </div>
                <div className="flex gap-5 text-[0.8rem]">
                  <span><strong style={{ fontWeight: 'normal', fontSize: '1rem' }}>{b.tiles.length}</strong> <span style={{ color: 'var(--a-muted)' }}>cards</span></span>
                  <span><strong style={{ fontWeight: 'normal', fontSize: '1rem' }}>{b.serialCount.toLocaleString()}</strong> <span style={{ color: 'var(--a-muted)' }}>serial numbers</span></span>
                </div>
                <span className="text-[0.72rem]" style={{ color: 'var(--a-muted)' }}>
                  {b.updatedAt ? `Last updated ${formatDate(b.updatedAt)}${b.updatedBy ? ` by ${b.updatedBy}` : ''}` : 'Not edited yet'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <section className="admin-panel" style={{ padding: '18px', marginTop: '36px', background: 'var(--a-surface)' }}>
        <h2 className="text-[0.95rem]" style={{ fontWeight: 'normal' }}>Backup and moving data</h2>
        <p className="text-[0.8rem]" style={{ color: 'var(--a-muted)', marginTop: '6px', lineHeight: 1.55 }}>
          Download a file with every batch, card and serial number. Upload that file on another Tipo admin (for example after moving to a new server) to bring everything across.
        </p>
        <div className="flex flex-col md:flex-row gap-2" style={{ marginTop: '14px' }}>
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="admin-btn w-full"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              disabled={Boolean(exporting)}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <Icon name={downloaded ? 'downloadDone' : 'download'} size={18} />
              {exporting ? 'Preparing…' : downloaded ? 'Downloaded' : 'Download all data'}
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="admin-panel flex flex-col"
                style={{ position: 'absolute', left: 0, bottom: 'calc(100% + 6px)', zIndex: 20, width: 'min(340px, calc(100vw - 40px))', padding: '6px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
              >
                {EXPORT_FORMATS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    role="menuitem"
                    onClick={() => exportAll(f)}
                    className="flex items-start gap-3 text-left bg-transparent border-none cursor-pointer hover:bg-[var(--a-gold-soft)]"
                    style={{ padding: '10px', borderRadius: '8px', fontFamily: 'inherit', color: 'var(--a-text)' }}
                  >
                    <Icon name="download" size={18} style={{ color: 'var(--a-gold-text)', marginTop: '1px' }} />
                    <span>
                      <span className="block text-[0.88rem]">{f.label} <span style={{ color: 'var(--a-muted)' }}>.{f.ext}</span></span>
                      <span className="block text-[0.74rem]" style={{ color: 'var(--a-muted)', lineHeight: 1.45 }}>{f.text}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" className="admin-btn quiet" onClick={() => fileInput.current?.click()}>
            <Icon name="upload" size={18} /> Upload data
          </button>
          <input ref={fileInput} type="file" accept=".json,.zip,application/json,application/zip" hidden onChange={pickImportFile} />
        </div>
      </section>

      {importState && (
        <Dialog
          title="Upload data"
          onClose={() => !importState.busy && setImportState(null)}
          actions={(
            <>
              <button type="button" className="admin-btn quiet" disabled={importState.busy} onClick={() => setImportState(null)}>Cancel</button>
              <button type="button" className="admin-btn primary" disabled={importState.busy || !importState.summary} onClick={confirmImport}>
                {importState.busy ? 'Working…' : 'Confirm upload'}
              </button>
            </>
          )}
        >
          <p style={{ color: 'var(--a-muted)' }}>{importState.name}</p>
          <div className="flex flex-col gap-2">
            <ModeOption
              checked={importState.mode === 'replace'}
              onChange={() => changeImportMode('replace')}
              title="Replace everything"
              text="The file becomes the full list of batches. Use this when moving to a new server."
            />
            <ModeOption
              checked={importState.mode === 'merge'}
              onChange={() => changeImportMode('merge')}
              title="Add to existing"
              text="Batches in the file replace ones with the same number; other batches stay."
            />
          </div>
          {importState.summary && <ImportSummary summary={importState.summary} />}
        </Dialog>
      )}
    </AdminPage>
  )
}

// Upload accepts the JSON backup, or the ZIP download (which contains it).
async function readDataFile(file) {
  if (!file.name.toLowerCase().endsWith('.zip')) return file.text()
  const { unzipSync, strFromU8 } = await import('fflate')
  const files = unzipSync(new Uint8Array(await file.arrayBuffer()))
  const json = Object.keys(files).find((name) => name.toLowerCase().endsWith('.json'))
  if (!json) throw new Error('No data file in the ZIP')
  return strFromU8(files[json])
}

export function LiveBadge({ live }) {
  return (
    <span
      className="text-[0.68rem] tracking-[0.06em] uppercase"
      style={{
        padding: '4px 8px',
        borderRadius: '4px',
        background: live ? 'var(--a-ok-soft)' : 'var(--a-surface)',
        color: live ? 'var(--a-ok)' : 'var(--a-muted)',
        border: `1px solid ${live ? '#b9dfc5' : 'var(--a-border)'}`,
      }}
    >
      {live ? 'Live' : 'Hidden'}
    </span>
  )
}

function ModeOption({ checked, onChange, title, text }) {
  return (
    <label
      className="flex items-start gap-3 cursor-pointer"
      style={{ border: `1px solid ${checked ? 'var(--a-gold)' : 'var(--a-border)'}`, background: checked ? 'var(--a-gold-soft)' : '#fff', borderRadius: '8px', padding: '12px' }}
    >
      <input type="radio" checked={checked} onChange={onChange} style={{ marginTop: '4px', accentColor: '#F7A70C' }} />
      <span>
        <span className="block text-[0.88rem]">{title}</span>
        <span className="block text-[0.76rem]" style={{ color: 'var(--a-muted)' }}>{text}</span>
      </span>
    </label>
  )
}

function ImportSummary({ summary }) {
  const list = (ids) => ids.map((id) => `Batch ${id}`).join(', ')
  return (
    <div className="flex flex-col gap-2">
      <Notice tone="info">
        The file has <strong style={{ fontWeight: 'normal', color: 'var(--a-gold-text)' }}>{summary.batches} batch{summary.batches === 1 ? '' : 'es'}</strong> and{' '}
        <strong style={{ fontWeight: 'normal', color: 'var(--a-gold-text)' }}>{summary.serials.toLocaleString()} serial numbers</strong>.
        {summary.adding.length > 0 && <><br />New: {list(summary.adding)}</>}
        {summary.replacing.length > 0 && <><br />Will be overwritten: {list(summary.replacing)}</>}
      </Notice>
      {summary.removing.length > 0 && (
        <Notice tone="error">Will be removed (not in the file): {list(summary.removing)}</Notice>
      )}
    </div>
  )
}
