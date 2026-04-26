'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import type { Temporada } from '@/lib/supabase'

interface Props {
  temporadas: Temporada[]
  temporadaSelecionadaId: string | null
}

export default function TemporadaFilter({ temporadas, temporadaSelecionadaId }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value
    const params = new URLSearchParams(searchParams.toString())
    if (value === '') {
      params.delete('temporada')
    } else {
      params.set('temporada', value)
    }
    const qs = params.toString()
    router.replace(qs ? `/partidas?${qs}` : '/partidas')
  }

  return (
    <select
      value={temporadaSelecionadaId ?? ''}
      onChange={handleChange}
      className="w-full bg-white border border-[#e0e0e0] text-gray-800 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-green-500 cursor-pointer"
    >
      <option value="">Todas as temporadas</option>
      {temporadas.map(t => (
        <option key={t.id} value={t.id}>
          {t.nome}{t.ativa ? ' (ativa)' : ''}
        </option>
      ))}
    </select>
  )
}
