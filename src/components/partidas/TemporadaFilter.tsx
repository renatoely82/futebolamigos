'use client'

import { useRouter } from 'next/navigation'
import type { Temporada } from '@/lib/supabase'

interface Props {
  temporadas: Temporada[]
  temporadaSelecionadaId: string | null
}

export default function TemporadaFilter({ temporadas, temporadaSelecionadaId }: Props) {
  const router = useRouter()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value
    if (value === '') {
      router.replace('/partidas')
    } else {
      router.replace(`/partidas?temporada=${value}`)
    }
  }

  return (
    <select
      value={temporadaSelecionadaId ?? ''}
      onChange={handleChange}
      className="bg-white border border-[#e2e8f0] text-gray-800 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-green-500 cursor-pointer"
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
