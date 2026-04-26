'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Jogador, Temporada } from '@/lib/supabase'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import { SkeletonLine, SkeletonCircle } from '@/components/ui/Skeleton'
import type { JogadorPartidaEntry, JogadorTemporadaData } from '@/app/api/temporadas/[id]/jogadores/[jogadorId]/route'

// ── derived stats helpers ─────────────────────────────────────────────────────

function pct(num: number, den: number, decimals = 1) {
  if (den === 0) return 0
  return Math.round((num / den) * Math.pow(10, decimals + 2)) / Math.pow(10, decimals)
}

function calcStreak(partidas: JogadorPartidaEntry[]): { tipo: 'V' | 'E' | 'D'; count: number } | null {
  // partidas come newest-first from API
  const withResult = partidas.filter(p => p.resultado !== null)
  if (withResult.length === 0) return null
  const tipo = withResult[0].resultado!
  let count = 0
  for (const p of withResult) {
    if (p.resultado === tipo) count++
    else break
  }
  return { tipo, count }
}

function calcBestWinStreak(partidas: JogadorPartidaEntry[]): number {
  // partidas come newest-first — reverse for chronological order
  const chrono = [...partidas].reverse()
  let best = 0, cur = 0
  for (const p of chrono) {
    if (p.resultado === 'V') { cur++; best = Math.max(best, cur) }
    else cur = 0
  }
  return best
}

const RESULTADO_STYLE: Record<string, string> = {
  V: 'bg-green-100 text-green-700 border-green-200',
  E: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  D: 'bg-red-100 text-red-600 border-red-200',
}

const STREAK_STYLE: Record<string, string> = {
  V: 'bg-green-100 text-green-700 border-green-200',
  E: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  D: 'bg-red-50 text-red-500 border-red-200',
}

const STREAK_LABEL: Record<string, string> = {
  V: 'vitória',
  E: 'empate',
  D: 'derrota',
}

function StatCard({ label, value, sub, color = 'text-gray-800' }: {
  label: string; value: string | number; sub?: string; color?: string
}) {
  return (
    <div className="bg-white border border-[#e0e0e0] rounded-xl px-3 py-3 text-center">
      <p className={`text-xl sm:text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5 leading-tight">{label}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── component ─────────────────────────────────────────────────────────────────

export default function JogadorTemporadaPage() {
  const { id: temporadaId, jogadorId } = useParams<{ id: string; jogadorId: string }>()
  const [jogador, setJogador] = useState<Jogador | null>(null)
  const [temporada, setTemporada] = useState<Temporada | null>(null)
  const [partidas, setPartidas] = useState<JogadorPartidaEntry[]>([])
  const [totalPartidasTemporada, setTotalPartidasTemporada] = useState(0)
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
      if (pRes.ok) {
        const data: JogadorTemporadaData = await pRes.json()
        setPartidas(data.partidas)
        setTotalPartidasTemporada(data.totalPartidasTemporada)
      }
      setLoading(false)
    }
    load()
  }, [temporadaId, jogadorId])

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-5">
        <div>
          <SkeletonLine className="h-3 w-48 mb-3" />
          <SkeletonLine className="h-7 w-40 mb-1.5" />
          <SkeletonLine className="h-4 w-28" />
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-[#e0e0e0] rounded-xl px-3 py-3 text-center space-y-1.5">
              <SkeletonLine className="h-6 w-8 mx-auto" />
              <SkeletonLine className="h-3 w-10 mx-auto" />
            </div>
          ))}
        </div>
        <div className="bg-white border border-[#e0e0e0] rounded-xl p-4 space-y-3">
          <SkeletonLine className="h-4 w-32" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonLine key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        </div>
        <div className="bg-white border border-[#e0e0e0] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#e0e0e0]">
            <SkeletonLine className="h-5 w-44" />
          </div>
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 gap-4">
                <SkeletonLine className="h-4 w-24" />
                <SkeletonLine className="h-5 w-8 rounded-full" />
                <div className="flex gap-4 ml-auto">
                  <SkeletonLine className="h-4 w-6" />
                  <SkeletonLine className="h-4 w-6" />
                  <SkeletonLine className="h-4 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
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

  // ── basic stats ──────────────────────────────────────────────────────────
  const totalJogos = partidas.length
  const vitorias = partidas.filter(p => p.resultado === 'V').length
  const empates = partidas.filter(p => p.resultado === 'E').length
  const derrotas = partidas.filter(p => p.resultado === 'D').length
  const totalGols = partidas.reduce((s, p) => s + p.gols_marcados, 0)
  const totalGC = partidas.reduce((s, p) => s + p.gols_contra, 0)

  // ── advanced stats ───────────────────────────────────────────────────────
  const pontos = vitorias * 3 + empates
  const aproveitamento = pct(pontos, totalJogos * 3)
  const mediaGols = totalJogos > 0 ? Math.round((totalGols / totalJogos) * 100) / 100 : 0
  const saldoGols = totalGols - totalGC
  const participacao = pct(totalJogos, totalPartidasTemporada)
  const jogosComGol = partidas.filter(p => p.gols_marcados > 0).length
  const jogosSemGC = partidas.filter(p => p.gols_contra === 0 && p.resultado !== null).length
  const pctVitorias = pct(vitorias, totalJogos)

  const streak = calcStreak(partidas)
  const bestWinStreak = calcBestWinStreak(partidas)
  const ultimos5 = partidas.filter(p => p.resultado !== null).slice(0, 5)

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div>
        <Breadcrumbs items={[
          { label: 'Temporadas', href: '/temporadas' },
          { label: temporada.nome, href: `/temporadas/${temporadaId}` },
          { label: jogador.nome },
        ]} />
        <h1 className="text-gray-800 text-2xl font-bold mt-1">{jogador.nome}</h1>
        <p className="text-gray-500 text-sm mt-0.5">{temporada.nome}</p>
      </div>

      {/* Basic stats row */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <StatCard label="Jogos" value={totalJogos} />
        <StatCard label="Vitórias" value={vitorias} color="text-green-600" />
        <StatCard label="Empates" value={empates} color="text-yellow-600" />
        <StatCard label="Derrotas" value={derrotas} color="text-red-500" />
        <StatCard label="GA" value={totalGols} />
        <StatCard label="GC" value={totalGC} />
      </div>

      {/* Advanced analysis card */}
      {totalJogos > 0 && (
        <div className="bg-white border border-[#e0e0e0] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Análise da Temporada</span>
            {streak && (
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${STREAK_STYLE[streak.tipo]}`}>
                {streak.count} {STREAK_LABEL[streak.tipo]}{streak.count !== 1 ? 's' : ''} seguida{streak.count !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="p-4 space-y-4">
            {/* Derived metrics grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-gray-50 rounded-xl px-3 py-3 text-center">
                <p className="text-xl font-bold text-gray-800">{pontos}</p>
                <p className="text-xs text-gray-500 mt-0.5">Pontos</p>
              </div>
              <div className="bg-gray-50 rounded-xl px-3 py-3 text-center">
                <p className={`text-xl font-bold ${aproveitamento >= 50 ? 'text-green-600' : 'text-red-500'}`}>
                  {aproveitamento}%
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Aproveitamento</p>
              </div>
              <div className="bg-gray-50 rounded-xl px-3 py-3 text-center">
                <p className="text-xl font-bold text-gray-800">{pctVitorias}%</p>
                <p className="text-xs text-gray-500 mt-0.5">% Vitórias</p>
              </div>
              <div className="bg-gray-50 rounded-xl px-3 py-3 text-center">
                <p className={`text-xl font-bold ${participacao >= 70 ? 'text-green-600' : participacao >= 40 ? 'text-yellow-600' : 'text-gray-600'}`}>
                  {participacao}%
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Participação</p>
                <p className="text-[10px] text-gray-400">{totalJogos}/{totalPartidasTemporada} jogos</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-gray-50 rounded-xl px-3 py-3 text-center">
                <p className="text-xl font-bold text-gray-800">{mediaGols.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-0.5">Média gols/jogo</p>
              </div>
              <div className="bg-gray-50 rounded-xl px-3 py-3 text-center">
                <p className={`text-xl font-bold ${saldoGols > 0 ? 'text-green-600' : saldoGols < 0 ? 'text-red-500' : 'text-gray-600'}`}>
                  {saldoGols > 0 ? '+' : ''}{saldoGols}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Saldo de gols</p>
              </div>
              <div className="bg-gray-50 rounded-xl px-3 py-3 text-center">
                <p className="text-xl font-bold text-gray-800">{jogosComGol}</p>
                <p className="text-xs text-gray-500 mt-0.5">Jogos c/ gol</p>
                <p className="text-[10px] text-gray-400">de {totalJogos}</p>
              </div>
              <div className="bg-gray-50 rounded-xl px-3 py-3 text-center">
                <p className="text-xl font-bold text-gray-800">{jogosSemGC}</p>
                <p className="text-xs text-gray-500 mt-0.5">Jogos sem GC</p>
                {bestWinStreak > 1 && (
                  <p className="text-[10px] text-gray-400">Melhor: {bestWinStreak}V seg.</p>
                )}
              </div>
            </div>

            {/* Forma últimos 5 */}
            {ultimos5.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-2">Últimas {ultimos5.length} partidas</p>
                <div className="flex items-center gap-1.5">
                  {ultimos5.map((p, i) => (
                    <span
                      key={i}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${RESULTADO_STYLE[p.resultado!]}`}
                    >
                      {p.resultado}
                    </span>
                  ))}
                  {ultimos5.length < 5 && Array.from({ length: 5 - ultimos5.length }).map((_, i) => (
                    <span key={`empty-${i}`} className="w-8 h-8 rounded-full border border-dashed border-gray-200 bg-gray-50" />
                  ))}
                  <span className="ml-2 text-xs text-gray-400">← mais recente</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Matches table */}
      <div className="bg-white border border-[#e0e0e0] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e0e0e0] flex items-center gap-2">
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
          <>
            {/* Mobile card view */}
            <div className="md:hidden divide-y divide-gray-100">
              {partidas.map(p => (
                <div key={p.partida_id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/partidas/${p.partida_id}`} className="text-gray-800 font-medium hover:text-green-700 hover:underline transition-colors text-sm">
                      {format(parseISO(p.data), 'dd/MM/yyyy', { locale: ptBR })}
                    </Link>
                    {p.resultado ? (
                      <span className={`text-xs font-bold border px-2 py-0.5 rounded-full shrink-0 ${RESULTADO_STYLE[p.resultado]}`}>
                        {p.resultado}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {p.local && <span>{p.local}</span>}
                      <span>GA: <span className={p.gols_marcados > 0 ? 'font-semibold text-gray-700' : ''}>{p.gols_marcados}</span></span>
                      <span>GC: <span className={p.gols_contra > 0 ? 'font-semibold text-red-600' : ''}>{p.gols_contra}</span></span>
                    </div>
                    {p.placar_time_a !== null && p.placar_time_b !== null && (
                      <span className="text-gray-500 text-xs">
                        {p.nome_time_a} {p.placar_time_a}×{p.placar_time_b} {p.nome_time_b}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table view */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                    <th className="text-left py-2.5 px-4">Data</th>
                    <th className="text-center py-2.5 px-3">Resultado</th>
                    <th className="text-center py-2.5 px-3" title="Gols a Favor">GA</th>
                    <th className="text-center py-2.5 px-3" title="Gols Contra">GC</th>
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
                            {p.resultado}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center text-gray-700">
                        {p.gols_marcados > 0
                          ? <span className="font-semibold">{p.gols_marcados}</span>
                          : <span className="text-gray-400">0</span>}
                      </td>
                      <td className="py-3 px-3 text-center text-gray-700">
                        {p.gols_contra > 0
                          ? <span className="font-semibold text-red-600">{p.gols_contra}</span>
                          : <span className="text-gray-400">0</span>}
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
          </>
        )}
      </div>
    </div>
  )
}
