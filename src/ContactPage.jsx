import { useLayoutEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ContactForm from './ContactForm'

export default function ContactPage() {
  const navigate = useNavigate()

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="min-h-dvh bg-[#0a0a0a] flex flex-col">
      {/* Sticky header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-center bg-[#0a0a0a]/95 backdrop-blur-sm px-10 md:px-6 shrink-0"
        style={{ height: '56px', paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="w-full max-w-[420px] md:max-w-[560px] flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center mr-4 bg-transparent border-none cursor-pointer p-0"
          >
            <img src="/assets/arrow-back.svg" alt="Back" className="w-6 h-6" />
          </button>
          <span className="text-white text-[0.85rem] tracking-[0.05em]">Contact Us</span>
        </div>
      </div>

      <div className="w-full flex flex-col items-center px-10 md:px-6" style={{ paddingTop: '32px', paddingBottom: '48px' }}>
        <div className="w-full max-w-[420px] md:max-w-[560px] flex flex-col items-center">
          <ContactForm />
        </div>
      </div>
    </div>
  )
}
