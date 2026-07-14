import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'

const TILES = [
  { title: 'Collection of Herbs', content: 'Detail content coming soon.' },
  { title: 'EPOB Preparation', content: 'Detail content coming soon.' },
  { title: 'Preparation of Fermentation', content: 'Detail content coming soon.' },
  { title: 'Fermentation-Storage Facility', content: 'Detail content coming soon.' },
  { title: 'Transportation', content: 'Detail content coming soon.' },
  { title: 'Extraction & Stabilisation', content: 'Detail content coming soon.' },
  { title: 'Bottling', content: 'Detail content coming soon.' },
]

const CONTENT_HEIGHT = 200

function Tile({ tile, isOpen, onClick }) {
  const contentRef = useRef(null)
  const initialized = useRef(false)

  useEffect(() => {
    if (!contentRef.current) return
    if (!initialized.current) {
      // Set initial state without animation
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
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 20px',
        height: isOpen ? '48px' : '38px',
      }}>
        <span style={{ color: '#fff', fontSize: '0.85rem', letterSpacing: '0.03em' }}>
          {tile.title}
        </span>
      </div>

      <div ref={contentRef} style={{ height: 0, overflow: 'hidden' }}>
        <div style={{ padding: '0 20px 20px', borderTop: '0.5px solid #2a2a2a' }}>
          <p style={{ color: '#aaa', fontSize: '0.8rem', lineHeight: '1.6', margin: '16px 0 0' }}>
            {tile.content}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function TraceabilityPage() {
  const [openIndex, setOpenIndex] = useState(1)
  const navigate = useNavigate()

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
            />
          ))}
        </div>

      </div>
    </div>
  )
}
