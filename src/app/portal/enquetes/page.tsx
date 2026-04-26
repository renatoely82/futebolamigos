'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { MeEnquete } from '@/app/api/me/enquetes/route'

export default function PortalEnquetesPage() {
  const router = useRouter()
  const [enquetes, setEnquetes] = useState<MeEnquete[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/me/enquetes')
      .then(async r => {
        if (r.status === 401 || r.status === 403) { router.push('/login'); return }
        if (r.ok) setEnquetes(await r.json())
      })
      .finally(() => setLoading(false))
  }, [router])

  return (
    <div className="min-h-screen bg-[#f4f6f9] pb-10">
      <div className="bg-green-600 text-white px-4 pt-10 pb-5">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/portal" className="text-green-200 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <p className="text-green-200 text-xs font-medium">Barcelombra Fútbol</p>
            <h1 className="text-white text-xl font-bold">Enquetes</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-4 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Carregando...</div>
        ) : enquetes.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            Sem enquetes activas de momento.
          </div>
        ) : (
          enquetes.map(e => (
            <div key={e.enquete_id} className="bg-white rounded-2xl border border-[#e0e0e0] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h2 className="text-gray-800 font-semibold text-sm">{e.titulo}</h2>
                  {e.descricao && <p className="text-gray-500 text-xs mt-0.5">{e.descricao}</p>}
                </div>
                {e.usado ? (
                  <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
                    Votado
                  </span>
                ) : (
                  <Link
                    href={`/enquete/${e.enquete_id}?token=${e.token}`}
                    className="shrink-0 text-xs font-semibold px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors"
                  >
                    Votar
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
