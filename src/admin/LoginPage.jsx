import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { adminApi } from './api'
import { AdminPage, Field, Notice } from './ui'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notConfigured, setNotConfigured] = useState(false)

  // Already logged in: skip straight to the batches.
  useEffect(() => {
    adminApi.session()
      .then(() => navigate('/admin', { replace: true }))
      .catch((err) => { if (err.body?.configured === false) setNotConfigured(true) })
  }, [navigate])

  async function submit(e) {
    e.preventDefault()
    if (!username.trim() || !password) {
      setError('Enter your username or email and your password.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await adminApi.login(username.trim(), password)
      navigate('/admin', { replace: true })
    } catch (err) {
      if (err.code === 'not-configured') setNotConfigured(true)
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <AdminPage title="Admin login" onBack={() => navigate('/trace')}>
      <div className="flex flex-col items-center text-center" style={{ marginBottom: '28px' }}>
        <img src="/assets/tipo-logo-t.svg" alt="" className="h-20 w-auto" style={{ marginBottom: '4px' }} />
        <h1 className="text-[1.25rem]" style={{ color: 'var(--a-gold-text)', fontWeight: 'normal' }}>Traceability admin</h1>
        <p className="text-[0.82rem]" style={{ color: 'var(--a-muted)', marginTop: '6px' }}>
          Update batch details and serial numbers.
        </p>
      </div>

      {location.state?.expired && !error && (
        <div style={{ marginBottom: '16px' }}><Notice tone="gold">Your session ended. Please log in again.</Notice></div>
      )}
      {notConfigured && (
        <div style={{ marginBottom: '16px' }}>
          <Notice tone="gold">Admin login hasn't been set up on this server yet. Ask the person who manages the hosting to add the admin accounts.</Notice>
        </div>
      )}

      <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <Field label="Username or email">
          <input
            className="admin-input"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </Field>
        <Field label="Password">
          <div style={{ position: 'relative' }}>
            <input
              className="admin-input"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ paddingRight: '64px' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="bg-transparent border-none cursor-pointer text-[0.72rem]"
              style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', padding: '8px', color: 'var(--a-gold-text)', fontFamily: 'inherit' }}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </Field>

        {error && <Notice tone="error">{error}</Notice>}

        <button type="submit" className="admin-btn primary w-full" disabled={busy} style={{ marginTop: '4px' }}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </AdminPage>
  )
}
