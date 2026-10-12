import { useEffect, useMemo, useRef, useState } from 'react'
import { adminApi, downloadFile } from './api'
import { Dialog, Field, Notice, Spinner } from './ui'
import DownloadMenu from './DownloadMenu'
import { SERIAL_FORMATS, buildSerialExport, serialFileName } from './exporters'
import Icon from './icons'
import { ACCEPTED_FILES, normalizeSerial, parseSerialFile, parseSerialText, unique } from './parseSerials'

const SAMPLE = 60

export default function SerialsPanel({ batch, onBatchChange }) {
  const [serials, setSerials] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [lookup, setLookup] = useState('')
  const [mode, setMode] = useState('type')      // how to add: type | file
  const [addList, setAddList] = useState([''])  // one serial per box
  const [review, setReview] = useState(null)    // { action: 'add'|'remove', serials, skipped, source }
  const [busy, setBusy] = useState(false)
  const [reading, setReading] = useState(false)
  const [removeList, setRemoveList] = useState([''])  // one serial per box
  const [confirmRemoveAll, setConfirmRemoveAll] = useState(false)
  const fileInput = useRef(null)

  useEffect(() => {
    setSerials(null)
    adminApi.serials(batch.id).then((b) => setSerials(b.serials)).catch((err) => setError(err.message))
  }, [batch.id])

  const registered = useMemo(() => new Set(serials || []), [serials])

  function startReview(action, parsed, source) {
    const list = unique(parsed.serials)
    if (parsed.warning) {
      setError(parsed.warning)
      return
    }
    if (list.length === 0) {
      setError(parsed.skipped.length
        ? `No serial numbers found. Not recognised: ${parsed.skipped.slice(0, 8).join(', ')}${parsed.skipped.length > 8 ? '…' : ''}`
        : 'No serial numbers found.')
      return
    }
    setError('')
    setReview({ action, serials: list, skipped: parsed.skipped, source })
  }

  async function readFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setReading(true)
    setError('')
    try {
      startReview('add', await parseSerialFile(file), file.name)
    } catch (err) {
      setError(err.message || `Couldn't read ${file.name}.`)
    } finally {
      setReading(false)
    }
  }

  async function confirmReview() {
    setBusy(true)
    try {
      if (review.action === 'add') {
        const r = await adminApi.addSerials(batch.id, review.serials)
        setMessage(`Added ${r.added.toLocaleString()} serial number${r.added === 1 ? '' : 's'} to Batch ${batch.id}.${r.alreadyThere ? ` ${r.alreadyThere.toLocaleString()} were already registered.` : ''}${r.invalidCount ? ` ${r.invalidCount} couldn't be used.` : ''}`)
        onBatchChange(r.batch)
        setAddList([''])
      } else {
        const r = await adminApi.removeSerials(batch.id, review.serials)
        setMessage(`Removed ${r.removed.toLocaleString()} serial number${r.removed === 1 ? '' : 's'}.${r.notFound ? ` ${r.notFound.toLocaleString()} weren't registered.` : ''}`)
        onBatchChange(r.batch)
        setRemoveList([''])
      }
      setReview(null)
      setSerials((await adminApi.serials(batch.id)).serials)
    } catch (err) {
      setReview(null)
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function removeAll() {
    setBusy(true)
    try {
      const r = await adminApi.removeAllSerials(batch.id)
      setMessage(`Removed all ${r.removed.toLocaleString()} serial numbers from Batch ${batch.id}.`)
      onBatchChange(r.batch)
      setSerials([])
    } catch (err) {
      setError(err.message)
    } finally {
      setConfirmRemoveAll(false)
      setBusy(false)
    }
  }

  async function downloadSerials(format) {
    try {
      const file = await buildSerialExport(batch.id, serials, format.key)
      downloadFile(serialFileName(batch.id, format.ext), file, file.type)
    } catch (err) {
      setError(err.message || "Couldn't create the download. Please try again.")
      return false
    }
  }

  const looked = normalizeSerial(lookup)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        {message && <Notice tone="ok" onClose={() => setMessage('')}>{message}</Notice>}
        {error && <Notice tone="error" onClose={() => setError('')}>{error}</Notice>}
      </div>

      {/* Summary + lookup */}
      <section className="admin-panel flex flex-col gap-4" style={{ padding: '18px' }}>
        {serials === null ? <Spinner /> : (
          <>
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <p className="text-[0.95rem]">
                <Gold>'{serials.length.toLocaleString()}'</Gold> serial number{serials.length === 1 ? '' : 's'} registered in <Gold>'Batch {batch.id}'</Gold>
              </p>
              {serials.length > 0 && <DownloadMenu small label="Download list" formats={SERIAL_FORMATS} onPick={downloadSerials} />}
            </div>
            {serials.length === 0 ? (
              <Notice tone="gold">
                No serial numbers yet, so customers can enter <em>any</em> serial for this batch. Once you add serial numbers, only those will be accepted.
              </Notice>
            ) : (
              <Field label="Check a serial number">
                <input className="admin-input" placeholder="e.g. 25" value={lookup} onChange={(e) => setLookup(e.target.value)} />
              </Field>
            )}
            {looked && serials.length > 0 && (
              <Notice tone={registered.has(looked) ? 'ok' : 'info'}>
                {registered.has(looked) ? `✓ ${looked} is registered in Batch ${batch.id}.` : `${looked} is not registered in Batch ${batch.id}.`}
              </Notice>
            )}
            {serials.length > 0 && <SerialList serials={serials} />}
          </>
        )}
      </section>

      {/* Add */}
      <section className="admin-panel flex flex-col gap-4" style={{ padding: '18px' }}>
        <h2 className="text-[1.05rem]" style={{ color: 'var(--a-gold-text)', fontWeight: 'normal' }}>Add serial numbers</h2>
        <div className="flex gap-2">
          <button type="button" className={`admin-btn small ${mode === 'type' ? 'primary' : 'quiet'}`} onClick={() => setMode('type')}>Type</button>
          <button type="button" className={`admin-btn small ${mode === 'file' ? 'primary' : 'quiet'}`} onClick={() => setMode('file')}>Upload a file</button>
        </div>

        {mode === 'type' ? (
          <>
            <SerialBoxes label="Serial numbers to add" values={addList} onChange={setAddList} />
            <p className="text-[0.74rem]" style={{ color: 'var(--a-muted)', lineHeight: 1.55 }}>
              One serial number per box. Use + for another box. A range like 1001-1500 in one box adds all of them.
            </p>
            <button type="button" className="admin-btn primary self-start" disabled={!addList.some((v) => v.trim())} onClick={() => startReview('add', parseSerialText(addList.join('\n')), 'typed list')}>
              Review
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={reading}
              className="flex flex-col items-center justify-center gap-2 cursor-pointer text-center"
              style={{ border: '1.5px dashed #d8c48f', borderRadius: '10px', background: 'var(--a-gold-soft)', padding: '28px 16px', fontFamily: 'inherit', color: 'var(--a-text)' }}
            >
              <Icon name="upload" size={28} style={{ color: 'var(--a-gold-text)' }} />
              <span className="text-[0.95rem]" style={{ color: 'var(--a-gold-text)' }}>{reading ? 'Reading file…' : 'Choose a file'}</span>
              <span className="text-[0.75rem]" style={{ color: 'var(--a-muted)' }}>Excel (.xlsx), CSV, text or PDF</span>
            </button>
            <input ref={fileInput} type="file" accept={ACCEPTED_FILES} hidden onChange={readFile} />
            <p className="text-[0.74rem]" style={{ color: 'var(--a-muted)', lineHeight: 1.55 }}>
              Excel and CSV: put serial numbers in one column. If a column's heading contains “serial”, only that column is read; otherwise the first column.
              PDF: works for PDFs made on a computer (e.g. saved from Excel or Word), not scans or photos. You'll see everything found before anything is saved.
            </p>
          </>
        )}
      </section>

      {/* Remove */}
      {serials && serials.length > 0 && (
        <details className="admin-panel" style={{ padding: '18px' }}>
          <summary className="cursor-pointer text-[1.05rem] flex items-center justify-between gap-3 list-none [&::-webkit-details-marker]:hidden" style={{ color: 'var(--a-gold-text)' }}>
            Remove serial numbers
            <Icon name="arrowForwardIos" size={14} style={{ color: 'var(--a-muted)', transform: 'rotate(90deg)' }} />
          </summary>
          <div className="flex flex-col gap-4" style={{ marginTop: '14px' }}>
            <SerialBoxes label="Serial numbers to remove" values={removeList} onChange={setRemoveList} />
            <div className="flex flex-col md:flex-row gap-2">
              <button type="button" className="admin-btn danger" disabled={!removeList.some((v) => v.trim())} onClick={() => startReview('remove', parseSerialText(removeList.join('\n')), 'typed list')}>
                Review removal
              </button>
              <button type="button" className="admin-btn danger" onClick={() => setConfirmRemoveAll(true)}>Remove all serial numbers</button>
            </div>
          </div>
        </details>
      )}

      {review && (
        <ReviewDialog
          review={review}
          registered={registered}
          batchId={batch.id}
          busy={busy}
          onCancel={() => setReview(null)}
          onConfirm={confirmReview}
        />
      )}

      {confirmRemoveAll && (
        <Dialog
          title={`Remove all serial numbers from Batch ${batch.id}?`}
          onClose={() => !busy && setConfirmRemoveAll(false)}
          actions={(
            <>
              <button type="button" className="admin-btn quiet" disabled={busy} onClick={() => setConfirmRemoveAll(false)}>Cancel</button>
              <button type="button" className="admin-btn danger" disabled={busy} onClick={removeAll}>Remove all {serials.length.toLocaleString()}</button>
            </>
          )}
        >
          <p>All {serials.length.toLocaleString()} serial numbers will be removed. After that, customers can enter any serial number for this batch until you add new ones.</p>
          <p style={{ color: 'var(--a-muted)' }}>Tip: use “Download list” first to keep a copy.</p>
        </Dialog>
      )}
    </div>
  )
}

function ReviewDialog({ review, registered, batchId, busy, onCancel, onConfirm }) {
  const isAdd = review.action === 'add'
  const changing = review.serials.filter((s) => registered.has(s) !== isAdd)
  const effective = changing.length
  const unchanged = review.serials.filter((s) => registered.has(s) === isAdd)

  return (
    <Dialog
      title={isAdd ? 'Check before adding' : 'Check before removing'}
      onClose={() => !busy && onCancel()}
      actions={(
        <>
          <button type="button" className="admin-btn quiet" disabled={busy} onClick={onCancel}>Cancel</button>
          <button type="button" className={`admin-btn ${isAdd ? 'primary' : 'danger'}`} disabled={busy || effective === 0} onClick={onConfirm}>
            {busy ? 'Saving…' : `${isAdd ? 'Confirm & add' : 'Confirm & remove'} ${effective === 1 ? changing[0] : `${effective.toLocaleString()} serials`}`}
          </button>
        </>
      )}
    >
      <p style={{ color: 'var(--a-muted)' }}>From: {review.source}</p>
      {/* Name the serial when there's only one, so the sentence can't be
          misread ("1 will be added to Batch 1"). */}
      <p className="text-[0.92rem]">
        {effective === 0
          ? (isAdd ? `Nothing new to add - ${review.serials.length === 1 ? 'this serial is' : 'these serials are'} already in Batch ${batchId}.` : `None of these serials are in Batch ${batchId}.`)
          : <>
              {effective === 1 ? <>Serial <Gold>{changing[0]}</Gold></> : <><Gold>{effective.toLocaleString()}</Gold> serial numbers</>}
              {isAdd ? ` will be added to Batch ${batchId}.` : ` will be removed from Batch ${batchId}.`}
            </>}
      </p>
      {effective > 0 && unchanged.length > 0 && (
        <Notice tone="info">
          {isAdd ? `Already in Batch ${batchId}, skipped: ` : `Not in Batch ${batchId}, skipped: `}
          {unchanged.slice(0, 8).join(', ')}{unchanged.length > 8 ? ` and ${(unchanged.length - 8).toLocaleString()} more` : ''}
        </Notice>
      )}
      {review.skipped.length > 0 && (
        <Notice tone="gold">
          {review.skipped.length.toLocaleString()} item{review.skipped.length === 1 ? '' : 's'} didn't look like serial numbers and will be ignored: {review.skipped.slice(0, 6).join(', ')}{review.skipped.length > 6 ? '…' : ''}
        </Notice>
      )}
      <div>
        <span className="admin-label">{review.serials.length > SAMPLE ? `First ${SAMPLE} serial numbers` : 'Serial numbers'}</span>
        <div className="flex flex-wrap gap-1.5" style={{ marginTop: '8px', maxHeight: '160px', overflowY: 'auto' }}>
          {review.serials.slice(0, SAMPLE).map((s) => (
            <span
              key={s}
              className="text-[0.75rem]"
              style={{
                padding: '3px 8px', borderRadius: '4px', fontVariantNumeric: 'tabular-nums',
                border: '1px solid var(--a-border)',
                color: registered.has(s) === isAdd ? 'var(--a-muted)' : 'var(--a-text)',
                textDecoration: registered.has(s) === isAdd ? 'line-through' : 'none',
              }}
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </Dialog>
  )
}

function Gold({ children }) {
  return <strong style={{ fontWeight: 'normal', color: 'var(--a-gold-text)' }}>{children}</strong>
}

// A column of small boxes, one serial number each, with + below for another
// box.
// Pasting a list into a box spreads it over several boxes.
function SerialBoxes({ label, values, onChange }) {
  const set = (i, v) => onChange(values.map((x, j) => (j === i ? v : x)))

  function paste(i, e) {
    const parts = e.clipboardData.getData('text').split(/[\s,;]+/).filter(Boolean)
    if (parts.length < 2) return
    e.preventDefault()
    const next = [...values]
    next.splice(i, 1, ...parts)
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="admin-label">{label}</span>
      {/* Boxes stack downwards, one per line */}
      <div className="flex flex-col items-start gap-2">
        {values.map((value, i) => (
          <div key={i} className="flex items-center gap-1">
            <input
              className="admin-input"
              aria-label={`${label} - box ${i + 1}`}
              placeholder="e.g. 1001"
              value={value}
              maxLength={40}
              autoFocus={i > 0 && i === values.length - 1 && !value}
              onChange={(e) => set(i, e.target.value)}
              onPaste={(e) => paste(i, e)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onChange([...values, '']) } }}
              style={{ width: '150px', fontVariantNumeric: 'tabular-nums' }}
            />
            {values.length > 1 && (
              <button
                type="button"
                aria-label="Remove this box"
                title="Remove this box"
                onClick={() => onChange(values.filter((_, j) => j !== i))}
                className="flex items-center justify-center bg-transparent cursor-pointer"
                style={{ width: '34px', height: '34px', borderRadius: '4px', border: '1px solid var(--a-border)', color: 'var(--a-muted)' }}
              >
                <Icon name="delete" size={18} />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          aria-label="Add another serial number"
          title="Add another serial number"
          onClick={() => onChange([...values, ''])}
          className="admin-btn quiet"
          style={{ width: '46px', padding: 0 }}
        >
          <Icon name="add" size={20} />
        </button>
      </div>
    </div>
  )
}

// The registered serials: the first few, then "View more" opens the full
// list in a scrollable column. Long lists are drawn in steps so a batch with
// thousands of serials stays quick.
const PREVIEW_COUNT = 5
const LIST_STEP = 500

function SerialList({ serials }) {
  const [expanded, setExpanded] = useState(false)
  const [shown, setShown] = useState(LIST_STEP)
  useEffect(() => { setShown(LIST_STEP) }, [serials])

  const visible = expanded ? serials.slice(0, shown) : serials.slice(0, PREVIEW_COUNT)
  const linkStyle = { color: 'var(--a-gold-text)', fontFamily: 'inherit' }

  return (
    <div className="flex flex-col gap-2">
      <span className="admin-label">Registered serial numbers</span>
      <ol
        className="flex flex-col"
        style={{
          border: '1px solid var(--a-border)', borderRadius: '8px', fontVariantNumeric: 'tabular-nums',
          ...(expanded ? { maxHeight: '260px', overflowY: 'auto' } : {}),
        }}
      >
        {visible.map((s, i) => (
          <li
            key={s}
            className="flex items-center gap-3 text-[0.88rem]"
            style={{ padding: '8px 14px', borderTop: i ? '1px solid var(--a-border)' : 'none' }}
          >
            <span className="text-[0.72rem]" style={{ color: 'var(--a-muted)', minWidth: '3.5em' }}>{(i + 1).toLocaleString()}</span>
            {s}
          </li>
        ))}
        {expanded && serials.length > shown && (
          <li style={{ padding: '8px 14px', borderTop: '1px solid var(--a-border)' }}>
            <button type="button" className="bg-transparent border-none p-0 cursor-pointer text-[0.82rem] underline" style={linkStyle} onClick={() => setShown((n) => n + LIST_STEP)}>
              Load {Math.min(LIST_STEP, serials.length - shown).toLocaleString()} more
            </button>
          </li>
        )}
      </ol>
      {serials.length > PREVIEW_COUNT && (
        <button
          type="button"
          className="bg-transparent border-none p-0 cursor-pointer text-[0.82rem] underline self-start"
          style={linkStyle}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'View less' : `View more (${(serials.length - PREVIEW_COUNT).toLocaleString()} more)`}
        </button>
      )}
    </div>
  )
}
