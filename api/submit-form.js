import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function buildEmailHtml({ name, email, subject, message }) {
  const rows = [
    ['Name', name],
    ['Email', email],
    ['Subject', subject],
    ['Message', message],
  ]
    .map(([label, value]) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;font-weight:600;white-space:nowrap;vertical-align:top">${label}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;white-space:pre-wrap">${escapeHtml(value || '—')}</td>
      </tr>
    `)
    .join('')

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#0A0A08;padding:24px 32px">
        <h2 style="color:#F7A70C;margin:0;font-size:20px">New Contact Form Submission</h2>
      </div>
      <div style="padding:24px 32px;border:1px solid #eee">
        <table style="width:100%;border-collapse:collapse">${rows}</table>
      </div>
      <p style="color:#999;font-size:12px;padding:0 32px">Submitted via heritagetipo.com</p>
    </div>
  `
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { name, email, subject, message } = req.body || {}

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    const { error } = await resend.emails.send({
      from: 'Tipo Contact <forms@heritagetipo.com>',
      to: 'info@heritagetipo.com',
      replyTo: email,
      subject: `New Contact Form — ${subject || 'No subject'}`,
      html: buildEmailHtml({ name, email, subject, message }),
    })

    if (error) {
      console.error('Resend error:', error)
    }
  } catch (err) {
    console.error('Resend send failed:', err)
  }

  return res.status(200).json({ ok: true })
}
