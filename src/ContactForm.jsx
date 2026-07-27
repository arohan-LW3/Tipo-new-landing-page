import { useState } from 'react'

const inputClass = "w-full bg-white/5 border border-white/10 rounded-[4px] px-4 py-3.5 text-[0.95rem] text-white placeholder:text-white/30 outline-none focus:border-[#F7A70C] transition-colors"

function Field({ label, required, children }) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <label className="text-[0.65rem] tracking-[0.08em] uppercase text-white/40">
        {label}
        {required && <span className="text-[#F7A70C]"> *</span>}
      </label>
      {children}
    </div>
  )
}

export default function ContactForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | success | error

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
    <div className="w-full">
      {status === 'success' ? (
        <div className="w-full text-center py-12 border border-[#F7A70C]/40 rounded-[4px]">
          <p className="text-[#F7A70C] text-[1.05rem] mb-2">Message sent</p>
          <p className="text-white/50 text-[0.8rem]">Thanks for reaching out — we'll reply soon.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5">
          <Field label="Name" required>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className={inputClass}
            />
          </Field>

          <Field label="Email" required>
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

          <Field label="Message" required>
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
            className="w-full h-[48px] border border-white rounded-[4px] text-[0.85rem] tracking-wide bg-white text-black cursor-pointer transition-colors hover:bg-black hover:text-[#F7A70C] hover:border-[#F7A70C] active:bg-black active:text-[#F7A70C] active:border-[#F7A70C] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
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
  )
}
