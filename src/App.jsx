import { useRef, useState } from 'react'
import './App.css'
import FermentationModal from './FermentationModal'

const INSTAGRAM_SVG = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
)

const YOUTUBE_SVG = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
)

function VideoPlayer({ videoId }) {
  const [playing, setPlaying] = useState(false)

  return (
    <div className="w-full rounded-[4px] overflow-hidden aspect-video bg-black relative" style={{border: '0.5px solid #F7A70C'}}>
      {playing ? (
        <iframe
          className="absolute inset-0 w-full h-full border-0"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
      ) : (
        <div className="relative w-full h-full cursor-pointer" onClick={() => setPlaying(true)}>
          <img
            src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
            alt="TIPO Video"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7 ml-1">
                <polygon points="5,3 19,12 5,21"/>
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
    <div className="min-h-dvh bg-[#0a0a0a] flex flex-col items-center" style={{paddingLeft: '40px', paddingRight: '40px', paddingTop: 'max(56px, env(safe-area-inset-top, 56px))', paddingBottom: '24px'}}>
      <div className="w-full max-w-[420px] flex flex-col items-center">

        {/* Logo */}
        <div style={{marginBottom: '24px'}}>
          <img src="/assets/LOGO new.svg" alt="TIPO" className="w-[140px]" />
        </div>

        {/* Tagline + Cover Image */}
        <div className="w-full flex flex-col items-center" style={{gap: '8px'}}>
          <p className="w-full text-center text-white text-[0.75rem] tracking-[0.1em] uppercase">
            Crafted with passion. Fermented to perfection.
          </p>
          <div className="w-full">
            <img src="/assets/cover image new.svg" alt="TIPO" className="w-full h-auto block" />
          </div>
        </div>

        {/* YouTube Player */}
        <div className="w-full" style={{marginTop: '24px'}}>
          <VideoPlayer videoId="QipHkYuCm74" />
        </div>

        {/* Stacked Buttons */}
        <div className="w-full flex flex-col items-center" style={{marginTop: '24px', gap: '12px'}}>
          {[
            { label: 'Our Fermentation Process', href: null, onClick: () => setShowModal(true) },
            { label: 'Traceability', href: null, onClick: () => {} },
            { label: 'Youtube', href: 'https://www.youtube.com/@TipoHeritage' },
            { label: 'Instagram', href: 'https://www.instagram.com/tipo.heritage' },
            { label: 'Website', href: 'https://www.heritagetipo.com' },
          ].map(({ label, href, onClick }) =>
            href ? (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener"
                style={{width: '70%'}}
                className="tipo-btn h-[48px] border rounded-[4px] flex items-center justify-center text-[0.85rem] tracking-wide no-underline"
              >
                {label}
              </a>
            ) : (
              <button
                key={label}
                onClick={onClick}
                style={{width: '70%'}}
                className="tipo-btn h-[48px] border rounded-[4px] text-[0.85rem] tracking-wide bg-transparent cursor-pointer"
              >
                {label}
              </button>
            )
          )}
        </div>

        {/* Footer */}
        <p className="text-[#68676C] text-[0.75rem] text-center mb-4" style={{marginTop: '48px'}}>
          © 2026 TIPO. All rights reserved.
        </p>

      </div>
    </div>

    {showModal && <FermentationModal onClose={() => setShowModal(false)} />}
    </>
  )
}
