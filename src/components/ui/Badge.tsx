import type { Posicao } from '@/lib/supabase'
import { POSICAO_CORES } from '@/lib/supabase'

export function PositionBadge({ posicao }: { posicao: Posicao }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${POSICAO_CORES[posicao]}`}>
      {posicao}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    agendada: 'bg-blue-500/20 text-blue-400',
    realizada: 'bg-lime-500/20 text-lime-400',
    cancelada: 'bg-red-500/20 text-red-400',
  }
  const label: Record<string, string> = {
    agendada: 'Agendada',
    realizada: 'Realizada',
    cancelada: 'Cancelada',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${map[status] ?? 'bg-gray-500/20 text-gray-400'}`}>
      {label[status] ?? status}
    </span>
  )
}
