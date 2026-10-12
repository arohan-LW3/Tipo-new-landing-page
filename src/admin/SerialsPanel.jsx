import { useEffect, useMemo, useRef, useState } from 'react'
import { adminApi, downloadFile } from './api'
import { Dialog, Field, Notice, Spinner, useFlag } from './ui'
import Icon from './icons'
import { ACCEPTED_FILES, normalizeSerial, parseSerialFile, parseSerialText, unique } from './parseSerials'

const SAMPLE = 60

export default function SerialsPanel({ batch, onBatchChange }) {
  const [serials, setSerials] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [lookup, setLookup] = useState('')
  const [mode, setMode] = useState('type')      // how to add: type | file
  const [text, setText] = useState('')
  const [review, setReview] = useState(null)    // { action: 'add'|'remove', serials, skipped, source }
  const [busy, setBusy] = useState(false)
  const [reading, setReading] = useState(false)
  const [removeText, setRemoveText] = useState('')
  const [confirmRemoveAll, setConfirmRemoveAll] = useState(false)
  const fileInput = useRef(null)
  const [downloaded, flagDownloaded] = useFlag()

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
        setText('')
      } else {
        const r = await adminApi.removeSerials(batch.id, review.serials)
        setMessage(`Removed ${r.removed.toLocaleString()} serial number${r.removed === 1 ? '' : 's'}.${r.notFound ? ` ${r.notFound.toLocaleString()} weren't registered.` : ''}`)
        onBatchChange(r.batch)
        setRemoveText('')
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

  function downloadCsv() {
    downloadFile(`tipo-batch-${batch.id}-serials.csv`, `Serial number\n${serials.join('\n')}\n`, 'text/csv')
    flagDownloaded()
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
              <p>
                <span className="text-[1.6rem]" style={{ color: 'var(--a-gold-text)' }}>{serials.length.toLocaleString()}</span>{' '}
                <span className="text-[0.85rem]" style={{ color: 'var(--a-muted)' }}>serial numbers registered in Batch {batch.id}</span>
              </p>
              {serials.length > 0 && <button type="button" className="admin-btn quiet small" onClick={downloadCsv}>
                  <Icon name={downloaded ? 'downloadDone' : 'download'} size={18} />
                  {downloaded ? 'Downloaded' : 'Download list (.csv)'}
                </button>}
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
          </>
        )}
      </section>

      {/* Add */}
      <section className="admin-panel flex flex-col gap-4" style={{ padding: '18px' }}>
        <h2 className="text-[1.05rem]" style={{ color: 'var(--a-gold-text)', fontWeight: 'normal' }}>Add serial numbers</h2>
        <div className="flex gap-2">
          <button type="button" className={`admin-btn small ${mode === 'type' ? 'primary' : 'quiet'}`} onClick={() => setMode('type')}>Type or paste</button>
          <button type="button" className={`admin-btn small ${mode === 'file' ? 'primary' : 'quiet'}`} onClick={() => setMode('file')}>Upload a file</button>
        </div>

        {mode === 'type' ? (
          <>
            <Field hint="One per line, or separated by commas or spaces. Ranges work too: 1-500 adds 1 to 500, A001-A050 adds A001 to A050.">
              <textarea
                className="admin-input"
                rows={6}
                placeholder={'1001\n1002\n1003-1500'}
                value={text}
                onChange={(e) => setText(e.target.value)}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              />
            </Field>
            <button type="button" className="admin-btn primary self-start" disabled={!text.trim()} onClick={() => startReview('add', parseSerialText(text), 'typed list')}>
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
          <summary className="cursor-pointer text-[0.95rem]">Remove serial numbers</summary>
          <div className="flex flex-col gap-4" style={{ marginTop: '14px' }}>
            <Field hint="Same format as adding: one per line, commas, or ranges like 1-50.">
              <textarea className="admin-input" rows={4} value={removeText} onChange={(e) => setRemoveText(e.target.value)} />
            </Field>
            <div className="flex flex-col md:flex-row gap-2">
              <button type="button" className="admin-btn danger" disabled={!removeText.trim()} onClick={() => startReview('remove', parseSerialText(removeText), 'typed list')}>
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
  const known = review.serials.filter((s) => registered.has(s)).length
  const effective = isAdd ? review.serials.length - known : known

  return (
    <Dialog
      title={isAdd ? 'Check before adding' : 'Check before removing'}
      onClose={() => !busy && onCancel()}
      actions={(
        <>
          <button type="button" className="admin-btn quiet" disabled={busy} onClick={onCancel}>Cancel</button>
          <button type="button" className={`admin-btn ${isAdd ? 'primary' : 'danger'}`} disabled={busy || effective === 0} onClick={onConfirm}>
            {busy ? 'Saving…' : isAdd ? `Confirm & add ${effective.toLocaleString()}` : `Confirm & remove ${effective.toLocaleString()}`}
          </button>
        </>
      )}
    >
      <p style={{ color: 'var(--a-muted)' }}>From: {review.source}</p>
      <div className="grid grid-cols-2 gap-2">
        <Stat value={review.serials.length} label="found" />
        <Stat
          value={effective}
          label={isAdd ? `new for Batch ${batchId}` : `registered, will be removed`}
          gold
        />
      </div>
      {isAdd && known > 0 && <Notice tone="info">{known.toLocaleString()} already registered - they'll be skipped.</Notice>}
      {!isAdd && review.serials.length - known > 0 && (
        <Notice tone="info">{(review.serials.length - known).toLocaleString()} aren't registered in this batch - nothing to remove for those.</Notice>
      )}
      {review.skipped.length > 0 && (
        <Notice tone="gold">
          {review.skipped.length.toLocaleString()} item{review.skipped.length === 1 ? '' : 's'} didn't look like serial numbers and will be ignored: {review.skipped.slice(0, 6).join(', ')}{review.skipped.length > 6 ? '…' : ''}
        </Notice>
      )}
      <div>
        <span className="admin-label">{review.serials.length > SAMPLE ? `First ${SAMPLE}` : 'All'}</span>
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

function Stat({ value, label, gold }) {
  return (
    <div style={{ border: '1px solid var(--a-border)', borderRadius: '8px', padding: '10px 12px', background: gold ? 'var(--a-gold-soft)' : 'var(--a-surface)' }}>
      <p className="text-[1.3rem]" style={{ color: gold ? 'var(--a-gold-text)' : 'var(--a-text)' }}>{value.toLocaleString()}</p>
      <p className="text-[0.72rem]" style={{ color: 'var(--a-muted)' }}>{label}</p>
    </div>
  )
}
