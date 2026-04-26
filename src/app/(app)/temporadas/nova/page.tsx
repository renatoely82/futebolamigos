'use client'

import { useRouter } from 'next/navigation'
import TemporadaForm, { type TemporadaFormData } from '@/components/temporadas/TemporadaForm'
import Breadcrumbs from '@/components/ui/Breadcrumbs'

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
      <div className="mb-6 space-y-1">
        <Breadcrumbs items={[
          { label: 'Temporadas', href: '/temporadas' },
          { label: 'Nova Temporada' },
        ]} />
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
