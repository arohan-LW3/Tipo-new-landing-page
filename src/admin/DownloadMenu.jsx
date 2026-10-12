import { useEffect, useRef, useState } from 'react'
import Icon from './icons'
import { useFlag } from './ui'

// A download button that opens a list of formats. `onPick(format)` builds and
// saves the file; while it runs the button shows "Preparing…", and after it
// the download-done tick.
export default function DownloadMenu({ label, formats, onPick, small, openUp }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, flagDone] = useFlag()
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function pick(format) {
    setOpen(false)
    setBusy(true)
    try {
      if ((await onPick(format)) !== false) flagDone()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className={`admin-btn w-full ${small ? 'quiet small' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name={done ? 'downloadDone' : 'download'} size={18} />
        {busy ? 'Preparing…' : done ? 'Downloaded' : label}
      </button>
      {open && (
        <div
          role="menu"
          className="admin-panel flex flex-col"
          style={{
            position: 'absolute',
            [openUp ? 'bottom' : 'top']: 'calc(100% + 6px)',
            ...(openUp ? { left: 0 } : { right: 0 }),
            zIndex: 20,
            width: 'min(320px, calc(100vw - 40px))',
            padding: '6px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          }}
        >
          {formats.map((f) => (
            <button
              key={f.key}
              type="button"
              role="menuitem"
              onClick={() => pick(f)}
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
  )
}
