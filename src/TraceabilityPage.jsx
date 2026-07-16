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
      { label: 'HERBS COLLECTED', value: '60+ Varieties' },
      { label: 'REGION', value: 'Assam, India' },
      { label: 'METHOD', value: 'Hand-picked' },
      { label: 'STATUS', value: 'Completed' },
    ],
  },
  {
    title: 'EPOB Preparation',
    details: [
      { label: 'GEO LOCATION', value: '26.1445°N, 91.7362°E' },
      { label: 'DATE', value: '10 Jan 2025' },
      { label: 'BATCH SIZE', value: '50 kg' },
      { label: 'FACILITY', value: 'Guwahati Unit' },
      { label: 'DURATION', value: '3 Days' },
      { label: 'STATUS', value: 'Completed' },
    ],
  },
  {
    title: 'Preparation of Fermentation',
    details: [
      { label: 'GEO LOCATION', value: '23.4567°N, 85.3240°E' },
      { label: 'DATE', value: '12 Mar 2025' },
      { label: 'NAME OF SHG', value: 'Erroi Mahila SHG' },
      { label: 'STORAGE FACILITY', value: 'Guwahati Central Unit' },
      { label: 'DURATION', value: '14 Days' },
      { label: 'STATUS', value: 'In Progress' },
    ],
  },
  {
    title: 'Fermentation-Storage Facility',
    details: [
      { label: 'FACILITY NAME', value: 'Guwahati Central Unit' },
      { label: 'CAPACITY', value: '500 L' },
      { label: 'TEMPERATURE', value: '18–22°C' },
      { label: 'HUMIDITY', value: '65–70%' },
      { label: 'DURATION', value: '20–25 Days' },
      { label: 'STATUS', value: 'In Progress' },
    ],
  },
  {
    title: 'Transportation',
    details: [
      { label: 'ORIGIN', value: 'Guwahati, Assam' },
      { label: 'DESTINATION', value: 'Bengaluru' },
      { label: 'DISTANCE', value: '1,890 km' },
      { label: 'CARRIER', value: 'Refrigerated Transport' },
      { label: 'DATE', value: '18 Apr 2025' },
      { label: 'STATUS', value: 'Completed' },
    ],
  },
  {
    title: 'Extraction & Stabilisation',
    details: [
      { label: 'FACILITY', value: 'Bengaluru Lab' },
      { label: 'BATCH ID', value: 'EXT-2025-04' },
      { label: 'METHOD', value: 'Cold Press' },
      { label: 'DURATION', value: '5 Days' },
      { label: 'YIELD', value: '42 L' },
      { label: 'STATUS', value: 'Completed' },
    ],
  },
  {
    title: 'Bottling',
    details: [
      { label: 'FACILITY', value: 'Bengaluru Unit' },
      { label: 'BATCH ID', value: 'BOT-2025-05' },
      { label: 'BOTTLES', value: '1,200 Units' },
      { label: 'LABEL', value: 'Heritage Tipo 500ml' },
      { label: 'DATE', value: '05 May 2025' },
      { label: 'STATUS', value: 'Completed' },
    ],
  },
]

const CONTENT_HEIGHT = 400

function Tile({ tile, isOpen, onClick, now }) {
  const contentRef = useRef(null)
  const initialized = useRef(false)

  useEffect(() => {
    if (!contentRef.current) return
    if (!initialized.current) {
      gsap.set(contentRef.current, { height: isOpen ? CONTENT_HEIGHT : 0 })
      initialized.current = true
      return
    }
    gsap.to(contentRef.current, {
      height: isOpen ? CONTENT_HEIGHT : 0,
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
        border: `0.5px solid ${isOpen ? '#F7A70C' : '#ffffff'}`,
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
        padding: '0 20px',
        height: isOpen ? '48px' : '38px',
        transition: 'height 0.4s',
      }}>
        {!isOpen && (
          <span style={{ color: '#fff', fontSize: '0.85rem', letterSpacing: '0.03em' }}>
            {tile.title}
          </span>
        )}
      </div>

      {/* Expanded content */}
      <div ref={contentRef} style={{ height: 0, overflow: 'hidden' }}>
        <div style={{ borderTop: '0.5px solid #2a2a2a', padding: '16px 20px 0' }}>

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
  const [openIndex, setOpenIndex] = useState(1)
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
