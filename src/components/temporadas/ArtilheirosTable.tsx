'use client'

import type { ClassificacaoEntry } from '@/lib/supabase'

interface Props {
  entries: ClassificacaoEntry[]
}

const MEDALS = ['🥇', '🥈', '🥉']

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
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 text-xs uppercase tracking-wider border-b border-[#2a2a2a]">
            <th className="text-left py-2.5 px-3 w-10">#</th>
            <th className="text-left py-2.5 px-3">Jogador</th>
            <th className="text-center py-2.5 px-2">Posição</th>
            <th className="text-center py-2.5 px-2 font-bold text-white">Gols</th>
            <th className="text-center py-2.5 px-2">Jogos</th>
            <th className="text-center py-2.5 px-2">Média</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1e1e1e]">
          {artilheiros.map((entry, idx) => (
            <tr
              key={entry.jogador_id}
              className={`transition-colors ${idx < 3 ? 'bg-lime-500/5' : 'hover:bg-white/[0.02]'}`}
            >
              <td className="py-3 px-3 text-center">
                {idx < 3 ? (
                  <span className="text-base">{MEDALS[idx]}</span>
                ) : (
                  <span className="text-gray-500">{idx + 1}</span>
                )}
              </td>
              <td className="py-3 px-3">
                <span className={`font-medium ${idx < 3 ? 'text-white' : 'text-gray-200'}`}>
                  {entry.nome}
                </span>
              </td>
              <td className="py-3 px-2 text-center text-gray-400 text-xs">{entry.posicao_principal}</td>
              <td className="py-3 px-2 text-center font-bold text-lime-400 text-base">{entry.gols}</td>
              <td className="py-3 px-2 text-center text-gray-300">{entry.jogos}</td>
              <td className="py-3 px-2 text-center text-gray-400">
                {(entry.gols / entry.jogos).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
