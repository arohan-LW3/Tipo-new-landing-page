import { useState, useRef, useEffect, useLayoutEffect, useCallback, memo } from 'react'
import { useNavigate } from 'react-router-dom'

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
      { label: 'DATE', value: '02 Nov 2025' },
      { label: 'PREPARED BY', value: 'Ardha SHG & Polo SHG' },
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
    title: 'Fermentation-Storage Facility',
    details: [
      { label: 'GEO LOCATION', value: '26.17°N, 91.71°E' },
      { label: 'DURATION', value: '23 Days' },
      { label: 'STORAGE FACILITY', value: 'Guwahati Biotech Park' },
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
const CARD_WIDTH = '88%'

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
      <div style={{ width: CARD_WIDTH, position: 'relative' }}>
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

        <div
          ref={boxRef}
          style={{
            backgroundColor: '#0a0a0a',
            border: `0.5px solid ${isActive ? 'rgba(247,167,12,0.75)' : 'rgba(255,255,255,0.35)'}`,
            borderRadius: '4px',
            overflow: 'hidden',
            position: 'relative',
            transition: 'border-color 0.3s ease',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px 0' }}>
            <span style={{ color: GOLD, fontSize: '1.0rem', letterSpacing: '0.03em' }}>
              {tile.title}
            </span>
          </div>

          <div style={{ padding: '20px 20px 0' }}>
            <DetailRows details={tile.details} />
          </div>
        </div>
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

      const refLine = window.innerHeight * 0.35
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
              isActive={activeIndex === i}
              dotAnchorRef={(el) => { anchorRefs.current[i] = el }}
              boxRef={(el) => { boxRefs.current[i] = el }}
            />
          ))}
          <Connector points={points} boxes={boxes} activeIndex={activeIndex} containerSize={containerSize} />
        </div>

      </div>
    </div>
  )
}
