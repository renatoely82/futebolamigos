import type { Posicao } from '@/lib/supabase'
import { POSICAO_CORES, POSICAO_ABREV } from '@/lib/supabase'

export function PositionBadge({ posicao }: { posicao: Posicao }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${POSICAO_CORES[posicao]}`}>
      {POSICAO_ABREV[posicao] ?? posicao}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    agendada: 'bg-blue-100 text-blue-600',
    realizada: 'bg-green-100 text-green-700',
    cancelada: 'bg-red-100 text-red-600',
  }
  const label: Record<string, string> = {
    agendada: 'Agendada',
    realizada: 'Realizada',
    cancelada: 'Cancelada',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {label[status] ?? status}
    </span>
  )
}
