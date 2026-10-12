// Turns whatever the owners give us - typed text, a CSV, an Excel sheet or a
// PDF - into a list of serial numbers. Everything runs in the browser; files
// are never uploaded anywhere. The server normalizes and validates again.

const MAX_RANGE = 200000

// Same rules as the server (server/data.js): case-insensitive, and all-digit
// serials ignore leading zeros.
export function normalizeSerial(raw) {
  let s = String(raw ?? '').trim().toUpperCase().replace(/\s+/g, '')
  if (/^\d+$/.test(s)) s = s.replace(/^0+(?=\d)/, '')
  return s
}

const SERIAL_RE = /^[A-Z0-9][A-Z0-9_/-]{0,39}$/
export function isValidSerial(s) {
  return SERIAL_RE.test(s)
}

// "1-500", "1 to 500", "A100-A150" (same prefix on both sides). Anything else
// with a dash, like "A-17", is a single serial.
const RANGE_RE = /^([A-Z]*)(\d+)\s*(?:-|–|TO)\s*\1?(\d+)$/i

function expandRange(token) {
  const m = token.trim().toUpperCase().match(RANGE_RE)
  if (!m) return null
  const [, prefix, fromText, toText] = m
  const from = Number(fromText)
  const to = Number(toText)
  if (to < from) return { error: `${token} (range goes backwards)` }
  if (to - from + 1 > MAX_RANGE) return { error: `${token} (range is too large)` }
  // Keep zero-padding when both ends are padded the same way: A001-A010.
  const width = fromText.length === toText.length && fromText.startsWith('0') ? fromText.length : 0
  const out = []
  for (let n = from; n <= to; n++) out.push(prefix + (width ? String(n).padStart(width, '0') : String(n)))
  return { serials: out }
}

// Splits free text into serials: one per line, or separated by commas,
// semicolons, tabs or spaces. Ranges are expanded.
export function parseSerialText(text) {
  const tokens = []
  for (const line of String(text).split(/\r?\n/)) {
    // Keep "1 to 500" and "1 - 500" together before splitting on spaces.
    const joined = line.replace(/(\w)\s*(-|–)\s*(\w)/g, '$1-$3').replace(/(\d)\s+to\s+(\w)/gi, '$1-$2')
    for (const t of joined.split(/[,;\t ]+/)) if (t.trim()) tokens.push(t.trim())
  }
  return collect(tokens)
}

function collect(tokens) {
  const serials = []
  const skipped = []
  for (const token of tokens) {
    const range = /\d/.test(token) && /-|–|to/i.test(token) ? expandRange(token) : null
    if (range?.serials) {
      serials.push(...range.serials)
      continue
    }
    if (range?.error) {
      skipped.push(range.error)
      continue
    }
    const s = normalizeSerial(token)
    if (!s) continue
    // Serials always contain a number; words like "Serial" or "Batch" in a
    // pasted list or file are left out.
    if (isValidSerial(s) && /\d/.test(s)) serials.push(s)
    else skipped.push(token)
  }
  return { serials, skipped }
}

// Rows of cells (CSV or Excel). If a header cell mentions "serial", only that
// column is used; otherwise the first column. Header text that isn't a serial
// just ends up in "skipped".
function fromRows(rows) {
  const cleanRows = rows.map((r) => r.map((c) => (c == null ? '' : String(c).trim()))).filter((r) => r.some(Boolean))
  if (cleanRows.length === 0) return { serials: [], skipped: [] }

  let column = 0
  let start = 0
  const headerIndex = cleanRows[0].findIndex((c) => /serial/i.test(c))
  if (headerIndex >= 0) {
    column = headerIndex
    start = 1
  }
  const tokens = cleanRows.slice(start).map((r) => r[column] || '').filter(Boolean)
  return collect(tokens)
}

function parseCsv(text) {
  const firstLine = text.split(/\r?\n/, 1)[0]
  const delimiter = [',', ';', '\t'].reduce((best, d) => (firstLine.split(d).length > firstLine.split(best).length ? d : best), ',')
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === delimiter) { row.push(cell); cell = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += ch
  }
  row.push(cell)
  rows.push(row)
  return rows
}

async function parseExcel(file) {
  const { default: readXlsxFile } = await import('read-excel-file/browser')
  // Keep numbers as written in the sheet so "1001" stays "1001".
  const sheets = await readXlsxFile(file, { parseNumber: (s) => s })
  const serials = []
  const skipped = []
  for (const { data } of sheets) {
    const part = fromRows(data)
    serials.push(...part.serials)
    skipped.push(...part.skipped)
  }
  return { serials, skipped }
}

// Dates and words are left out of PDFs: only tokens with a digit count,
// anything shaped like a date is ignored, and so is a number right after
// "Batch" or "Page".
const DATE_RE = /^\d{1,4}[/.-]\d{1,2}[/.-]\d{1,4}$/

async function parsePdf(file) {
  const pdfjs = await import('pdfjs-dist')
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  const lines = []
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const content = await page.getTextContent()
    let line = ''
    for (const item of content.items) {
      line += `${item.str} `
      if (item.hasEOL) { lines.push(line); line = '' }
    }
    if (line.trim()) lines.push(line)
  }
  await doc.destroy()

  const text = lines.join('\n')
  if (!text.trim()) {
    return { serials: [], skipped: [], warning: 'This PDF has no readable text - it may be a scan or a photo. Please use an Excel or CSV file instead.' }
  }
  const tokens = []
  for (const line of text.split('\n')) {
    const joined = line.replace(/(\w)\s*(-|–)\s*(\w)/g, '$1-$3').replace(/(\d)\s+to\s+(\w)/gi, '$1-$2')
    let previous = ''
    for (const t of joined.split(/[\s,;]+/)) {
      const token = t.replace(/^[^\w]+|[^\w]+$/g, '')
      // "Batch 1", "Page 2" and "of 3" in headings aren't serial numbers.
      const afterLabel = /^(batch|page|of)$/i.test(previous)
      if (token && /\d/.test(token) && !DATE_RE.test(token) && !afterLabel) tokens.push(token)
      if (token) previous = token
    }
  }
  return collect(tokens)
}

export const ACCEPTED_FILES = '.xlsx,.csv,.txt,.pdf'

export async function parseSerialFile(file) {
  const name = file.name.toLowerCase()
  if (name.endsWith('.xlsx')) return parseExcel(file)
  if (name.endsWith('.csv')) return fromRows(parseCsv(await file.text()))
  if (name.endsWith('.txt')) return parseSerialText(await file.text())
  if (name.endsWith('.pdf')) return parsePdf(file)
  if (name.endsWith('.xls')) throw new Error('Old Excel files (.xls) can\'t be read. In Excel, choose File → Save As → Excel Workbook (.xlsx) and upload that.')
  throw new Error('Unsupported file. Use Excel (.xlsx), CSV (.csv), text (.txt) or PDF (.pdf).')
}

// Removes duplicates while keeping the original order.
export function unique(list) {
  return [...new Set(list)]
}
