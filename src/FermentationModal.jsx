import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import gsap from 'gsap'

const CARDS = [
  { text: 'Collection of 60+ herbs', img: '/assets/Collection of 60 herbs.webp', imgScale: 1.12 },
  { text: 'Preparation of EPOB (starter cake)', img: '/assets/Preparation of EPOB (starter cake).webp' },
  { text: 'Controlled burning of husk', img: '/assets/Controlled burning of husk.webp' },
  { text: 'Cooking rice', img: '/assets/Cooking rice.webp' },
  { text: 'Mixing of EPOB (starter cake), burnt husk and rice', img: '/assets/Mixing of EPOB (starter cake), burnt husk and rice.webp' },
  { text: 'Solid state fermentation for 20-25 days in small batches', img: '/assets/Solid state fermentation for 20-25 days in small batches.webp' },
  { text: 'Extraction and stabilization', img: '/assets/Extraction and stabilization.webp', imgScale: 1.1 },
  { text: 'Filtration and bottling', img: '/assets/Filtration and bottling.webp' },
]

const isMobile = () => window.innerWidth < 768
const TOTAL_SPREAD_Y = isMobile() ? 60 : 84
const TOTAL_SCALE_DROP = 0.15
const Y_STEP = TOTAL_SPREAD_Y / (CARDS.length - 1)
const SCALE_STEP = TOTAL_SCALE_DROP / (CARDS.length - 1)

const posFor = (i) => ({ scale: 1 - i * SCALE_STEP, y: i * Y_STEP })

function CardBody({ index }) {
  const progressPct = `${((index + 1) / CARDS.length) * 100}%`
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', padding: '20px 24px 16px' }}>
        <span style={{ color: '#fff', fontSize: '0.85rem', letterSpacing: '0.03em' }}>
          Our Fermentation Process
        </span>
      </div>
      <div style={{ height: '5px', backgroundColor: '#fff', margin: '0 24px', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: progressPct, backgroundColor: '#F7A70C' }} />
      </div>
      <div style={{ padding: '16px 24px 0' }}>
        <div style={{ borderRadius: '8px', aspectRatio: '1/1', overflow: 'hidden' }}>
          <img
            src={CARDS[index].img}
            alt={CARDS[index].text}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block', transform: `scale(${CARDS[index].imgScale ?? 1})` }}
          />
        </div>
      </div>
      <div style={{ padding: '0 24px', height: '80px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <p style={{ color: '#fff', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
          {CARDS[index].text}
        </p>
      </div>
    </>
  )
}

export default function FermentationModal({ onClose }) {
  const [current, setCurrent] = useState(0)
  const animRefs = useRef([])
  const tlRef = useRef(null)
  const startY = useRef(0)
  const dragging = useRef(false)
  const isBackward = useRef(false)

  // Refs so wheel/key listener (registered once) always calls latest functions
  const goForwardRef = useRef(null)
  const goBackRef = useRef(null)
  const accumRef = useRef(0)

  const isAnimating = () => tlRef.current?.isActive() === true

  // Set initial stack positions on mount
  useLayoutEffect(() => {
    for (let i = 0; i < CARDS.length; i++) {
      if (animRefs.current[i]) gsap.set(animRefs.current[i], posFor(i))
    }
  }, [])

  // After current changes, handle backward animation
  useLayoutEffect(() => {
    if (!isBackward.current) return
    isBackward.current = false

    const tl = gsap.timeline()
    tlRef.current = tl

    gsap.set(animRefs.current[current], { y: -window.innerHeight, scale: 1 })
    tl.to(animRefs.current[current], { ...posFor(0), duration: 0.45, ease: 'power2.out' }, 0)
    for (let i = current + 1; i < CARDS.length; i++) {
      tl.to(animRefs.current[i], { ...posFor(i - current), duration: 0.45, ease: 'power2.out' }, 0)
    }
  }, [current])

  const goForward = () => {
    if (isAnimating()) return
    if (current >= CARDS.length - 1) {
      gsap.killTweensOf(animRefs.current[current])
      gsap.to(animRefs.current[current], {
        y: posFor(0).y - 15, duration: 0.15, ease: 'power2.out',
        onComplete: () => gsap.to(animRefs.current[current], { ...posFor(0), duration: 0.3, ease: 'bounce.out' }),
      })
      return
    }

    const tl = gsap.timeline({ onComplete: () => { accumRef.current = 0; setCurrent(c => c + 1) } })
    tlRef.current = tl

    tl.to(animRefs.current[current], { y: -window.innerHeight, duration: 0.4, ease: 'power2.in' }, 0)
    for (let i = current + 1; i < CARDS.length; i++) {
      tl.to(animRefs.current[i], { ...posFor(i - current - 1), duration: 0.45, ease: 'power2.inOut' }, 0)
    }
  }

  const goBack = () => {
    if (current <= 0 || isAnimating()) return
    isBackward.current = true
    setCurrent(c => c - 1)
  }

  // Keep refs pointing to latest functions every render
  goForwardRef.current = goForward
  goBackRef.current = goBack

  const onTouchStart = (e) => { startY.current = e.touches[0].clientY }
  const onTouchEnd = (e) => {
    const dy = e.changedTouches[0].clientY - startY.current
    if (dy < -40) goForward()
    else if (dy > 40) goBack()
  }
  const onMouseDown = (e) => { startY.current = e.clientY; dragging.current = true }
  const onMouseUp = (e) => {
    if (!dragging.current) return
    dragging.current = false
    const dy = e.clientY - startY.current
    if (dy < -40) goForward()
    else if (dy > 40) goBack()
  }

  // Block pull-to-refresh on all mobile browsers when modal is open
  useEffect(() => {
    const block = (e) => e.preventDefault()
    document.addEventListener('touchmove', block, { passive: false })
    return () => document.removeEventListener('touchmove', block)
  }, [])

  // Register wheel + key listeners ONCE
  useEffect(() => {
    let gestureActive = false
    let gestureTimer = null

    const onWheel = (e) => {
      e.preventDefault()

      clearTimeout(gestureTimer)
      gestureTimer = setTimeout(() => { gestureActive = false }, 100)

      if (gestureActive || tlRef.current?.isActive()) return
      if (Math.abs(e.deltaY) < 10) return

      gestureActive = true
      if (e.deltaY > 0) goForwardRef.current?.()
      else goBackRef.current?.()
    }
    const onKey = (e) => {
      if (e.key === 'ArrowDown') goForwardRef.current?.()
      else if (e.key === 'ArrowUp') goBackRef.current?.()
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKey)
    }
  }, [])  // empty — registered once, never torn down

  return (
    <div
      className="fixed inset-0 z-50"
      style={{ backgroundColor: '#000', overscrollBehavior: 'contain', touchAction: 'none' }}
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
    >
      {CARDS.map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '85vw',
            maxWidth: '480px',
            zIndex: i < current ? 0 : CARDS.length - i,
            visibility: i < current ? 'hidden' : 'visible',
          }}
        >
          <div
            ref={el => { animRefs.current[i] = el }}
            style={{
              backgroundColor: '#121212',
              borderRadius: '14px',
              overflow: 'hidden',
              border: '0.5px solid #F7A70C',
              cursor: i === current ? 'grab' : 'default',
            }}
            onClick={i === current ? (e) => e.stopPropagation() : undefined}
          >
            <CardBody index={i} />
            {i === current && (
              <div
                style={{
                  position: 'absolute', top: '16px', right: '20px',
                  minWidth: '28px', height: '28px', padding: '0 10px', borderRadius: '14px',
                  backgroundColor: '#3a3a3a',
                  color: '#fff', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.02em',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {current + 1}/{CARDS.length}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
