'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Jogador } from '@/lib/supabase'
import type { JogadorPartidaEntry } from '@/app/api/temporadas/[id]/jogadores/[jogadorId]/route'

interface Props {
  temporadaId: string
  jogadorId: string
  onNomeLoaded?: (nome: string) => void
}

const RESULTADO_STYLE: Record<string, string> = {
  V: 'bg-green-100 text-green-700 border-green-200',
  E: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  D: 'bg-red-100 text-red-600 border-red-200',
}

export default function JogadorDetalheModal({ temporadaId, jogadorId, onNomeLoaded }: Props) {
  const [jogador, setJogador] = useState<Jogador | null>(null)
  const [partidas, setPartidas] = useState<JogadorPartidaEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setJogador(null)
    setPartidas([])
    async function load() {
      const [jRes, pRes] = await Promise.all([
        fetch(`/api/jogadores/${jogadorId}`),
        fetch(`/api/temporadas/${temporadaId}/jogadores/${jogadorId}`),
      ])
      if (jRes.ok) {
        const j: Jogador = await jRes.json()
        setJogador(j)
        onNomeLoaded?.(j.nome)
      }
      if (pRes.ok) setPartidas(await pRes.json())
      setLoading(false)
    }
    load()
  }, [temporadaId, jogadorId, onNomeLoaded])

  if (loading) {
    return <div className="py-10 text-center text-gray-500 text-sm">Carregando...</div>
  }

  if (!jogador) {
    return <div className="py-10 text-center text-gray-500 text-sm">Jogador não encontrado.</div>
  }

  const totalJogos = partidas.length
  const vitorias = partidas.filter(p => p.resultado === 'V').length
  const empates = partidas.filter(p => p.resultado === 'E').length
  const derrotas = partidas.filter(p => p.resultado === 'D').length
  const totalGols = partidas.reduce((s, p) => s + p.gols_marcados, 0)
  const totalGC = partidas.reduce((s, p) => s + p.gols_contra, 0)
  const aproveitamento = totalJogos > 0 ? ((vitorias * 3 + empates) / (totalJogos * 3)) * 100 : 0

  return (
    <div className="space-y-4">
      {/* Subtítulo */}
      <p className="text-gray-500 text-sm">
        {totalJogos} jogo{totalJogos !== 1 ? 's' : ''} · {aproveitamento.toFixed(0)}% aproveitamento
      </p>

      {/* Stats grid */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <div className="bg-gray-50 border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-center">
          <p className="text-xl font-bold text-gray-800">{totalJogos}</p>
          <p className="text-xs text-gray-500 mt-0.5">Jogos</p>
        </div>
        <div className="bg-gray-50 border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-center">
          <p className="text-xl font-bold text-green-600">{vitorias}</p>
          <p className="text-xs text-gray-500 mt-0.5">Vitórias</p>
        </div>
        <div className="bg-gray-50 border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-center">
          <p className="text-xl font-bold text-yellow-600">{empates}</p>
          <p className="text-xs text-gray-500 mt-0.5">Empates</p>
        </div>
        <div className="bg-gray-50 border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-center">
          <p className="text-xl font-bold text-red-600">{derrotas}</p>
          <p className="text-xs text-gray-500 mt-0.5">Derrotas</p>
        </div>
        <div className="bg-gray-50 border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-center">
          <p className="text-xl font-bold text-gray-800">{totalGols}</p>
          <p className="text-xs text-gray-500 mt-0.5" title="Gols a Favor">GA</p>
        </div>
        <div className="bg-gray-50 border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-center">
          <p className="text-xl font-bold text-gray-800">{totalGC}</p>
          <p className="text-xs text-gray-500 mt-0.5" title="Gols Contra">GC</p>
        </div>
      </div>

      {/* Matches */}
      <div className="border border-[#e2e8f0] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#e9ecf1] flex items-center gap-2 bg-gray-50">
          <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
            <path strokeWidth={1.5} d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          <h3 className="text-gray-800 font-semibold text-sm">Histórico de Jogos</h3>
          <span className="text-gray-500 text-xs">({totalJogos})</span>
        </div>

        {partidas.length === 0 ? (
          <div className="py-8 text-center text-gray-500 text-sm">
            Nenhuma partida encontrada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200 bg-white">
                  <th className="text-left py-2 px-4">Data</th>
                  <th className="text-center py-2 px-3">Res.</th>
                  <th className="text-center py-2 px-3 cursor-help" title="Gols a Favor">GA</th>
                  <th className="text-center py-2 px-3 cursor-help" title="Gols Contra">GC</th>
                  <th className="text-center py-2 px-3">Placar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {partidas.map(p => (
                  <tr key={p.partida_id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 px-4">
                      <Link
                        href={`/partidas/${p.partida_id}`}
                        className="text-gray-800 font-medium hover:text-green-700 hover:underline transition-colors"
                      >
                        {format(parseISO(p.data), 'dd/MM/yyyy', { locale: ptBR })}
                      </Link>
                      {p.local && <p className="text-gray-500 text-xs mt-0.5">{p.local}</p>}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {p.resultado ? (
                        <span className={`text-xs font-bold border px-2 py-0.5 rounded-full ${RESULTADO_STYLE[p.resultado]}`}>
                          {p.resultado}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center text-gray-700">
                      {p.gols_marcados > 0 ? (
                        <span className="font-semibold">{p.gols_marcados}</span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center text-gray-700">
                      {p.gols_contra > 0 ? (
                        <span className="font-semibold text-red-600">{p.gols_contra}</span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {p.placar_time_a !== null && p.placar_time_b !== null ? (
                        <span className="text-gray-700 font-medium text-xs whitespace-nowrap">
                          {p.nome_time_a} {p.placar_time_a} × {p.placar_time_b} {p.nome_time_b}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
