import { useState, useLayoutEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const inputClass = "w-full bg-white/5 border border-white/10 rounded-[4px] px-4 py-3.5 text-[0.95rem] text-white placeholder:text-white/30 outline-none focus:border-[#F7A70C] transition-colors"

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <label className="text-[0.65rem] tracking-[0.08em] uppercase text-white/40">
        {label}
      </label>
      {children}
    </div>
  )
}

export default function ContactPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | success | error

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch('/api/submit-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      })
      if (res.ok) {
        setStatus('success')
        setName('')
        setEmail('')
        setSubject('')
        setMessage('')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="min-h-dvh bg-[#0a0a0a] flex flex-col">
      {/* Sticky header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-center bg-[#0a0a0a]/95 backdrop-blur-sm px-10 md:px-6 shrink-0"
        style={{ height: '56px', paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="w-full max-w-[420px] md:max-w-[560px] flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center mr-4 bg-transparent border-none cursor-pointer p-0"
          >
            <img src="/assets/arrow-back.svg" alt="Back" className="w-6 h-6" />
          </button>
          <span className="text-white text-[0.85rem] tracking-[0.05em]">Contact Us</span>
        </div>
      </div>

      <div className="w-full flex flex-col items-center px-10 md:px-6" style={{ paddingTop: '32px', paddingBottom: '48px' }}>
        <div className="w-full max-w-[420px] md:max-w-[560px] flex flex-col items-center">

          {status === 'success' ? (
            <div className="w-full text-center py-12 border border-[#F7A70C]/40 rounded-[4px]">
              <p className="text-[#F7A70C] text-[1.05rem] mb-2">Message sent</p>
              <p className="text-white/50 text-[0.8rem]">Thanks for reaching out — we'll reply soon.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5">
              <Field label="Name">
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className={inputClass}
                />
              </Field>

              <Field label="Email">
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className={inputClass}
                />
              </Field>

              <Field label="Subject">
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="How can we help?"
                  className={inputClass}
                />
              </Field>

              <Field label="Message">
                <textarea
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us more..."
                  className={`${inputClass} resize-none`}
                />
              </Field>

              <button
                type="submit"
                disabled={status === 'sending'}
                className="tipo-btn w-full h-[48px] border rounded-[4px] text-[0.85rem] tracking-wide bg-transparent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {status === 'sending' ? 'Sending…' : 'Send Message'}
              </button>

              {status === 'error' && (
                <p className="text-[#E60004] text-[0.75rem] text-center">
                  Something went wrong. Please try again.
                </p>
              )}
            </form>
          )}

        </div>
      </div>
    </div>
  )
}
