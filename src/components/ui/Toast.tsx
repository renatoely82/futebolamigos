'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface ToastMessage {
  id: number
  text: string
  type: ToastType
}

interface ToastContextValue {
  toast: (text: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

let nextId = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const toast = useCallback((text: string, type: ToastType = 'success') => {
    const id = ++nextId
    setToasts(prev => [...prev, { id, text, type }])
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-20 md:bottom-6 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast: t, onDismiss }: { toast: ToastMessage; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(t.id), 3500)
    return () => clearTimeout(timer)
  }, [t.id, onDismiss])

  const styles: Record<ToastType, string> = {
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
    info: 'bg-gray-700 text-white',
  }

  const icons: Record<ToastType, React.ReactNode> = {
    success: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    info: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <circle cx="12" cy="12" r="10" strokeWidth={2} />
        <path strokeLinecap="round" d="M12 16v-4m0-4h.01" />
      </svg>
    ),
  }

  return (
    <div
      className={`${styles[t.type]} px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 text-sm font-medium animate-slide-in cursor-pointer`}
      onClick={() => onDismiss(t.id)}
    >
      {icons[t.type]}
      <span>{t.text}</span>
    </div>
  )
}
