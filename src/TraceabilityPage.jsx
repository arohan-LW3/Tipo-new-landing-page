import { useState, useRef, useEffect } from 'react'
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
      { label: 'GEO LOCATION', value: '26.2006°N, 92.9376°E' },
      { label: 'DATE', value: '02 Dec 2024' },
    ],
  },
  {
    title: 'EPOB Preparation',
    details: [
      { label: 'GEO LOCATION', value: '26.1445°N, 91.7362°E' },
      { label: 'DATE', value: '10 Jan 2025' },
    ],
  },
  {
    title: 'Preparation of Fermentation',
    details: [
      { label: 'GEO LOCATION', value: '23.4567°N, 85.3240°E' },
      { label: 'DATE', value: '12 Mar 2025' },
      { label: 'PREPARED BY', value: 'Erroi Mahila SHG' },
    ],
  },
  {
    title: 'Fermentation-Storage Facility',
    details: [
      { label: 'GEO LOCATION', value: '26.1445°N, 91.7362°E' },
      { label: 'START DATE', value: '26 Mar 2025' },
      { label: 'END DATE', value: '20 Apr 2025' },
      { label: 'STORAGE FACILITY', value: 'Guwahati Central Unit' },
    ],
  },
  {
    title: 'Transportation',
    details: [
      { label: 'FROM', value: '26.1445°N, 91.7362°E' },
      { label: 'TO', value: '12.9716°N, 77.5946°E' },
      { label: 'DURATION', value: '3 Days' },
    ],
  },
  {
    title: 'Extraction & Stabilisation',
    details: [
      { label: 'GEO LOCATION', value: '26.1445°N, 91.7362°E' },
      { label: 'START DATE', value: '21 Apr 2025' },
      { label: 'END DATE', value: '21 Jun 2025' },
      { label: 'DURATION', value: '2 Months' },
      { label: 'FACILITY', value: 'Guwahati Biotech Park' },
    ],
  },
  {
    title: 'Bottling',
    details: [
      { label: 'GEO LOCATION', value: '26.1445°N, 91.7362°E' },
      { label: 'DATE', value: '05 May 2025' },
      { label: 'FACILITY', value: 'Guwahati Biotech Park' },
    ],
  },
]

function Tile({ tile, isOpen, onClick, now }) {
  const contentRef = useRef(null)
  const initialized = useRef(false)

  useEffect(() => {
    if (!contentRef.current) return
    const fullHeight = contentRef.current.scrollHeight
    if (!initialized.current) {
      gsap.set(contentRef.current, { height: isOpen ? fullHeight : 0 })
      initialized.current = true
      return
    }
    gsap.to(contentRef.current, {
      height: isOpen ? fullHeight : 0,
      duration: 0.4,
      ease: 'power2.inOut',
    })
  }, [isOpen])

  const dateStr = formatDate(now)
  const { time: timePart, meridiem } = formatTime(now)

  return (
    <div
      style={{
        backgroundColor: '#000000',
        border: `0.5px solid ${isOpen ? 'rgba(247,167,12,0.75)' : '#ffffff'}`,
        borderRadius: '4px',
        overflow: 'hidden',
        cursor: isOpen ? 'default' : 'pointer',
      }}
      onClick={onClick}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isOpen ? '0' : '0 20px',
        height: isOpen ? '48px' : '38px',
        transition: 'height 0.4s',
        overflow: 'hidden',
      }}>
        {isOpen ? (
          <img
            src="/assets/decorative Pattern updated.svg"
            alt=""
            style={{ width: '100%', height: '48px', display: 'block', objectFit: 'cover', opacity: 0.75 }}
          />
        ) : (
          <span style={{ color: '#fff', fontSize: '0.85rem', letterSpacing: '0.03em' }}>
            {tile.title}
          </span>
        )}
      </div>

      {/* Expanded content */}
      <div ref={contentRef} style={{ height: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px 0' }}>

          {/* Live timestamp + Large title */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            {/* Left: live date & time */}
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

            {/* Right: large title */}
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

          {/* Data rows */}
          <div style={{ marginBottom: '14px' }}>
            {tile.details.map(({ label, value }, idx) => (
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

          {/* Image placeholder box */}
          <div style={{
            border: '0.5px solid #F7A70C',
            borderRadius: '4px',
            height: '112px',
            marginBottom: '20px',
          }} />

        </div>
      </div>
    </div>
  )
}

export default function TraceabilityPage() {
  const [openIndex, setOpenIndex] = useState(0)
  const navigate = useNavigate()
  const now = useLiveClock()

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

        {/* Tiles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {TILES.map((tile, i) => (
            <Tile
              key={i}
              tile={tile}
              isOpen={openIndex === i}
              onClick={() => { if (openIndex !== i) setOpenIndex(i) }}
              now={now}
            />
          ))}
        </div>

      </div>
    </div>
  )
}
