'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Jogador, Temporada } from '@/lib/supabase'
import type { JogadorPartidaEntry } from '@/app/api/temporadas/[id]/jogadores/[jogadorId]/route'

export default function JogadorTemporadaPage() {
  const { id: temporadaId, jogadorId } = useParams<{ id: string; jogadorId: string }>()
  const [jogador, setJogador] = useState<Jogador | null>(null)
  const [temporada, setTemporada] = useState<Temporada | null>(null)
  const [partidas, setPartidas] = useState<JogadorPartidaEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [jRes, tRes, pRes] = await Promise.all([
        fetch(`/api/jogadores/${jogadorId}`),
        fetch(`/api/temporadas/${temporadaId}`),
        fetch(`/api/temporadas/${temporadaId}/jogadores/${jogadorId}`),
      ])
      if (jRes.ok) setJogador(await jRes.json())
      if (tRes.ok) setTemporada(await tRes.json())
      if (pRes.ok) setPartidas(await pRes.json())
      setLoading(false)
    }
    load()
  }, [temporadaId, jogadorId])

  if (loading) {
    return <div className="p-6 text-center text-gray-500 py-20">Carregando...</div>
  }

  if (!jogador || !temporada) {
    return (
      <div className="p-6 text-center py-20">
        <p className="text-gray-500">Jogador ou temporada não encontrado.</p>
        <Link href={`/temporadas/${temporadaId}`} className="mt-4 inline-block text-green-600 hover:text-green-700 text-sm">
          Voltar à temporada
        </Link>
      </div>
    )
  }

  const totalJogos = partidas.length
  const vitorias = partidas.filter(p => p.resultado === 'V').length
  const empates = partidas.filter(p => p.resultado === 'E').length
  const derrotas = partidas.filter(p => p.resultado === 'D').length
  const totalGols = partidas.reduce((s, p) => s + p.gols_marcados, 0)
  const totalGC = partidas.reduce((s, p) => s + p.gols_contra, 0)

  const RESULTADO_STYLE: Record<string, string> = {
    V: 'bg-green-100 text-green-700 border-green-200',
    E: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    D: 'bg-red-100 text-red-600 border-red-200',
  }
  const RESULTADO_LABEL: Record<string, string> = { V: 'V', E: 'E', D: 'D' }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/temporadas/${temporadaId}`} className="text-gray-400 hover:text-gray-700 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m7-7-7 7 7 7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-gray-800 text-2xl font-bold">{jogador.nome}</h1>
            <p className="text-gray-500 text-sm mt-0.5">{temporada.nome}</p>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        <div className="bg-white border border-[#e2e8f0] rounded-xl px-4 py-3 text-center">
          <p className="text-2xl font-bold text-gray-800">{totalJogos}</p>
          <p className="text-xs text-gray-500 mt-0.5">Jogos</p>
        </div>
        <div className="bg-white border border-[#e2e8f0] rounded-xl px-4 py-3 text-center">
          <p className="text-2xl font-bold text-green-600">{vitorias}</p>
          <p className="text-xs text-gray-500 mt-0.5">Vitórias</p>
        </div>
        <div className="bg-white border border-[#e2e8f0] rounded-xl px-4 py-3 text-center">
          <p className="text-2xl font-bold text-yellow-600">{empates}</p>
          <p className="text-xs text-gray-500 mt-0.5">Empates</p>
        </div>
        <div className="bg-white border border-[#e2e8f0] rounded-xl px-4 py-3 text-center">
          <p className="text-2xl font-bold text-red-600">{derrotas}</p>
          <p className="text-xs text-gray-500 mt-0.5">Derrotas</p>
        </div>
        <div className="bg-white border border-[#e2e8f0] rounded-xl px-4 py-3 text-center">
          <p className="text-2xl font-bold text-gray-800">{totalGols}</p>
          <p className="text-xs text-gray-500 mt-0.5" title="Gols a Favor">GA</p>
        </div>
        <div className="bg-white border border-[#e2e8f0] rounded-xl px-4 py-3 text-center">
          <p className="text-2xl font-bold text-gray-800">{totalGC}</p>
          <p className="text-xs text-gray-500 mt-0.5" title="Gols Contra">GC</p>
        </div>
      </div>

      {/* Matches table */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e9ecf1] flex items-center gap-2">
          <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
            <path strokeWidth={1.5} d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          <h2 className="text-gray-800 font-semibold">Partidas na Temporada</h2>
          <span className="text-gray-500 text-sm">({totalJogos})</span>
        </div>

        {partidas.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-sm">
            Nenhuma partida encontrada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                  <th className="text-left py-2.5 px-4">Data</th>
                  <th className="text-center py-2.5 px-3">Resultado</th>
                  <th className="text-center py-2.5 px-3 cursor-help" title="Gols a Favor">GA</th>
                  <th className="text-center py-2.5 px-3 cursor-help" title="Gols Contra">GC</th>
                  <th className="text-center py-2.5 px-3">Placar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {partidas.map(p => (
                  <tr key={p.partida_id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <Link href={`/partidas/${p.partida_id}`} className="text-gray-800 font-medium hover:text-green-700 hover:underline transition-colors">
                        {format(parseISO(p.data), 'dd/MM/yyyy', { locale: ptBR })}
                      </Link>
                      {p.local && <p className="text-gray-500 text-xs mt-0.5">{p.local}</p>}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {p.resultado ? (
                        <span className={`text-xs font-bold border px-2 py-0.5 rounded-full ${RESULTADO_STYLE[p.resultado]}`}>
                          {RESULTADO_LABEL[p.resultado]}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center text-gray-700">
                      {p.gols_marcados > 0 ? (
                        <span className="font-semibold">{p.gols_marcados}</span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center text-gray-700">
                      {p.gols_contra > 0 ? (
                        <span className="font-semibold text-red-600">{p.gols_contra}</span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
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
