export const BLANK_ENTRY = () => ({ label: '', place: '', coords: '' })

// The website stores each card's body as rows: a large gold row (the place or
// name) optionally followed by an unlabelled small row (its coordinates). The
// editor works with "entries" instead - label, place, coordinates - so nobody
// has to think about row styles.
export function rowsToEntries(rows) {
  const entries = []
  for (const row of rows) {
    const last = entries[entries.length - 1]
    if (!row.emphasis && !row.label && last && !last.coords) {
      last.coords = row.value
      continue
    }
    entries.push({ label: row.label, place: row.value, coords: '' })
  }
  return entries.length ? entries : [BLANK_ENTRY()]
}

export function entriesToRows(entries) {
  const rows = []
  for (const e of entries) {
    const label = e.label.trim()
    const place = e.place.trim()
    const coords = e.coords.trim()
    if (label || place) rows.push({ label, value: place, emphasis: true })
    if (coords) rows.push({ label: '', value: coords, emphasis: false })
  }
  return rows
}
