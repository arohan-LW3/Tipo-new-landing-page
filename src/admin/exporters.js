import { rowsToEntries } from './entries'

// Builds the "Download all data" files from an export (the same object the
// JSON backup holds). Everything is made in the browser.

export const EXPORT_FORMATS = [
  { key: 'json', label: 'JSON', ext: 'json', text: 'Backup file. The only format that can be uploaded back.' },
  { key: 'csv', label: 'CSV', ext: 'csv', text: 'Opens in Excel. Every card entry and serial number as rows.' },
  { key: 'pdf', label: 'PDF', ext: 'pdf', text: 'Readable report of all batches, to print or share.' },
  { key: 'zip', label: 'ZIP', ext: 'zip', text: 'All three files above in one download.' },
]

const MIME = { json: 'application/json', csv: 'text/csv', pdf: 'application/pdf', zip: 'application/zip' }

export function fileName(exp, ext) {
  return `tipo-traceability-${exp.exportedAt.slice(0, 10)}.${ext}`
}

export async function buildExport(exp, format) {
  if (format === 'json') return blob(JSON.stringify(exp, null, 2), 'json')
  if (format === 'csv') return blob(buildCsv(exp), 'csv')
  if (format === 'pdf') return blob(await buildPdf(exp), 'pdf')
  if (format === 'zip') return blob(await buildZip(exp), 'zip')
  throw new Error(`Unknown format ${format}`)
}

function blob(content, ext) {
  return new Blob([content], { type: MIME[ext] })
}

// ---------- CSV ----------

const cell = (v) => {
  const s = String(v ?? '')
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// One table, filterable in Excel by the first column: "Card" rows hold the
// timeline details, "Serial" rows the serial numbers.
function buildCsv(exp) {
  const header = ['Type', 'Batch', 'Shown on website', 'Card no.', 'Process', 'Label', 'Place or name', 'Geo coordinates', 'Bottom line', 'Bottom line value', 'Serial number']
  const lines = [header]
  for (const b of exp.data.batches) {
    const live = b.live ? 'Yes' : 'No'
    b.tiles.forEach((tile, i) => {
      const entries = rowsToEntries(tile.rows)
      entries.forEach((e) => {
        lines.push(['Card', b.id, live, i + 1, tile.title, e.label, e.place, e.coords, tile.footer.label, tile.footer.value, ''])
      })
    })
    for (const s of b.serials) lines.push(['Serial', b.id, live, '', '', '', '', '', '', '', s])
  }
  // The BOM makes Excel read °, é and other characters correctly.
  return `﻿${lines.map((l) => l.map(cell).join(',')).join('\r\n')}\r\n`
}

// ---------- PDF ----------

const GOLD = [143, 95, 0]      // the admin's readable gold
const TEXT = [26, 26, 26]
const MUTED = [107, 107, 107]

// The PDF's built-in font only covers basic Latin characters (plus é, ° and
// similar); anything else is swapped for a close equivalent.
function pdfText(s) {
  return String(s ?? '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-')
}

async function buildPdf(exp) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 16
  let y = M

  const ensure = (h) => {
    if (y + h > H - M) {
      doc.addPage()
      y = M
    }
  }
  const write = (text, { size = 10, color = TEXT, indent = 0, gap = 1.5, style = 'normal' } = {}) => {
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    doc.setTextColor(...color)
    const lines = doc.splitTextToSize(pdfText(text), W - M * 2 - indent)
    const lh = size * 0.42
    for (const line of lines) {
      ensure(lh)
      doc.text(line, M + indent, y + lh * 0.8)
      y += lh
    }
    y += gap
  }

  write('Tipo traceability data', { size: 18, color: GOLD, gap: 1 })
  write(`Exported ${new Date(exp.exportedAt).toLocaleString()}`, { size: 9, color: MUTED, gap: 6 })

  exp.data.batches.forEach((b, bi) => {
    if (bi > 0) {
      ensure(30)
      doc.setDrawColor(228, 225, 217)
      doc.line(M, y, W - M, y)
      y += 6
    }
    write(`Batch ${b.id}`, { size: 15, color: GOLD, gap: 0.5 })
    write(`${b.live ? 'Live on website' : 'Hidden from website'}  ·  ${b.tiles.length} cards  ·  ${b.serials.length.toLocaleString()} serial numbers`, { size: 9, color: MUTED, gap: 4 })

    b.tiles.forEach((tile, i) => {
      ensure(14)
      write(`${i + 1}. ${tile.title}`, { size: 11.5, style: 'bold', gap: 1 })
      for (const e of rowsToEntries(tile.rows)) {
        const place = [e.place, e.coords && `(${e.coords})`].filter(Boolean).join(' ')
        write(e.label ? `${e.label}: ${place}` : place, { indent: 5, gap: 0.6 })
      }
      if (tile.footer.label || tile.footer.value) {
        write(`${tile.footer.label}${tile.footer.label && tile.footer.value ? ': ' : ''}${tile.footer.value}`, { indent: 5, color: MUTED, gap: 0.6 })
      }
      y += 2.5
    })

    ensure(12)
    write(`Serial numbers (${b.serials.length.toLocaleString()})`, { size: 11.5, style: 'bold', gap: 1 })
    write(b.serials.length ? b.serials.join(', ') : 'None yet - any serial number is accepted for this batch.', { size: 9, indent: 5, color: b.serials.length ? TEXT : MUTED, gap: 6 })
  })

  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text(`Page ${p} of ${pages}`, W - M, H - 8, { align: 'right' })
  }
  return doc.output('arraybuffer')
}

// ---------- ZIP ----------

async function buildZip(exp) {
  const { zipSync, strToU8 } = await import('fflate')
  return zipSync({
    [fileName(exp, 'json')]: strToU8(JSON.stringify(exp, null, 2)),
    [fileName(exp, 'csv')]: strToU8(buildCsv(exp)),
    [fileName(exp, 'pdf')]: new Uint8Array(await buildPdf(exp)),
  })
}
