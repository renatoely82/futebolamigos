'use client'

import type { ClassificacaoEntry } from '@/lib/supabase'
import { PositionBadge } from '@/components/ui/Badge'

interface Props {
  entry: ClassificacaoEntry
  onClose: () => void
}

const RESULTADO_STYLE: Record<string, string> = {
  V: 'bg-green-100 text-green-700 border-green-200',
  E: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  D: 'bg-red-100 text-red-600 border-red-200',
}

export default function PortalJogadorModal({ entry, onClose }: Props) {
  const stats = [
    { label: 'Jogos', value: entry.jogos },
    { label: 'Pontos', value: entry.pontos },
    { label: 'Vitórias', value: entry.vitorias },
    { label: 'Empates', value: entry.empates },
    { label: 'Derrotas', value: entry.derrotas },
    { label: 'Gols', value: entry.gols },
    { label: 'Gols contra', value: entry.gols_contra },
    { label: 'Aproveitamento', value: `${entry.aproveitamento}%` },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-lg">
              {entry.nome.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-gray-800 font-semibold">{entry.nome}</p>
              <PositionBadge posicao={entry.posicao_principal} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stats */}
        <div className="p-4">
          <div className="grid grid-cols-4 gap-2 mb-4">
            {stats.map(s => (
              <div key={s.label} className="bg-gray-50 rounded-xl p-2.5 text-center">
                <p className="text-gray-800 font-bold text-lg leading-none">{s.value}</p>
                <p className="text-gray-400 text-xs mt-1 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Últimos 5 */}
          {entry.ultimos5.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Últimos 5</p>
              <div className="flex gap-1.5">
                {entry.ultimos5.map((r, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold ${RESULTADO_STYLE[r]}`}
                  >
                    {r}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
