'use client'

import { useEffect } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'xl'
}

export default function Modal({ open, onClose, title, children, size }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-gray-900/60" />
      <div className={`relative bg-white border border-[#e0e0e0] rounded-xl w-full shadow-2xl ${size === 'xl' ? 'max-w-2xl' : 'max-w-lg'}`}>
        <div className="flex items-center justify-between p-5 border-b border-[#e0e0e0]">
          <h2 className="text-gray-800 font-semibold text-lg">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeWidth={2} strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className={`p-5 ${size === 'xl' ? 'overflow-y-auto max-h-[75vh]' : ''}`}>{children}</div>
      </div>
    </div>
  )
}
