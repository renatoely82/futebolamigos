'use client'

import Link from 'next/link'
import type { ClassificacaoEntry } from '@/lib/supabase'

interface Props {
  entries: ClassificacaoEntry[]
  temporadaId: string
  onSelectJogador?: (jogadorId: string) => void
}

const MEDALS = ['🥇', '🥈', '🥉']

export default function ClassificacaoTable({ entries, temporadaId, onSelectJogador }: Props) {
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
          <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
            <th className="text-left py-2.5 px-3 w-10">#</th>
            <th className="text-left py-2.5 px-3">Jogador</th>
            <th className="text-center py-2.5 px-2">J</th>
            <th className="text-center py-2.5 px-2">V</th>
            <th className="text-center py-2.5 px-2">E</th>
            <th className="text-center py-2.5 px-2">D</th>
            <th className="text-center py-2.5 px-2 font-bold text-gray-800">Pts</th>
            <th className="text-center py-2.5 px-2 cursor-help" title="Gols a Favor">GA</th>
            <th className="text-center py-2.5 px-2 cursor-help" title="Gols Contra">GC</th>
            <th className="text-center py-2.5 px-2">Aprov%</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {entries.map((entry, idx) => (
            <tr
              key={entry.jogador_id}
              className={`transition-colors ${idx < 3 ? 'bg-green-50' : 'hover:bg-gray-50'}`}
            >
              <td className="py-3 px-3 text-center">
                {idx < 3 ? (
                  <span className="text-base">{MEDALS[idx]}</span>
                ) : (
                  <span className="text-gray-500">{idx + 1}</span>
                )}
              </td>
              <td className="py-3 px-3">
                {onSelectJogador ? (
                  <button
                    onClick={() => onSelectJogador(entry.jogador_id)}
                    className={`font-medium hover:underline hover:text-green-700 transition-colors text-left ${idx < 3 ? 'text-gray-800' : 'text-gray-700'}`}
                  >
                    {entry.nome}
                  </button>
                ) : (
                  <Link
                    href={`/temporadas/${temporadaId}/jogadores/${entry.jogador_id}`}
                    className={`font-medium hover:underline hover:text-green-700 transition-colors ${idx < 3 ? 'text-gray-800' : 'text-gray-700'}`}
                  >
                    {entry.nome}
                  </Link>
                )}
              </td>
              <td className="py-3 px-2 text-center text-gray-600">{entry.jogos}</td>
              <td className="py-3 px-2 text-center text-green-600">{entry.vitorias}</td>
              <td className="py-3 px-2 text-center text-yellow-600">{entry.empates}</td>
              <td className="py-3 px-2 text-center text-red-600">{entry.derrotas}</td>
              <td className="py-3 px-2 text-center font-bold text-gray-800">{entry.pontos}</td>
              <td className="py-3 px-2 text-center text-gray-600">{entry.gols}</td>
              <td className="py-3 px-2 text-center text-gray-600">{entry.gols_contra}</td>
              <td className="py-3 px-2 text-center text-gray-600">{entry.aproveitamento.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
