import { rowsToEntries } from './entries'

// Builds the download files: "Download all data" (every batch) and the
// serial list of one batch. Everything is made in the browser.

export const EXPORT_FORMATS = [
  { key: 'json', label: 'JSON', ext: 'json', text: 'Backup file. The only format that can be uploaded back.' },
  { key: 'xlsx', label: 'Excel', ext: 'xlsx', text: 'Two sheets: card details and serial numbers.' },
  { key: 'csv', label: 'CSV', ext: 'csv', text: 'Every card entry and serial number as rows.' },
  { key: 'pdf', label: 'PDF', ext: 'pdf', text: 'Readable report of all batches, to print or share.' },
  { key: 'zip', label: 'ZIP', ext: 'zip', text: 'All of the above in one download.' },
]

export const SERIAL_FORMATS = [
  { key: 'xlsx', label: 'Excel', ext: 'xlsx', text: 'One serial number per row.' },
  { key: 'csv', label: 'CSV', ext: 'csv', text: 'One serial number per row, for any spreadsheet.' },
  { key: 'pdf', label: 'PDF', ext: 'pdf', text: 'The list as a document, to print or share.' },
  { key: 'txt', label: 'Text', ext: 'txt', text: 'Plain list, one serial number per line.' },
]

const MIME = {
  json: 'application/json',
  csv: 'text/csv',
  txt: 'text/plain',
  pdf: 'application/pdf',
  zip: 'application/zip',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

const blob = (content, ext) => new Blob([content], { type: MIME[ext] })
const day = (iso) => iso.slice(0, 10)

// ---------- All data ----------

export function fileName(exp, ext) {
  return `tipo-traceability-${day(exp.exportedAt)}.${ext}`
}

export async function buildExport(exp, format) {
  if (format === 'json') return blob(JSON.stringify(exp, null, 2), 'json')
  if (format === 'csv') return blob(toCsv(allDataRows(exp)), 'csv')
  if (format === 'xlsx') return blob(await allDataXlsx(exp), 'xlsx')
  if (format === 'pdf') return blob(await allDataPdf(exp), 'pdf')
  if (format === 'zip') return blob(await allDataZip(exp), 'zip')
  throw new Error(`Unknown format ${format}`)
}

const CARD_HEADER = ['Batch', 'Shown on website', 'Card no.', 'Process', 'Label', 'Place or name', 'Geo coordinates', 'Bottom line', 'Bottom line value']

function cardRows(exp) {
  const rows = []
  for (const b of exp.data.batches) {
    b.tiles.forEach((tile, i) => {
      for (const e of rowsToEntries(tile.rows)) {
        rows.push([b.id, b.live ? 'Yes' : 'No', i + 1, tile.title, e.label, e.place, e.coords, tile.footer.label, tile.footer.value])
      }
    })
  }
  return rows
}

function serialRows(exp) {
  return exp.data.batches.flatMap((b) => b.serials.map((s) => [b.id, s]))
}

// One CSV table, filterable in Excel by the first column: "Card" rows hold
// the timeline details, "Serial" rows the serial numbers.
function allDataRows(exp) {
  const blank = CARD_HEADER.slice(1).map(() => '')
  return [
    ['Type', ...CARD_HEADER, 'Serial number'],
    ...cardRows(exp).map((r) => ['Card', ...r, '']),
    ...serialRows(exp).map(([batch, s]) => ['Serial', batch, ...blank, s]),
  ]
}

async function allDataXlsx(exp) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  return writeXlsxFile([
    { sheet: 'Cards', data: [boldRow(CARD_HEADER), ...cardRows(exp)], columns: [8, 10, 8, 28, 18, 28, 22, 16, 16].map((width) => ({ width })), stickyRowsCount: 1 },
    { sheet: 'Serial numbers', data: [boldRow(['Batch', 'Serial number']), ...serialRows(exp)], columns: [{ width: 10 }, { width: 18 }], stickyRowsCount: 1 },
  ]).toBlob()
}

async function allDataPdf(exp) {
  const pdf = await startPdf()
  pdf.write('Tipo traceability data', { size: 18, color: GOLD, gap: 1 })
  pdf.write(`Exported ${new Date(exp.exportedAt).toLocaleString()}`, { size: 9, color: MUTED, gap: 6 })

  exp.data.batches.forEach((b, bi) => {
    if (bi > 0) pdf.rule()
    pdf.write(`Batch ${b.id}`, { size: 15, color: GOLD, gap: 0.5 })
    pdf.write(`${b.live ? 'Live on website' : 'Hidden from website'}  ·  ${b.tiles.length} cards  ·  ${b.serials.length.toLocaleString()} serial numbers`, { size: 9, color: MUTED, gap: 4 })

    b.tiles.forEach((tile, i) => {
      pdf.ensure(14)
      pdf.write(`${i + 1}. ${tile.title}`, { size: 11.5, style: 'bold', gap: 1 })
      for (const e of rowsToEntries(tile.rows)) {
        const place = [e.place, e.coords && `(${e.coords})`].filter(Boolean).join(' ')
        pdf.write(e.label ? `${e.label}: ${place}` : place, { indent: 5, gap: 0.6 })
      }
      if (tile.footer.label || tile.footer.value) {
        pdf.write(`${tile.footer.label}${tile.footer.label && tile.footer.value ? ': ' : ''}${tile.footer.value}`, { indent: 5, color: MUTED, gap: 0.6 })
      }
      pdf.space(2.5)
    })

    pdf.ensure(12)
    pdf.write(`Serial numbers (${b.serials.length.toLocaleString()})`, { size: 11.5, style: 'bold', gap: 1 })
    pdf.write(b.serials.length ? b.serials.join(', ') : 'None yet - any serial number is accepted for this batch.', { size: 9, indent: 5, color: b.serials.length ? TEXT : MUTED, gap: 6 })
  })
  return pdf.finish()
}

async function allDataZip(exp) {
  const { zipSync, strToU8 } = await import('fflate')
  const bytes = async (b) => new Uint8Array(await b.arrayBuffer())
  return zipSync({
    [fileName(exp, 'json')]: strToU8(JSON.stringify(exp, null, 2)),
    [fileName(exp, 'xlsx')]: await bytes(await allDataXlsx(exp)),
    [fileName(exp, 'csv')]: strToU8(toCsv(allDataRows(exp))),
    [fileName(exp, 'pdf')]: new Uint8Array(await allDataPdf(exp)),
  })
}

// ---------- One batch's serial numbers ----------

export function serialFileName(batchId, ext) {
  return `tipo-batch-${batchId}-serials.${ext}`
}

export async function buildSerialExport(batchId, serials, format) {
  if (format === 'csv') return blob(toCsv([['Batch', 'Serial number'], ...serials.map((s) => [batchId, s])]), 'csv')
  if (format === 'txt') return blob(`${serials.join('\r\n')}\r\n`, 'txt')
  if (format === 'xlsx') {
    const { default: writeXlsxFile } = await import('write-excel-file/browser')
    return writeXlsxFile([boldRow(['Batch', 'Serial number']), ...serials.map((s) => [batchId, s])], {
      sheet: `Batch ${batchId}`.slice(0, 31),
      columns: [{ width: 10 }, { width: 18 }],
      stickyRowsCount: 1,
    }).toBlob()
  }
  if (format === 'pdf') {
    const pdf = await startPdf()
    pdf.write(`Tipo · Batch ${batchId} serial numbers`, { size: 18, color: GOLD, gap: 1 })
    pdf.write(`${serials.length.toLocaleString()} serial numbers  ·  ${new Date().toLocaleString()}`, { size: 9, color: MUTED, gap: 6 })
    pdf.write(serials.join(', '), { size: 10, gap: 0 })
    return blob(pdf.finish(), 'pdf')
  }
  throw new Error(`Unknown format ${format}`)
}

// ---------- Helpers ----------

// Serials are passed as strings, so Excel keeps them as text instead of
// turning a long serial into scientific notation.
const boldRow = (cells) => cells.map((value) => ({ value, fontWeight: 'bold' }))

const csvCell = (v) => {
  const s = String(v ?? '')
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// The BOM makes Excel read °, é and other characters correctly.
function toCsv(rows) {
  return `\uFEFF${rows.map((r) => r.map(csvCell).join(',')).join('\r\n')}\r\n`
}

const GOLD = [143, 95, 0]      // the admin's readable gold
const TEXT = [26, 26, 26]
const MUTED = [107, 107, 107]

// The PDF's built-in font covers basic Latin (plus é, ° and similar); curly
// quotes and long dashes are swapped for plain ones.
const pdfText = (s) => String(s ?? '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-')

// A tiny flowing-text writer on top of jsPDF: wraps text, adds pages as
// needed and numbers them at the end.
async function startPdf() {
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

  return {
    ensure,
    space: (h) => { y += h },
    rule: () => {
      ensure(30)
      doc.setDrawColor(228, 225, 217)
      doc.line(M, y, W - M, y)
      y += 6
    },
    write(text, { size = 10, color = TEXT, indent = 0, gap = 1.5, style = 'normal' } = {}) {
      doc.setFont('helvetica', style)
      doc.setFontSize(size)
      doc.setTextColor(...color)
      const lh = size * 0.42
      for (const line of doc.splitTextToSize(pdfText(text), W - M * 2 - indent)) {
        ensure(lh)
        doc.text(line, M + indent, y + lh * 0.8)
        y += lh
      }
      y += gap
    },
    finish() {
      const pages = doc.getNumberOfPages()
      for (let p = 1; p <= pages; p++) {
        doc.setPage(p)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(...MUTED)
        doc.text(`Page ${p} of ${pages}`, W - M, H - 8, { align: 'right' })
      }
      return doc.output('arraybuffer')
    },
  }
}
