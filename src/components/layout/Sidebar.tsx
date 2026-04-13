'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

const navItems = [
  {
    href: '/partidas',
    label: 'Partidas',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
        <path strokeWidth={1.5} d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z" />
        <path strokeWidth={1.5} d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
  {
    href: '/temporadas',
    label: 'Temporadas',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M8 21V13a4 4 0 0 1 8 0v8" />
        <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M3 21h18" />
        <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M12 3l1.5 3 3.5.5-2.5 2.4.6 3.5L12 11l-3.1 1.4.6-3.5L7 6.5l3.5-.5z" />
      </svg>
    ),
  },
  {
    href: '/jogadores',
    label: 'Jogadores',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" strokeWidth={1.5} />
        <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: '/pagamentos',
    label: 'Pagamentos',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <rect x="2" y="5" width="20" height="14" rx="2" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" />
        <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M6 15h2m4 0h2" />
      </svg>
    ),
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-white border-r border-[#e9ecf1] flex-col h-full shrink-0">
        {/* Logo */}
        <div className="p-4 border-b border-[#e9ecf1]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            <span className="font-bold text-gray-800 text-sm leading-tight">
              Futebol<br />Amigos
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  active
                    ? 'bg-green-100 text-green-700'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}
              >
                {item.icon}
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-2 border-t border-[#e9ecf1]">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
              <line x1="21" y1="12" x2="9" y2="12" strokeWidth={1.5} strokeLinecap="round" />
            </svg>
            <span className="text-sm font-medium">Sair</span>
          </button>
        </div>
      </aside>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#e9ecf1] flex items-stretch">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors ${
                active ? 'text-green-600' : 'text-gray-400'
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </Link>
          )
        })}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-2 text-gray-400 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
            <line x1="21" y1="12" x2="9" y2="12" strokeWidth={1.5} strokeLinecap="round" />
          </svg>
          <span className="text-[10px] font-medium leading-none">Sair</span>
        </button>
      </nav>
    </>
  )
}
