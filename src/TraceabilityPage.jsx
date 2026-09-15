import { useState, useRef, useEffect, useLayoutEffect, useCallback, memo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

// Each tile's body is a stack of rows. A row with an empty label renders as a
// bare right-aligned value (used for a coordinate line directly under a
// place-name row). `emphasis` rows render their value large and gold, like a
// place name; plain rows render small and white. `footer` is always the
// date/duration field and always sits in the separate footer strip.
const TILES = [
  {
    title: 'Collection of Herbs',
    rows: [
      { label: 'Sourced from', value: 'Telam Bédum, Dhemaji', emphasis: true },
      { label: '', value: '27.76°N, 94.99°E' },
    ],
    footer: { label: 'Collected on', value: '09 Oct 2025' },
  },
  {
    title: 'EPOB Preparation',
    rows: [
      { label: 'Sourced from', value: 'Memberchuk, Dhemaji', emphasis: true },
      { label: '', value: '27.57°N, 94.74°E' },
      { label: '', value: 'Majulipur, Dhemaji', emphasis: true },
      { label: '', value: '27.76°N, 95.06°E' },
    ],
    footer: { label: 'Collected on', value: '10 Oct 2025' },
  },
  {
    title: 'Preparation of Fermentation',
    rows: [
      { label: 'Prepared at', value: 'Memberchuk, Dhemaji', emphasis: true },
      { label: '', value: '27.57°N, 94.74°E' },
      { label: 'Prepared by', value: 'Ardha SHG & Polo SHG', emphasis: true },
    ],
    footer: { label: 'Prepared on', value: '02 Nov 2025' },
  },
  {
    title: 'Transportation',
    rows: [
      { label: 'From', value: 'Laimekuri', emphasis: true },
      { label: '', value: '27.76°N, 95.06°E' },
      { label: 'To', value: 'Guwahati Biotech Park', emphasis: true },
      { label: '', value: '26.19°N, 91.67°E' },
    ],
    footer: { label: 'Duration', value: '10 Hours' },
  },
  {
    title: 'Fermentation-Storage Facility',
    rows: [
      { label: 'Stored at', value: 'Amingaon, Guwahati', emphasis: true },
      { label: '', value: '26.17°N, 91.71°E' },
      { label: 'Storage facility', value: 'Guwahati Biotech Park', emphasis: true },
    ],
    footer: { label: 'Duration', value: '23 Days' },
  },
  {
    title: 'Extraction & Stabilisation',
    rows: [
      { label: 'Extracted at', value: 'Sonaighuli, Dispur', emphasis: true },
      { label: '', value: '26.14°N, 91.74°E' },
      { label: 'Facility', value: 'Guwahati Biotech Park', emphasis: true },
    ],
    footer: { label: 'Duration', value: '3 Months' },
  },
  {
    title: 'Bottling',
    rows: [
      { label: 'Bottled at', value: 'Sonaighuli, Dispur', emphasis: true },
      { label: '', value: '26.14°N, 91.74°E' },
      { label: 'Facility', value: 'Guwahati Biotech Park', emphasis: true },
    ],
    footer: { label: 'Bottled on', value: '07 Mar 2026' },
  },
]

const GOLD = '#F7A70C'
const MUTED_LINE = 'rgba(255,255,255,0.22)'
const MUTED_DOT = '#ffffff'
const DOT_R = 8
const PATH_UNITS = 1000

function SunMoonIcon({ width = '24px', height = '25px' }) {
  return (
    <div style={{ position: 'relative', width, height, flexShrink: 0 }}>
      <div style={{ position: 'absolute', inset: '28.44% 37.46% 37.54% 27.46%' }}>
        <img src="/assets/icons/sun-moon-layer0.svg" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      </div>
      <div style={{ position: 'absolute', inset: '0.03% 44.22% 39.58% 0' }}>
        <img src="/assets/icons/sun-moon-layer1.svg" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      </div>
      <div style={{ position: 'absolute', inset: '5.22% 0.03% 0.03% 4.96%' }}>
        <img src="/assets/icons/sun-moon-layer2.svg" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      </div>
      <div style={{ position: 'absolute', inset: '28.71% 27.27% 28.59% 29.09%' }}>
        <img src="/assets/icons/sun-moon-layer3.svg" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      </div>
    </div>
  )
}

function CardRow({ row, small, largeSize, smallSize, isLast }) {
  const valueStyle = row.emphasis
    ? { color: GOLD, fontSize: largeSize, textAlign: 'right', lineHeight: '1.3' }
    : { color: '#ffffff', fontSize: smallSize, textAlign: 'right' }

  const rowPad = small ? '0 14px' : '0 18px'
  const rowMarginBottom = isLast ? 0 : (small ? '6px' : '8px')

  if (!row.label) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: rowPad, marginBottom: rowMarginBottom }}>
        <span style={valueStyle}>{row.value}</span>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      padding: rowPad,
      marginBottom: rowMarginBottom,
      gap: small ? '8px' : '12px',
    }}>
      <span style={{ color: '#ffffff', fontSize: smallSize, flexShrink: 0 }}>{row.label}</span>
      <span style={valueStyle}>{row.value}</span>
    </div>
  )
}

function SourceCard({ tile, isActive, boxRef }) {
  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      {/* Mobile layout: dark header bar, black body, white-divider footer */}
      <div
        className="md:hidden"
        style={{
          backgroundColor: '#000000',
          border: `0.5px solid ${isActive ? 'rgba(247,167,12,0.75)' : 'rgba(255,255,255,0.35)'}`,
          borderRadius: '14px',
          overflow: 'hidden',
          transition: 'border-color 0.3s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#222020', padding: '10px 14px' }}>
          <SunMoonIcon width="18px" height="19px" />
          <span style={{ color: GOLD, fontSize: '0.89rem', letterSpacing: '0.02em' }}>
            {tile.title}
          </span>
        </div>

        <div style={{ padding: '10px 0' }}>
          {tile.rows.map((row, i) => (
            <CardRow key={i} row={row} small largeSize="0.71rem" smallSize="0.58rem" isLast={i === tile.rows.length - 1} />
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '0.7px solid #ffffff', padding: '10px 14px' }}>
          <span style={{ color: '#ffffff', fontSize: '0.58rem' }}>{tile.footer.label}</span>
          <span style={{ color: GOLD, fontSize: '0.58rem' }}>{tile.footer.value}</span>
        </div>
      </div>

      {/* Desktop layout: bordered card, plain header, dark footer strip */}
      <div
        className="hidden md:flex md:flex-col md:justify-between md:h-[196px]"
        style={{
          backgroundColor: '#000000',
          border: `1px solid ${isActive ? '#F7A70C' : 'rgba(247,167,12,0.4)'}`,
          borderRadius: '20px',
          overflow: 'hidden',
          transition: 'border-color 0.3s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 18px 8px' }}>
          <SunMoonIcon />
          <span style={{ color: GOLD, fontSize: '1rem', letterSpacing: '0.02em' }}>
            {tile.title}
          </span>
        </div>

        <div style={{ flex: 1, padding: '8px 0' }}>
          {tile.rows.map((row, i) => (
            <CardRow key={i} row={row} largeSize="1.0rem" smallSize="0.8rem" isLast={i === tile.rows.length - 1} />
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#222020', padding: '12px 18px' }}>
          <span style={{ color: '#ffffff', fontSize: '0.8rem' }}>{tile.footer.label}</span>
          <span style={{ color: GOLD, fontSize: '0.8rem' }}>{tile.footer.value}</span>
        </div>
      </div>
    </div>
  )
}

function Tile({ tile, index, isActive, side, dotAnchorRef, boxRef }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: side === 'left' ? 'flex-start' : 'flex-end',
        position: 'relative',
        marginBottom: index < TILES.length - 1 ? '54px' : '0',
      }}
    >
      <div className="w-[88%] md:w-[401.59px]" style={{ position: 'relative' }}>
        {/* connector anchor dot: always floats out in the empty gutter beside the card, never touching its border */}
        <div
          ref={dotAnchorRef}
          style={{
            position: 'absolute',
            top: '50%',
            [side === 'left' ? 'right' : 'left']: '-22px',
            width: '1px',
            height: '1px',
          }}
        />

        <SourceCard tile={tile} isActive={isActive} boxRef={boxRef} />
      </div>
    </div>
  )
}

function useConnectorPoints(containerRef, anchorRefs, boxRefs) {
  const [points, setPoints] = useState([])
  const [boxes, setBoxes] = useState([])

  const compute = useCallback(() => {
    if (!containerRef.current) return
    const cRect = containerRef.current.getBoundingClientRect()
    const pts = anchorRefs.current.map((el) => {
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: r.left - cRect.left, y: r.top - cRect.top }
    })
    if (pts.every(Boolean)) setPoints(pts)

    const bxs = boxRefs.current.map((el) => {
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { top: r.top - cRect.top, bottom: r.bottom - cRect.top }
    })
    if (bxs.every(Boolean)) setBoxes(bxs)
  }, [containerRef, anchorRefs, boxRefs])

  useLayoutEffect(() => {
    let raf
    const start = performance.now()
    const tick = (t) => {
      compute()
      if (t - start < 400) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const onResize = () => compute()
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [compute])

  return { points, boxes }
}

const Connector = memo(function Connector({ points, boxes, activeIndex, containerSize }) {
  const prevActiveRef = useRef(activeIndex)
  const flowAnchor = Math.min(prevActiveRef.current, activeIndex)

  useEffect(() => {
    prevActiveRef.current = activeIndex
  }, [activeIndex])

  if (points.length < 2 || !containerSize.width) return null

  const curve = (p0, p1, lowerBound, upperBound) => {
    const R = 14
    const dx = p1.x - p0.x
    const dy = p1.y - p0.y
    if (Math.abs(dx) < 1) {
      return `M ${p0.x} ${p0.y} L ${p1.x} ${p1.y}`
    }
    // Bend sits at the exact center of the real gap between the two cards'
    // edges, so the vertical clearance above and below is always equal —
    // not just "at least some minimum", which used to alternate depending
    // on where each card's own dot happened to sit.
    const midY = lowerBound != null && upperBound != null
      ? (lowerBound + upperBound) / 2
      : p0.y + dy / 2
    const sign = dx > 0 ? 1 : -1
    const r = Math.min(R, Math.abs(dx) / 2, Math.abs(midY - p0.y), Math.abs(p1.y - midY))
    return [
      `M ${p0.x} ${p0.y}`,
      `L ${p0.x} ${midY - r}`,
      `Q ${p0.x} ${midY}, ${p0.x + r * sign} ${midY}`,
      `L ${p1.x - r * sign} ${midY}`,
      `Q ${p1.x} ${midY}, ${p1.x} ${midY + r}`,
      `L ${p1.x} ${p1.y}`,
    ].join(' ')
  }

  return (
    <svg
      width={containerSize.width}
      height={containerSize.height}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }}
    >
      {points.slice(0, -1).map((p0, i) => {
        const p1 = points[i + 1]
        const d = curve(p0, p1, boxes[i]?.bottom, boxes[i + 1]?.top)
        const passed = i < activeIndex
        const delay = Math.min(Math.abs(i - flowAnchor), 4) * 0.2
        return (
          <g key={i}>
            <path d={d} fill="none" stroke={MUTED_LINE} strokeWidth="1.5" />
            <path
              d={d}
              fill="none"
              stroke={GOLD}
              strokeWidth="1.5"
              pathLength={PATH_UNITS}
              strokeDasharray={`${PATH_UNITS} ${PATH_UNITS}`}
              strokeDashoffset={passed ? 0 : PATH_UNITS}
              style={{ transition: `stroke-dashoffset 1.4s ease-in-out ${delay}s` }}
            />
          </g>
        )
      })}
      {points.map((p, i) => {
        const delay = Math.min(Math.abs(i - flowAnchor), 4) * 0.2
        return (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={DOT_R}
            fill={i <= activeIndex ? GOLD : MUTED_DOT}
            style={{ transition: `fill 1.4s ease-in-out ${delay}s` }}
          />
        )
      })}
    </svg>
  )
})

function useScrollActiveIndex(boxRefs, count) {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    let raf = null
    const update = () => {
      raf = null

      const refLine = window.innerHeight * 0.25
      let closest = 0
      let closestDist = Infinity
      for (let i = 0; i < count; i++) {
        const el = boxRefs.current[i]
        if (!el) continue
        const r = el.getBoundingClientRect()
        const center = r.top + r.height / 2
        const dist = Math.abs(center - refLine)
        if (dist < closestDist) {
          closestDist = dist
          closest = i
        }
      }
      setActiveIndex(closest)
    }
    const onScroll = () => {
      if (raf != null) return
      raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf != null) cancelAnimationFrame(raf)
    }
  }, [boxRefs, count])

  return activeIndex
}

export default function TraceabilityPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { batch, serial } = location.state || {}

  const containerRef = useRef(null)
  const anchorRefs = useRef([])
  const boxRefs = useRef([])
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  const { points, boxes } = useConnectorPoints(containerRef, anchorRefs, boxRefs)
  const activeIndex = useScrollActiveIndex(boxRefs, TILES.length)

  useLayoutEffect(() => {
    const measure = () => {
      if (!containerRef.current) return
      setContainerSize({
        width: containerRef.current.offsetWidth,
        height: containerRef.current.scrollHeight,
      })
    }
    let raf
    const start = performance.now()
    const tick = (t) => {
      measure()
      if (t - start < 400) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', measure)
    }
  }, [])

  return (
    <div className="min-h-dvh flex flex-col items-center" style={{ backgroundColor: '#000000' }}>
      {/* Sticky header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-center bg-black/95 backdrop-blur-sm px-10 shrink-0 w-full"
        style={{ height: '56px', paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="w-full max-w-[420px] flex items-center">
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'none', border: 'none',
              cursor: 'pointer', padding: '0', marginRight: '16px',
              display: 'flex', alignItems: 'center',
            }}
          >
            <img src="/assets/arrow-back.svg" alt="Back" style={{ width: '24px', height: '24px' }} />
          </button>
          {batch ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <span
                style={{
                  color: '#fff',
                  fontSize: '0.75rem',
                  letterSpacing: '0.03em',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '4px',
                  padding: '4px 10px',
                }}
              >
                Batch No. {batch}
              </span>
              {serial && (
                <span
                  style={{
                    color: '#fff',
                    fontSize: '0.75rem',
                    letterSpacing: '0.03em',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '4px',
                    padding: '4px 10px',
                  }}
                >
                  Serial No. {serial}
                </span>
              )}
            </div>
          ) : (
            <span style={{ color: '#fff', fontSize: '0.85rem', letterSpacing: '0.05em' }}>
              Traceability
            </span>
          )}
        </div>
      </div>

      <div
        className="w-full flex flex-col items-center px-10"
        style={{
          paddingTop: '32px',
          // Generous bottom spacer: the scroll-driven active-card detection
          // needs enough room below the last card for its center to actually
          // reach the reference line the scroll logic looks for — without it,
          // the last couple of cards can never be picked no matter how far
          // you scroll, since there's simply no more room to scroll into.
          paddingBottom: 'max(24px, 60vh)',
        }}
      >
        <div className="w-full max-w-[420px] flex flex-col">

          {/* Tiles + connector */}
          <div ref={containerRef} style={{ position: 'relative' }}>
            {TILES.map((tile, i) => (
              <Tile
                key={i}
                tile={tile}
                index={i}
                side={i % 2 === 0 ? 'left' : 'right'}
                isActive={activeIndex === i}
                dotAnchorRef={(el) => { anchorRefs.current[i] = el }}
                boxRef={(el) => { boxRefs.current[i] = el }}
              />
            ))}
            <Connector points={points} boxes={boxes} activeIndex={activeIndex} containerSize={containerSize} />
          </div>

        </div>
      </div>
    </div>
  )
}
