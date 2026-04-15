'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import TemporadaForm, { type TemporadaFormData } from '@/components/temporadas/TemporadaForm'

export default function NovaTemporadaPage() {
  const router = useRouter()

  async function handleSave(data: TemporadaFormData) {
    const res = await fetch('/api/temporadas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Erro ao criar temporada.')
    router.push(`/temporadas/${json.id}`)
  }

  return (
    <div className="p-4 sm:p-6 max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/temporadas" className="text-gray-400 hover:text-gray-700 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m7-7-7 7 7 7" />
          </svg>
        </Link>
        <h1 className="text-gray-800 text-2xl font-bold">Nova Temporada</h1>
      </div>

      <div className="bg-white border border-[#e0e0e0] rounded-xl p-6">
        <TemporadaForm
          onSave={handleSave}
          onCancel={() => router.push('/temporadas')}
        />
      </div>
    </div>
  )
}
