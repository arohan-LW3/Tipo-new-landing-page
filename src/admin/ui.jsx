import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// Shared pieces of the light admin theme. Styles live in index.css under
// .admin-light so they match the dark site's buttons, fields and spacing.

export function AdminPage({ title, onBack, actions, children, wide }) {
  // The site's html/body are black; switch them to white while an admin page
  // is open so overscroll and short pages don't flash dark edges.
  useEffect(() => {
    const els = [document.documentElement, document.body]
    const previous = els.map((el) => el.style.backgroundColor)
    els.forEach((el) => { el.style.backgroundColor = '#ffffff' })
    return () => els.forEach((el, i) => { el.style.backgroundColor = previous[i] })
  }, [])

  return (
    <div className="admin-light flex flex-col items-center">
      <header
        className="sticky top-0 z-20 w-full flex justify-center px-5 md:px-8"
        style={{
          background: 'rgba(255,255,255,0.94)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid var(--a-border)',
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      >
        <div className={`w-full ${wide ? 'max-w-[880px]' : 'max-w-[560px]'} flex items-center gap-3`} style={{ minHeight: '56px' }}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="flex items-center bg-transparent border-none cursor-pointer p-0"
            >
              {/* Same arrow as the dark pages, darkened for the white header */}
              <img src="/assets/arrow-back.svg" alt="" className="w-6 h-6" style={{ filter: 'invert(1)' }} />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <span className="block truncate text-[0.85rem] tracking-[0.05em]">{title}</span>
          </div>
          {actions}
        </div>
      </header>
      <main className="w-full flex justify-center px-5 md:px-8" style={{ paddingTop: '28px', paddingBottom: '64px' }}>
        <div className={`w-full ${wide ? 'max-w-[880px]' : 'max-w-[560px]'}`}>{children}</div>
      </main>
    </div>
  )
}

export function Field({ label, hint, error, children }) {
  return (
    <label className="flex flex-col gap-2">
      {label && <span className="admin-label">{label}</span>}
      {children}
      {hint && !error && <span className="text-[0.72rem]" style={{ color: 'var(--a-muted)' }}>{hint}</span>}
      {error && <span className="text-[0.72rem]" style={{ color: 'var(--a-danger)' }}>{error}</span>}
    </label>
  )
}

const NOTICE_TONES = {
  info: { bg: 'var(--a-surface)', border: 'var(--a-border)', color: 'var(--a-text)' },
  gold: { bg: 'var(--a-gold-soft)', border: '#f3d48e', color: '#5c3d00' },
  ok: { bg: 'var(--a-ok-soft)', border: '#b9dfc5', color: 'var(--a-ok)' },
  error: { bg: 'var(--a-danger-soft)', border: '#f1c3be', color: 'var(--a-danger)' },
}

export function Notice({ tone = 'info', children, onClose }) {
  const t = NOTICE_TONES[tone]
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className="flex items-start gap-3 text-[0.82rem]"
      style={{ background: t.bg, border: `1px solid ${t.border}`, color: t.color, borderRadius: '8px', padding: '12px 14px', lineHeight: 1.5 }}
    >
      <div className="flex-1">{children}</div>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Dismiss" className="bg-transparent border-none cursor-pointer p-0 text-[1.1rem] leading-none" style={{ color: 'inherit' }}>
          ×
        </button>
      )}
    </div>
  )
}

export function Dialog({ title, children, actions, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="admin-light fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: 'rgba(20,18,14,0.45)', minHeight: 0 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full md:max-w-[480px] flex flex-col gap-4 rounded-t-[14px] md:rounded-[14px]"
        style={{ background: '#fff', padding: '22px 20px calc(20px + env(safe-area-inset-bottom, 0px))', maxHeight: '90dvh', overflowY: 'auto' }}
      >
        <h2 className="text-[1.05rem]" style={{ color: 'var(--a-gold-text)', fontWeight: 'normal' }}>{title}</h2>
        <div className="text-[0.88rem] flex flex-col gap-3" style={{ lineHeight: 1.55 }}>{children}</div>
        <div className="flex flex-col-reverse md:flex-row md:justify-end gap-2" style={{ marginTop: '4px' }}>{actions}</div>
      </div>
    </div>
  )
}

// Keeps admin pages behind the login: any 401 from the API sends the user to
// the login page.
export function useLoggedOutRedirect() {
  const navigate = useNavigate()
  useEffect(() => {
    const onLogout = () => navigate('/admin/login', { replace: true, state: { expired: true } })
    window.addEventListener('tipo-admin-logged-out', onLogout)
    return () => window.removeEventListener('tipo-admin-logged-out', onLogout)
  }, [navigate])
}

export function Spinner({ label = 'Loading…' }) {
  return <p className="text-[0.85rem]" style={{ color: 'var(--a-muted)', padding: '24px 0' }}>{label}</p>
}
