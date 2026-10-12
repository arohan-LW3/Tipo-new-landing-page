import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { adminApi, formatDate } from './api'
import { AdminPage, Dialog, Field, Notice, Spinner, useLoggedOutRedirect } from './ui'
import { LiveBadge } from './BatchesPage'
import SerialsPanel from './SerialsPanel'
import { TraceabilityTimeline, TIMELINE_BOTTOM_SPACE, SourceCard } from '../TraceabilityPage'
import Icon from './icons'
import { rowsToEntries, entriesToRows, BLANK_ENTRY } from './entries'

const MAX_ENTRIES = 10
const BLANK_TILE = () => ({ title: '', entries: [BLANK_ENTRY()], footer: { label: '', value: '' } })

const clone = (v) => JSON.parse(JSON.stringify(v))

function toEditorTile(tile) {
  return { title: tile.title, entries: rowsToEntries(tile.rows), footer: { ...tile.footer } }
}

function toSiteTile(tile) {
  return {
    title: tile.title.trim(),
    rows: entriesToRows(tile.entries),
    footer: { label: tile.footer.label.trim(), value: tile.footer.value.trim() },
  }
}

function draftFrom(batch) {
  return { id: batch.id, live: batch.live, tiles: batch.tiles.map(toEditorTile) }
}

export default function BatchEditorPage() {
  const { id: routeId } = useParams()
  const isNew = routeId === 'new'
  const navigate = useNavigate()
  useLoggedOutRedirect()

  const [saved, setSaved] = useState(null)        // the batch as stored
  const [draft, setDraft] = useState(null)        // what's being edited
  const [copiedFrom, setCopiedFrom] = useState(null)
  const [tab, setTab] = useState('cards')
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [previewing, setPreviewing] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const load = useCallback(async () => {
    setLoadError('')
    try {
      const { batches } = await adminApi.data()
      if (isNew) {
        // New batches start as a copy of the latest batch's cards, since most
        // steps repeat from batch to batch; "Start blank" clears them.
        const latest = batches[batches.length - 1]
        setSaved(null)
        setDraft({ id: '', live: false, tiles: latest ? latest.tiles.map(toEditorTile) : [BLANK_TILE()] })
        setCopiedFrom(latest?.id || null)
        return
      }
      const batch = batches.find((b) => b.id === routeId)
      if (!batch) {
        setLoadError(`Batch ${routeId} doesn't exist. It may have been deleted or renamed.`)
        return
      }
      setSaved(batch)
      setDraft(draftFrom(batch))
    } catch (err) {
      setLoadError(err.message)
    }
  }, [isNew, routeId])

  useEffect(() => { load() }, [load])

  const dirty = useMemo(() => {
    if (!draft) return false
    if (!saved) return true
    return JSON.stringify(draftFrom(saved)) !== JSON.stringify(draft)
  }, [draft, saved])

  // Warn before closing the tab with unpublished edits.
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const goBack = () => (dirty ? setConfirmLeave(true) : navigate('/admin'))

  const update = (fn) => setDraft((d) => { const next = clone(d); fn(next); return next })

  // Checks the obvious mistakes before showing the preview; the server checks
  // everything again on publish.
  function problems() {
    const list = []
    if (!draft.id.trim()) list.push('Enter a batch number.')
    if (draft.tiles.length === 0) list.push('Add at least one card.')
    draft.tiles.forEach((t, i) => {
      if (!t.title.trim()) list.push(`Card ${i + 1} needs a title.`)
      t.entries.forEach((e, j) => {
        if (e.coords.trim() && !e.place.trim()) list.push(`Card ${i + 1}, entry ${j + 1}: add the place for these coordinates.`)
      })
    })
    return list
  }

  function openPreview() {
    const found = problems()
    if (found.length) {
      setError(found.join(' '))
      return
    }
    setError('')
    setPreviewing(true)
  }

  async function publish() {
    setPublishing(true)
    setError('')
    try {
      const { batch } = await adminApi.saveBatch({
        originalId: saved ? saved.id : null,
        id: draft.id,
        live: draft.live,
        tiles: draft.tiles.map(toSiteTile),
        baseUpdatedAt: saved?.cardsUpdatedAt ?? null,
      })
      setSaved(batch)
      setDraft(draftFrom(batch))
      setPreviewing(false)
      setCopiedFrom(null)
      setMessage(batch.live
        ? `Published. Batch ${batch.id} is updated on the website.`
        : `Saved. Batch ${batch.id} is hidden, so customers can't see it until you switch “Show on website” on.`)
      if (isNew || batch.id !== routeId) navigate(`/admin/batch/${encodeURIComponent(batch.id)}`, { replace: true })
      window.scrollTo({ top: 0 })
    } catch (err) {
      setPreviewing(false)
      setError(err.message)
      window.scrollTo({ top: 0 })
    } finally {
      setPublishing(false)
    }
  }

  async function deleteBatch() {
    try {
      await adminApi.deleteBatch(saved.id)
      navigate('/admin', { replace: true })
    } catch (err) {
      setConfirmDelete(false)
      setError(err.message)
    }
  }

  const title = isNew ? 'New batch' : `Batch ${saved?.id ?? routeId}`

  if (loadError) {
    return (
      <AdminPage title={title} onBack={() => navigate('/admin')} wide>
        <Notice tone="error">{loadError}</Notice>
        <button type="button" className="admin-btn quiet" style={{ marginTop: '16px' }} onClick={() => navigate('/admin')}>Back to batches</button>
      </AdminPage>
    )
  }
  if (!draft) return <AdminPage title={title} onBack={() => navigate('/admin')} wide><Spinner /></AdminPage>

  return (
    <AdminPage title={title} onBack={goBack} wide>
      <div className="flex flex-col gap-3" style={{ marginBottom: '18px' }}>
        {message && <Notice tone="ok" onClose={() => setMessage('')}>{message}</Notice>}
        {error && <Notice tone="error" onClose={() => setError('')}>{error}</Notice>}
        {saved && (
          <p className="text-[0.75rem]" style={{ color: 'var(--a-muted)' }}>
            {saved.updatedAt ? `Last updated ${formatDate(saved.updatedAt)}${saved.updatedBy ? ` by ${saved.updatedBy}` : ''}` : 'Not edited yet'}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div role="tablist" className="flex gap-1" style={{ borderBottom: '1px solid var(--a-border)', marginBottom: '22px' }}>
        <TabButton active={tab === 'cards'} onClick={() => setTab('cards')}>Batch &amp; cards</TabButton>
        <TabButton active={tab === 'serials'} onClick={() => setTab('serials')} disabled={!saved}>
          Serial numbers{saved ? ` (${saved.serialCount.toLocaleString()})` : ''}
        </TabButton>
      </div>

      {tab === 'serials' && saved && (
        <SerialsPanel batch={saved} onBatchChange={(b) => { setSaved(b); setDraft((d) => (dirty ? d : draftFrom(b))) }} />
      )}

      {tab === 'cards' && (
        <div className="flex flex-col gap-6" style={{ paddingBottom: '96px' }}>
          {isNew && copiedFrom && (
            <Notice tone="gold">
              Cards are copied from Batch {copiedFrom} to save typing. Change the details for this batch, or{' '}
              <button
                type="button"
                className="bg-transparent border-none p-0 cursor-pointer underline"
                style={{ color: 'inherit', fontFamily: 'inherit', fontSize: 'inherit' }}
                onClick={() => { update((d) => { d.tiles = [BLANK_TILE()] }); setCopiedFrom(null) }}
              >
                start with a blank card
              </button>.
            </Notice>
          )}

          {/* Batch settings */}
          <section className="admin-panel flex flex-col gap-5" style={{ padding: '18px' }}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[0.95rem]" style={{ fontWeight: 'normal' }}>Batch</h2>
              <LiveBadge live={draft.live} />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Batch number" hint={isNew ? 'The number customers pick on the traceability page.' : undefined}>
                <input
                  className="admin-input"
                  value={draft.id}
                  maxLength={20}
                  placeholder="e.g. 2"
                  onChange={(e) => update((d) => { d.id = e.target.value })}
                />
              </Field>
              <div className="flex flex-col gap-2">
                <span className="admin-label">Show on website</span>
                <Toggle
                  checked={draft.live}
                  onChange={(v) => update((d) => { d.live = v })}
                  onText="Live - customers can trace this batch"
                  offText="Hidden - shows as “not yet available”"
                />
              </div>
            </div>
            {saved && (
              <div style={{ borderTop: '1px solid var(--a-border)', paddingTop: '14px' }}>
                <button type="button" className="admin-btn danger small" onClick={() => setConfirmDelete(true)}>Delete batch</button>
              </div>
            )}
          </section>

          {/* Cards */}
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-[1.05rem]" style={{ color: 'var(--a-gold-text)', fontWeight: 'normal' }}>Timeline cards</h2>
              <p className="text-[0.76rem]" style={{ color: 'var(--a-muted)', marginTop: '4px', lineHeight: 1.5 }}>
                Shown to customers in this order, top to bottom.
              </p>
            </div>
          </div>

          {draft.tiles.map((tile, i) => (
            <CardEditor
              key={i}
              tile={tile}
              index={i}
              count={draft.tiles.length}
              onChange={(fn) => update((d) => fn(d.tiles[i]))}
              onDuplicate={() => update((d) => { d.tiles.splice(i + 1, 0, clone(d.tiles[i])) })}
              onRemove={() => update((d) => { d.tiles.splice(i, 1) })}
            />
          ))}

          <button type="button" className="admin-btn quiet w-full" onClick={() => update((d) => { d.tiles.push(BLANK_TILE()) })}>
            <Icon name="add" size={18} /> Add card
          </button>
        </div>
      )}

      {/* Publish bar */}
      {tab === 'cards' && (
        <div
          className="fixed left-0 right-0 bottom-0 z-30 flex justify-center px-5 md:px-8"
          style={{ background: 'rgba(255,255,255,0.96)', borderTop: '1px solid var(--a-border)', backdropFilter: 'blur(8px)', paddingTop: '12px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="w-full max-w-[880px] flex items-center justify-between gap-3">
            <span className="text-[0.78rem]" style={{ color: dirty ? 'var(--a-gold-text)' : 'var(--a-muted)' }}>
              {dirty ? (isNew ? 'Not published yet' : 'Unpublished changes') : 'All changes published'}
            </span>
            <button type="button" className="admin-btn primary" disabled={!dirty} onClick={openPreview}>
              Preview &amp; publish
            </button>
          </div>
        </div>
      )}

      {previewing && (
        <PreviewOverlay
          draft={draft}
          publishing={publishing}
          onBack={() => setPreviewing(false)}
          onConfirm={publish}
        />
      )}

      {confirmLeave && (
        <Dialog
          title="Leave without publishing?"
          onClose={() => setConfirmLeave(false)}
          actions={(
            <>
              <button type="button" className="admin-btn quiet" onClick={() => setConfirmLeave(false)}>Keep editing</button>
              <button type="button" className="admin-btn danger" onClick={() => navigate('/admin')}>Discard changes</button>
            </>
          )}
        >
          <p>Your changes haven't been published. If you leave now they'll be lost.</p>
        </Dialog>
      )}

      {confirmDelete && saved && (
        <Dialog
          title={`Delete Batch ${saved.id}?`}
          onClose={() => setConfirmDelete(false)}
          actions={(
            <>
              <button type="button" className="admin-btn quiet" onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button type="button" className="admin-btn danger" onClick={deleteBatch}>Delete batch</button>
            </>
          )}
        >
          <p>
            This removes Batch {saved.id}, its {saved.tiles.length} cards and {saved.serialCount.toLocaleString()} serial numbers from the website. It can't be undone.
          </p>
          <p style={{ color: 'var(--a-muted)' }}>
            To keep a copy, use “Download all data” on the batches page first. To just hide it from customers, switch “Show on website” off instead.
          </p>
        </Dialog>
      )}
    </AdminPage>
  )
}

function TabButton({ active, disabled, onClick, children }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      disabled={disabled}
      onClick={onClick}
      title={disabled ? 'Publish the batch first, then add serial numbers' : undefined}
      className="bg-transparent border-none cursor-pointer text-[0.85rem] disabled:cursor-not-allowed"
      style={{
        fontFamily: 'inherit',
        padding: '10px 14px',
        marginBottom: '-1px',
        color: disabled ? 'rgba(0,0,0,0.3)' : active ? 'var(--a-gold-text)' : 'var(--a-muted)',
        borderBottom: `2px solid ${active ? 'var(--a-gold)' : 'transparent'}`,
      }}
    >
      {children}
    </button>
  )
}

function Toggle({ checked, onChange, onText, offText }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 bg-transparent border-none cursor-pointer p-0 text-left"
      style={{ fontFamily: 'inherit', minHeight: '46px' }}
    >
      <span
        style={{
          width: '44px', height: '26px', borderRadius: '13px', flexShrink: 0, position: 'relative',
          background: checked ? 'var(--a-gold)' : '#d9d5cb', transition: 'background-color 0.2s ease',
        }}
      >
        <span
          style={{
            position: 'absolute', top: '3px', left: checked ? '21px' : '3px', width: '20px', height: '20px',
            borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.2)', transition: 'left 0.2s ease',
          }}
        />
      </span>
      <span className="text-[0.82rem]" style={{ color: 'var(--a-text)' }}>{checked ? onText : offText}</span>
    </button>
  )
}

function IconButton({ label, icon, onClick, disabled, danger }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center bg-transparent cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
      style={{
        width: '34px', height: '34px', borderRadius: '4px', border: '1px solid var(--a-border)',
        color: danger ? 'var(--a-danger)' : 'var(--a-text)', flexShrink: 0, fontFamily: 'inherit',
      }}
    >
      <Icon name={icon} size={18} />
    </button>
  )
}

function CardEditor({ tile, index, count, onChange, onDuplicate, onRemove }) {
  const [confirmRemove, setConfirmRemove] = useState(false)
  const siteTile = useMemo(() => toSiteTile(tile), [tile])
  const setEntry = (j, fn) => onChange((t) => fn(t.entries[j]))
  const moveEntry = (j, dir) => onChange((t) => { const [e] = t.entries.splice(j, 1); t.entries.splice(j + dir, 0, e) })

  const cardActions = (
    <>
      <IconButton label="Duplicate card" icon="contentCopy" onClick={onDuplicate} />
      <IconButton label="Remove card" icon="delete" danger disabled={count === 1} onClick={() => setConfirmRemove(true)} />
    </>
  )

  return (
    <section className="admin-panel" style={{ overflow: 'hidden' }}>
      {/* Card header */}
      <div className="flex flex-col gap-2" style={{ padding: '14px 16px', borderBottom: '1px solid var(--a-border)', background: 'var(--a-surface)' }}>
      {/* Label lines up with the title box: 28px number badge + 12px gap */}
      <label htmlFor={`card-${index}-title`} className="admin-label" style={{ marginLeft: '40px' }}>Process</label>
      <div className="flex items-center gap-3">
        <span
          className="flex items-center justify-center text-[0.8rem]"
          style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--a-gold)', color: 'var(--a-gold-text)', flexShrink: 0 }}
        >
          {index + 1}
        </span>
        <input
          className="admin-input"
          id={`card-${index}-title`}
          placeholder="Card title, e.g. Collection of Herbs"
          value={tile.title}
          maxLength={80}
          onChange={(e) => onChange((t) => { t.title = e.target.value })}
          style={{ color: 'var(--a-gold-text)', fontSize: '1rem' }}
        />
        <div className="hidden md:flex gap-1">{cardActions}</div>
      </div>
      </div>
      <div className="flex md:hidden gap-1 justify-end" style={{ padding: '8px 16px 0' }}>{cardActions}</div>

      {/* Entries: label, place, geo coordinates */}
      <div className="flex flex-col gap-4" style={{ padding: '16px' }}>
        {tile.entries.map((entry, j) => (
          <div key={j} className="flex flex-col gap-2" style={{ paddingBottom: '14px', borderBottom: '1px dashed var(--a-border)' }}>
            <div className="flex items-center justify-between gap-2">
              <span className="admin-label">Entry {j + 1}</span>
              <div className="flex gap-1">
                {/* One arrow is enough to reorder: the first entry can move
                    down, every other entry can move up. */}
                {tile.entries.length > 1 && (j === 0
                  ? <IconButton label="Move entry down" icon="arrowDownward" onClick={() => moveEntry(j, 1)} />
                  : <IconButton label="Move entry up" icon="arrowUpward" onClick={() => moveEntry(j, -1)} />)}
                <IconButton label="Remove entry" icon="delete" danger onClick={() => onChange((t) => { t.entries.splice(j, 1) })} />
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-[1fr_1.3fr_1fr]">
              <Field label="Label">
                <input
                  className="admin-input"
                  placeholder="e.g. Sourced from"
                  value={entry.label}
                  maxLength={60}
                  onChange={(e) => setEntry(j, (x) => { x.label = e.target.value })}
                />
              </Field>
              <Field label="Place or name">
                <input
                  className="admin-input"
                  placeholder="e.g. Memberchuk, Dhemaji"
                  value={entry.place}
                  maxLength={120}
                  onChange={(e) => setEntry(j, (x) => { x.place = e.target.value })}
                  style={{ color: 'var(--a-gold-text)' }}
                />
              </Field>
              <Field label="Geo coordinates">
                <input
                  className="admin-input"
                  placeholder="e.g. 27.57°N, 94.74°E"
                  value={entry.coords}
                  maxLength={120}
                  onChange={(e) => setEntry(j, (x) => { x.coords = e.target.value })}
                />
              </Field>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="admin-btn small self-start"
          disabled={tile.entries.length >= MAX_ENTRIES}
          onClick={() => onChange((t) => { t.entries.push(BLANK_ENTRY()) })}
        >
          <Icon name="add" size={18} /> Add entry
        </button>
      </div>

      {/* Footer strip */}
      <div className="flex flex-col gap-2" style={{ padding: '16px', background: 'var(--a-surface)', borderTop: '1px solid var(--a-border)' }}>
        <span className="admin-label">Bottom line (date or duration)</span>
        <div className="grid gap-2 md:grid-cols-[1fr_2.3fr]">
          <input
            className="admin-input"
            aria-label="Bottom line label"
            placeholder="e.g. Collected on"
            value={tile.footer.label}
            maxLength={60}
            onChange={(e) => onChange((t) => { t.footer.label = e.target.value })}
          />
          <input
            className="admin-input"
            aria-label="Bottom line value"
            placeholder="e.g. 09 Oct 2025 or 10 Hours"
            value={tile.footer.value}
            maxLength={120}
            onChange={(e) => onChange((t) => { t.footer.value = e.target.value })}
            style={{ color: 'var(--a-gold-text)' }}
          />
        </div>
      </div>

      {/* Live preview of this card, exactly as customers see it */}
      <div className="flex flex-col gap-3" style={{ padding: '16px', background: '#000', borderTop: '1px solid var(--a-border)' }}>
        <span className="admin-label" style={{ color: 'rgba(255,255,255,0.5)' }}>Live preview</span>
        <div className="w-full md:w-[401.59px] self-center">
          <SourceCard tile={siteTile.title ? siteTile : { ...siteTile, title: 'Card title' }} isActive />
        </div>
      </div>

      {confirmRemove && (
        <Dialog
          title={`Remove card ${index + 1}?`}
          onClose={() => setConfirmRemove(false)}
          actions={(
            <>
              <button type="button" className="admin-btn quiet" onClick={() => setConfirmRemove(false)}>Cancel</button>
              <button type="button" className="admin-btn danger" onClick={() => { setConfirmRemove(false); onRemove() }}>Remove card</button>
            </>
          )}
        >
          <p>“{tile.title || 'Untitled card'}” will be removed from this batch when you publish.</p>
        </Dialog>
      )}
    </section>
  )
}

// Full-screen, dark preview using the real timeline component, so what the
// owner approves is exactly what customers will see.
function PreviewOverlay({ draft, publishing, onBack, onConfirm }) {
  const scrollRef = useRef(null)
  const tiles = useMemo(() => draft.tiles.map(toSiteTile), [draft.tiles])

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [])

  return (
    <div ref={scrollRef} className="fixed inset-0 z-40 overflow-y-auto" style={{ background: '#000' }}>
      <div
        className="admin-light sticky top-0 z-10 flex justify-center px-5 md:px-8"
        style={{ minHeight: 0, borderBottom: '1px solid var(--a-border)', paddingTop: 'calc(10px + env(safe-area-inset-top, 0px))', paddingBottom: '10px' }}
      >
        <div className="w-full max-w-[880px] flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1">
            <p className="text-[0.9rem]" style={{ color: 'var(--a-gold-text)' }}>
              Preview · Batch {draft.id.trim()} {draft.live ? '' : '(hidden)'}
            </p>
            <p className="text-[0.74rem]" style={{ color: 'var(--a-muted)' }}>
              This is how customers will see it. Check every card, then confirm.
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" className="admin-btn quiet flex-1 md:flex-none" onClick={onBack} disabled={publishing}>Back to editing</button>
            <button type="button" className="admin-btn primary flex-1 md:flex-none" onClick={onConfirm} disabled={publishing}>
              {publishing ? 'Publishing…' : 'Confirm & publish'}
            </button>
          </div>
        </div>
      </div>

      <div className="w-full flex flex-col items-center px-10" style={{ paddingTop: '32px', paddingBottom: TIMELINE_BOTTOM_SPACE }}>
        <div className="w-full max-w-[420px] flex flex-col">
          <TraceabilityTimeline tiles={tiles} scrollRoot={scrollRef} />
        </div>
      </div>
    </div>
  )
}
