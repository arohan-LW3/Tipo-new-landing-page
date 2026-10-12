// Google Material Symbols (Outlined, weight 400, 24px), inlined so they take
// the surrounding text colour.
const PATHS = {
  arrowForwardIos: 'm321-80-71-71 329-329-329-329 71-71 400 400L321-80Z',
  contentCopy: 'M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z',
  download: 'M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z',
  downloadDone: 'M382-320 155-547l57-57 170 170 366-366 57 57-423 423ZM200-160v-80h560v80H200Z',
  upload: 'M440-320v-326L336-542l-56-58 200-200 200 200-56 58-104-104v326h-80ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z',
}

// Placeholders until the matching Material icons are added to PATHS.
const FALLBACK = { arrowUpward: '↑', arrowDownward: '↓', delete: '×', add: '+' }

export default function Icon({ name, size = 20, style }) {
  const d = PATHS[name]
  if (!d) {
    return (
      <span aria-hidden="true" style={{ width: size, height: size, lineHeight: `${size}px`, textAlign: 'center', fontSize: size * 0.8, flexShrink: 0, ...style }}>
        {FALLBACK[name]}
      </span>
    )
  }
  return (
    <svg
      viewBox="0 -960 960 960"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      style={{ flexShrink: 0, display: 'block', ...style }}
    >
      <path d={d} />
    </svg>
  )
}
