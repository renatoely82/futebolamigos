'use client'

import Link from 'next/link'
import type { ClassificacaoEntry } from '@/lib/supabase'

interface Props {
  entries: ClassificacaoEntry[]
  temporadaId: string
  posicoes?: Map<string, number>
  onSelectJogador?: (jogadorId: string) => void
}

function getInitials(nome: string): string {
  const parts = nome.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const FORM_CONFIG = {
  V: { bg: 'bg-green-500', label: 'V' },
  E: { bg: 'bg-gray-400', label: 'E' },
  D: { bg: 'bg-red-500', label: 'D' },
} as const

function FormDot({ result }: { result: 'V' | 'E' | 'D' | null }) {
  if (!result) {
    return <span className="w-[18px] h-[18px] md:w-5 md:h-5 rounded-full bg-gray-200 inline-block" />
  }
  const { bg, label } = FORM_CONFIG[result]
  return (
    <span
      className={`w-[18px] h-[18px] md:w-5 md:h-5 rounded-full ${bg} inline-flex items-center justify-center text-white font-bold`}
      style={{ fontSize: '9px' }}
    >
      {label}
    </span>
  )
}

export default function ClassificacaoTable({ entries, temporadaId, posicoes, onSelectJogador }: Props) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Nenhuma partida realizada com resultado registrado nesta temporada.</p>
      </div>
    )
  }

  function renderNameEl(entry: ClassificacaoEntry) {
    return onSelectJogador ? (
      <button
        onClick={() => onSelectJogador(entry.jogador_id)}
        className="font-medium hover:text-green-700 transition-colors text-left text-gray-800 hover:underline"
      >
        {entry.nome}
      </button>
    ) : (
      <Link
        href={`/temporadas/${temporadaId}/jogadores/${entry.jogador_id}`}
        className="font-medium hover:text-green-700 transition-colors text-gray-800 hover:underline"
      >
        {entry.nome}
      </Link>
    )
  }

  return (
    <>
      {/* Mobile card view */}
      <div className="md:hidden space-y-2">
        {entries.map((entry, idx) => {
          const posicao = posicoes?.get(entry.jogador_id) ?? idx + 1
          const isTop3 = posicao <= 3
          const initials = getInitials(entry.nome)
          const slots = Array.from({ length: 5 }, (_, i) => entry.ultimos5[i] ?? null)

          return (
            <div key={entry.jogador_id} className="bg-white border border-[#e0e0e0] rounded-xl px-3 py-3">
              <div className="flex items-center gap-2.5">
                <span className={`text-sm font-bold w-5 text-center shrink-0 ${isTop3 ? 'text-green-700' : 'text-gray-400'}`}>
                  {posicao}
                </span>
                <span
                  className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: 'linear-gradient(135deg, #006b3d, #00894e)' }}
                >
                  {initials}
                </span>
                <div className="flex-1 min-w-0">
                  {renderNameEl(entry)}
                </div>
                <span className="text-lg font-bold text-green-700 shrink-0">{entry.pontos}<span className="text-xs text-gray-400 font-normal ml-0.5">pts</span></span>
              </div>
              <div className="flex items-center justify-between mt-2 pl-[3.25rem]">
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{entry.jogos}J</span>
                  <span className="text-green-600">{entry.vitorias}V</span>
                  <span>{entry.empates}E</span>
                  <span className="text-red-500">{entry.derrotas}D</span>
                  <span>{entry.aproveitamento.toFixed(0)}%</span>
                </div>
                <div className="flex items-center gap-0.5">
                  {slots.map((r, i) => (
                    <FormDot key={i} result={r} />
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-xs uppercase tracking-wide border-b border-gray-100">
              <th className="text-center py-3 px-2 w-8">#</th>
              <th className="text-left py-3 px-3">Jogador</th>
              <th className="text-center py-3 px-2 font-semibold text-gray-600">Pts</th>
              <th className="text-center py-3 px-2">J</th>
              <th className="text-center py-3 px-2">V</th>
              <th className="text-center py-3 px-2">E</th>
              <th className="text-center py-3 px-2">D</th>
              <th className="text-center py-3 px-2" title="Gols a Favor">GA</th>
              <th className="text-center py-3 px-2" title="Gols Contra">GC</th>
              <th className="text-center py-3 px-2">%</th>
              <th className="text-center py-3 px-2 whitespace-nowrap">Últimos 5</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {entries.map((entry, idx) => {
              const posicao = posicoes?.get(entry.jogador_id) ?? idx + 1
              const isTop3 = posicao <= 3
              const initials = getInitials(entry.nome)
              const slots = Array.from({ length: 5 }, (_, i) => entry.ultimos5[i] ?? null)

              return (
                <tr
                  key={entry.jogador_id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3 px-2 text-center">
                    <span className={`text-sm font-bold ${isTop3 ? 'text-green-700' : 'text-gray-400'}`}>
                      {posicao}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: 'linear-gradient(135deg, #006b3d, #00894e)' }}
                      >
                        {initials}
                      </span>
                      {renderNameEl(entry)}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className="font-bold text-green-700">{entry.pontos}</span>
                  </td>
                  <td className="py-3 px-2 text-center text-gray-600">{entry.jogos}</td>
                  <td className="py-3 px-2 text-center text-green-600 font-medium">{entry.vitorias}</td>
                  <td className="py-3 px-2 text-center text-gray-500">{entry.empates}</td>
                  <td className="py-3 px-2 text-center text-red-500">{entry.derrotas}</td>
                  <td className="py-3 px-2 text-center text-gray-600">{entry.gols}</td>
                  <td className="py-3 px-2 text-center text-gray-600">{entry.gols_contra}</td>
                  <td className="py-3 px-2 text-center text-gray-600">{entry.aproveitamento.toFixed(0)}%</td>
                  <td className="py-3 px-2">
                    <div className="flex items-center justify-center gap-0.5">
                      {slots.map((r, i) => (
                        <FormDot key={i} result={r} />
                      ))}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
