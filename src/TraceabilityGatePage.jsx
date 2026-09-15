import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const inputClass = "w-full bg-white/5 border border-white/10 rounded-[4px] px-4 py-3.5 text-[0.95rem] text-white placeholder:text-white/30 outline-none focus:border-[#F7A70C] transition-colors"

const VALID_BATCH = '1'
const BATCH_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']

export default function TraceabilityGatePage() {
  const navigate = useNavigate()
  const [batch, setBatch] = useState('')
  const [serial, setSerial] = useState('')
  const [batchDropdownOpen, setBatchDropdownOpen] = useState(false)
  const batchFieldRef = useRef(null)

  const batchInvalid = batch.trim() !== '' && batch.trim() !== VALID_BATCH

  useEffect(() => {
    function handleClickOutside(e) {
      if (batchFieldRef.current && !batchFieldRef.current.contains(e.target)) {
        setBatchDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleTrace(e) {
    e.preventDefault()
    if (batch.trim() !== VALID_BATCH) return
    navigate('/traceability', { state: { batch: batch.trim(), serial: serial.trim() } })
  }

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
          <span className="text-white text-[0.85rem] tracking-[0.05em]">Traceability</span>
        </div>
      </div>

      <div className="w-full flex flex-col items-center px-10 md:px-6" style={{ paddingTop: '32px', paddingBottom: '48px' }}>
        <div className="w-full max-w-[420px] md:max-w-[560px] flex flex-col items-center">
          <form onSubmit={handleTrace} className="w-full flex flex-col gap-5">
            <div className="flex flex-col gap-2" ref={batchFieldRef} style={{ position: 'relative' }}>
              <label className="text-[0.65rem] tracking-[0.08em] uppercase text-white/40">Batch Number</label>
              <div style={{ position: 'relative' }}>
                <input
                  inputMode="numeric"
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                  onFocus={() => setBatchDropdownOpen(true)}
                  className={inputClass}
                  style={{ paddingRight: '48px' }}
                />
                <button
                  type="button"
                  onClick={() => setBatchDropdownOpen((open) => !open)}
                  className="bg-transparent border-none cursor-pointer flex items-center justify-center"
                  style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', width: '40px', height: '40px' }}
                >
                  <img src="/assets/batch-dropdown-icon.svg" alt="Select batch" className="w-5 h-5" />
                </button>

                {batchDropdownOpen && (
                  <div
                    className="bg-[#141414] border border-white/10 rounded-[4px]"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      left: 0,
                      right: 0,
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 20,
                    }}
                  >
                    {BATCH_OPTIONS.map((option) => {
                      const available = option === VALID_BATCH
                      return (
                        <button
                          key={option}
                          type="button"
                          disabled={!available}
                          onClick={() => {
                            setBatch(option)
                            setBatchDropdownOpen(false)
                          }}
                          className="w-full text-left bg-transparent border-none"
                          style={{
                            padding: '10px 16px',
                            fontSize: '0.85rem',
                            color: available ? '#ffffff' : 'rgba(255,255,255,0.3)',
                            cursor: available ? 'pointer' : 'not-allowed',
                          }}
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          Batch {option}{!available && ' - not yet available'}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
              {batchInvalid && (
                <p className="text-[#F7A70C] text-[0.7rem]">
                  Batch {batch.trim()} hasn't started production yet - only Batch 1 is currently available.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[0.65rem] tracking-[0.08em] uppercase text-white/40">Serial Number</label>
              <input
                inputMode="numeric"
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              style={{ width: '100%', borderColor: '#F7A70C', color: '#F7A70C' }}
              className="tipo-btn h-[48px] border rounded-[4px] text-[0.85rem] tracking-wide bg-transparent cursor-pointer mt-2"
            >
              Trace
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={{ width: '100%', borderColor: '#ffffff', color: '#ffffff' }}
              className="tipo-btn h-[48px] border rounded-[4px] text-[0.85rem] tracking-wide bg-transparent cursor-pointer"
            >
              Cancel
            </button>
          </form>
        </div>
      </div>

      {/* Bottle image, blended edge-to-edge into the black background */}
      <div
        className="w-[calc(100%+80px)] -ml-10 -mr-10 md:hidden"
        style={{
          marginTop: 'auto',
          paddingTop: '48px',
          pointerEvents: 'none',
          transform: 'translateY(-100px)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
          maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
        }}
      >
        <div
          style={{
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)',
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)',
          }}
        >
          <img
            src="/assets/tipo-bottle.jpeg"
            alt=""
            style={{
              width: '100%',
              display: 'block',
            }}
          />
        </div>
      </div>
    </div>
  )
}
