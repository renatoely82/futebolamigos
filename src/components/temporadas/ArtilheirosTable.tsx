'use client'

import type { ClassificacaoEntry } from '@/lib/supabase'

interface Props {
  entries: ClassificacaoEntry[]
}

function initials(nome: string) {
  const parts = nome.trim().split(' ')
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function ArtilheirosTable({ entries }: Props) {
  const artilheiros = [...entries]
    .filter(e => e.gols > 0)
    .sort((a, b) => b.gols - a.gols || b.jogos - a.jogos)

  if (artilheiros.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Nenhum gol registrado nesta temporada.</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-100">
      {artilheiros.map((entry, idx) => (
        <div
          key={entry.jogador_id}
          className="flex items-center gap-3 px-4 py-3 hover:bg-[#f8faf8] transition-colors rounded-lg"
        >
          {/* Rank */}
          <span
            className={`w-7 text-center font-extrabold text-lg shrink-0 ${
              idx < 3 ? 'text-green-600' : 'text-gray-400'
            }`}
          >
            {idx + 1}
          </span>

          {/* Avatar */}
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{ background: 'linear-gradient(135deg, #006b3d, #00894e)' }}
          >
            {initials(entry.nome)}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[15px] text-gray-800 truncate">{entry.nome}</p>
            <p className="text-[12px] text-gray-400">
              {entry.jogos} {entry.jogos === 1 ? 'jogo' : 'jogos'} · {(entry.gols / entry.jogos).toFixed(2)}/jogo
            </p>
          </div>

          {/* Goals */}
          <span className="text-[28px] font-black text-green-600 leading-none shrink-0">
            {entry.gols}
          </span>
        </div>
      ))}
    </div>
  )
}
