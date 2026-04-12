'use client'

import type { ClassificacaoEntry } from '@/lib/supabase'

interface Props {
  entries: ClassificacaoEntry[]
}

const MEDALS = ['🥇', '🥈', '🥉']

export default function ClassificacaoTable({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Nenhuma partida realizada com resultado registrado nesta temporada.</p>
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
            <th className="text-center py-2.5 px-2">J</th>
            <th className="text-center py-2.5 px-2">V</th>
            <th className="text-center py-2.5 px-2">E</th>
            <th className="text-center py-2.5 px-2">D</th>
            <th className="text-center py-2.5 px-2 font-bold text-white">Pts</th>
            <th className="text-center py-2.5 px-2">Gols</th>
            <th className="text-center py-2.5 px-2">Aprov%</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1e1e1e]">
          {entries.map((entry, idx) => (
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
              <td className="py-3 px-2 text-center text-gray-300">{entry.jogos}</td>
              <td className="py-3 px-2 text-center text-green-400">{entry.vitorias}</td>
              <td className="py-3 px-2 text-center text-yellow-400">{entry.empates}</td>
              <td className="py-3 px-2 text-center text-red-400">{entry.derrotas}</td>
              <td className="py-3 px-2 text-center font-bold text-white">{entry.pontos}</td>
              <td className="py-3 px-2 text-center text-gray-300">{entry.gols}</td>
              <td className="py-3 px-2 text-center text-gray-300">{entry.aproveitamento.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
