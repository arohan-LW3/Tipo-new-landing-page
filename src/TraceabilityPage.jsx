import { useState, useRef, useEffect, useLayoutEffect, useCallback, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'

function useLiveClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

function formatDate(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
}

function formatTime(d) {
  const h = d.getHours()
  const m = d.getMinutes().toString().padStart(2, '0')
  const hh = h % 12 || 12
  const mer = h < 12 ? 'am' : 'pm'
  return { time: `${hh}:${m}`, meridiem: mer }
}

const TILES = [
  {
    title: 'Collection of Herbs',
    details: [
      { label: 'GEO LOCATION', value: '27.764256°N, 94.992861°E' },
      { label: 'DATE', value: '09 Oct 2025' },
    ],
  },
  {
    title: 'EPOB Preparation',
    details: [
      { label: 'GEO LOCATION 1', value: '27.567237°N, 94.742544°E' },
      { label: 'GEO LOCATION 2', value: '27.761967°N, 95.064634°E' },
      { label: 'DATE', value: '10 Oct 2025' },
    ],
  },
  {
    title: 'Preparation of Fermentation',
    details: [
      { label: 'GEO LOCATION 1', value: '27.567237°N, 94.742544°E' },
      { label: 'GEO LOCATION 2', value: '27.761967°N, 95.064634°E' },
      { label: 'DATE', value: '02 Nov 2025' },
      { label: 'PREPARED BY', value: 'Ardha SHG & Polo SHG' },
    ],
  },
  {
    title: 'Fermentation-Storage Facility',
    details: [
      { label: 'GEO LOCATION', value: '27.761967°N, 95.064634°E' },
      { label: 'START DATE', value: '02 Nov 2025' },
      { label: 'END DATE', value: '25 Nov 2025' },
      { label: 'STORAGE FACILITY', value: 'Laimekuri' },
    ],
  },
  {
    title: 'Transportation',
    details: [
      { label: 'FROM', value: 'Laimekuri (27.761967°N, 95.064634°E)' },
      { label: 'TO', value: 'Guwahati Biotech Park (26.194452°N, 91.671489°E)' },
      { label: 'DURATION', value: '10 Hours' },
    ],
  },
  {
    title: 'Extraction & Stabilisation',
    details: [
      { label: 'GEO LOCATION', value: '26.1445°N, 91.7362°E' },
      { label: 'START DATE', value: '25 Nov 2025' },
      { label: 'END DATE', value: '26 Feb 2026' },
      { label: 'DURATION', value: '3 Months' },
      { label: 'FACILITY', value: 'Guwahati Biotech Park' },
    ],
  },
  {
    title: 'Bottling',
    details: [
      { label: 'GEO LOCATION', value: '26.1445°N, 91.7362°E' },
      { label: 'DATE', value: '07 Mar 2026' },
      { label: 'FACILITY', value: 'Guwahati Biotech Park' },
    ],
  },
]

const GOLD = '#F7A70C'
const MUTED_LINE = 'rgba(255,255,255,0.22)'
const MUTED_DOT = 'rgba(255,255,255,0.35)'
const DOT_R = 8
const PATH_UNITS = 1000

function DetailRows({ details }) {
  return (
    <div>
      {details.map(({ label, value }, idx) => (
        <div key={idx} style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px',
        }}>
          <span style={{
            color: 'rgba(255,255,255,0.45)',
            fontSize: '0.65rem',
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            flexShrink: 0,
            marginRight: '12px',
          }}>
            {label}
          </span>
          <span style={{
            color: '#ffffff',
            fontSize: '0.72rem',
            textAlign: 'right',
            letterSpacing: '0.01em',
          }}>
            {value}
          </span>
        </div>
      ))}
    </div>
  )
}

function Tile({ tile, index, isOpen, side, onClick, now, dotAnchorRef, boxRef }) {
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!wrapRef.current) return
    gsap.to(wrapRef.current, {
      width: isOpen ? '92%' : '68%',
      duration: 0.45,
      ease: 'power2.inOut',
    })
  }, [isOpen])

  const dateStr = formatDate(now)
  const { time: timePart, meridiem } = formatTime(now)

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: side === 'left' ? 'flex-start' : 'flex-end',
        position: 'relative',
        marginBottom: index < TILES.length - 1 ? '54px' : '0',
      }}
    >
      <div
        ref={wrapRef}
        style={{ width: isOpen ? '92%' : '68%', position: 'relative' }}
      >
        {/* connector anchor dot: always floats out in the empty gutter beside the card, never touching its border */}
        <div
          ref={dotAnchorRef}
          style={{
            position: 'absolute',
            top: '50%',
            [side === 'left' ? 'right' : 'left']: isOpen ? '-18px' : '-26px',
            width: '1px',
            height: '1px',
          }}
        />

        <div
          ref={boxRef}
          onClick={onClick}
          style={{
            backgroundColor: '#0a0a0a',
            border: `0.5px solid ${isOpen ? 'rgba(247,167,12,0.75)' : 'rgba(255,255,255,0.35)'}`,
            borderRadius: '4px',
            overflow: 'hidden',
            cursor: isOpen ? 'default' : 'pointer',
            position: 'relative',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: isOpen ? '16px 20px 0' : '14px 16px 0',
          }}>
            <span style={{
              color: GOLD,
              fontSize: isOpen ? '0.75rem' : '0.7rem',
              letterSpacing: '0.03em',
              fontWeight: isOpen ? 400 : 500,
            }}>
              {tile.title}
            </span>
          </div>

          {isOpen && (
            <div style={{ padding: '16px 20px 0' }}>
              {/* Live timestamp + Large title */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <div style={{ color: '#666666', fontSize: '0.65rem', letterSpacing: '0.08em', marginBottom: '4px' }}>
                    {dateStr}
                  </div>
                  <div style={{ color: '#ffffff', fontSize: '1.05rem', letterSpacing: '0.02em', lineHeight: 1 }}>
                    {timePart}{' '}
                    <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.55)', letterSpacing: '0.04em' }}>
                      {meridiem}
                    </span>
                  </div>
                </div>
                <div style={{ maxWidth: '56%', textAlign: 'right' }}>
                  <span style={{
                    color: '#ffffff',
                    fontSize: '1.0rem',
                    fontWeight: '700',
                    lineHeight: '1.25',
                    letterSpacing: '0.01em',
                    textTransform: 'uppercase',
                    display: 'block',
                  }}>
                    {tile.title}
                  </span>
                </div>
              </div>

              <DetailRows details={tile.details} />
              <div style={{ paddingBottom: '20px' }} />
            </div>
          )}

          {!isOpen && (
            <div style={{ position: 'relative' }}>
              <div style={{ padding: '12px 16px 18px' }}>
                <DetailRows details={tile.details} />
              </div>
              {/* darkening veil: clear near top, opaque toward bottom, hides details until opened */}
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to bottom, rgba(10,10,10,0) 0%, rgba(10,10,10,0.55) 45%, rgba(10,10,10,0.96) 100%)',
                pointerEvents: 'none',
              }} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function useConnectorPoints(containerRef, anchorRefs, boxRefs, watch) {
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
      if (t - start < 600) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const onResize = () => compute()
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, watch)

  return { points, boxes }
}

const Connector = memo(function Connector({ points, boxes, openIndex, containerSize }) {
  const prevOpenIndexRef = useRef(openIndex)
  const flowAnchor = Math.min(prevOpenIndexRef.current, openIndex)

  useEffect(() => {
    prevOpenIndexRef.current = openIndex
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openIndex])

  if (points.length < 2 || !containerSize.width) return null

  const curve = (p0, p1, lowerBound, upperBound) => {
    const R = 14
    const dx = p1.x - p0.x
    const dy = p1.y - p0.y
    if (Math.abs(dx) < 1) {
      return `M ${p0.x} ${p0.y} L ${p1.x} ${p1.y}`
    }
    const naturalMid = p0.y + dy / 2
    const margin = 22
    let midY = naturalMid
    if (lowerBound != null && upperBound != null) {
      midY = lowerBound + margin < upperBound - margin
        ? Math.min(Math.max(naturalMid, lowerBound + margin), upperBound - margin)
        : (lowerBound + upperBound) / 2
    }
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
        const passed = i < openIndex
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
            fill={i <= openIndex ? GOLD : MUTED_DOT}
            style={{ transition: `fill 1.4s ease-in-out ${delay}s` }}
          />
        )
      })}
    </svg>
  )
})

export default function TraceabilityPage() {
  const [openIndex, setOpenIndex] = useState(0)
  const navigate = useNavigate()
  const now = useLiveClock()

  const containerRef = useRef(null)
  const anchorRefs = useRef([])
  const boxRefs = useRef([])
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  const { points, boxes } = useConnectorPoints(containerRef, anchorRefs, boxRefs, [openIndex])

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
      if (t - start < 600) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', measure)
    }
  }, [openIndex])

  return (
    <div
      className="min-h-dvh flex flex-col items-center"
      style={{
        backgroundColor: '#000000',
        paddingLeft: '40px',
        paddingRight: '40px',
        paddingTop: 'max(56px, env(safe-area-inset-top, 56px))',
        paddingBottom: '24px',
      }}
    >
      <div className="w-full max-w-[420px] flex flex-col">

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px' }}>
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
          <span style={{ color: '#fff', fontSize: '0.85rem', letterSpacing: '0.05em' }}>
            Traceability
          </span>
        </div>

        {/* Tiles + connector */}
        <div ref={containerRef} style={{ position: 'relative' }}>
          {TILES.map((tile, i) => (
            <Tile
              key={i}
              tile={tile}
              index={i}
              side={i % 2 === 0 ? 'left' : 'right'}
              isOpen={openIndex === i}
              onClick={() => { if (openIndex !== i) setOpenIndex(i) }}
              now={now}
              dotAnchorRef={(el) => { anchorRefs.current[i] = el }}
              boxRef={(el) => { boxRefs.current[i] = el }}
            />
          ))}
          <Connector points={points} boxes={boxes} openIndex={openIndex} containerSize={containerSize} />
        </div>

      </div>
    </div>
  )
}
