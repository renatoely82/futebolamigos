'use client'

import { useState, useEffect } from 'react'
import type { ConfrontoEntry } from '@/app/api/temporadas/[id]/confrontos/route'
import { getTeamColor, getTeamBg, getTeamBar } from '@/lib/team-colors'

interface Props {
  temporadaId?: string
  dataInicio?: string
  dataFim?: string
  data?: ConfrontoEntry[]   // pre-loaded data (bypasses fetch when provided)
}

export default function ConfrontosTab({ temporadaId, dataInicio, dataFim, data: preloaded }: Props) {
  const [confrontos, setConfrontos] = useState<ConfrontoEntry[]>(preloaded ?? [])
  const [loading, setLoading] = useState(preloaded === undefined)

  useEffect(() => {
    if (preloaded !== undefined) { setConfrontos(preloaded); return }
    if (!temporadaId) return
    setLoading(true)
    const params = new URLSearchParams()
    if (dataInicio) params.set('data_inicio', dataInicio)
    if (dataFim) params.set('data_fim', dataFim)
    fetch(`/api/temporadas/${temporadaId}/confrontos?${params}`)
      .then(r => r.json())
      .then(data => { setConfrontos(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [temporadaId, dataInicio, dataFim, preloaded])

  if (loading) {
    return (
      <div className="divide-y divide-gray-100">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-4 py-4 animate-pulse">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="h-4 bg-gray-200 rounded w-40" />
              <div className="h-4 bg-gray-200 rounded w-16" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="h-10 bg-gray-200 rounded-lg" />
              <div className="h-10 bg-gray-200 rounded-lg" />
              <div className="h-10 bg-gray-200 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (confrontos.length === 0) {
    return (
      <div className="py-16 text-center text-gray-500 text-sm">
        Nenhum confronto com resultado registrado neste período.
      </div>
    )
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-xs uppercase tracking-wide border-b border-gray-100">
              <th className="text-left py-3 px-4">Confronto</th>
              <th className="text-center py-3 px-3">J</th>
              <th className="text-center py-3 px-3 text-green-600">V</th>
              <th className="text-center py-3 px-3">E</th>
              <th className="text-center py-3 px-3 text-red-500">V</th>
              <th className="text-center py-3 px-3">Gols</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {confrontos.map(c => {
              const pctA = c.jogos > 0 ? Math.round((c.vitorias_a / c.jogos) * 100) : 0
              const pctB = c.jogos > 0 ? Math.round((c.vitorias_b / c.jogos) * 100) : 0
              const dominante = c.vitorias_a > c.vitorias_b ? c.time_a : c.vitorias_b > c.vitorias_a ? c.time_b : null

              return (
                <tr key={`${c.time_a}||${c.time_b}`} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${getTeamColor(c.time_a, 'text-gray-800')}`}>{c.time_a}</span>
                      <span className="text-gray-400 text-xs">×</span>
                      <span className={`font-medium ${getTeamColor(c.time_b, 'text-gray-800')}`}>{c.time_b}</span>
                      {dominante && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ml-1 ${getTeamBg(dominante, 'bg-gray-100')} ${getTeamColor(dominante, 'text-gray-700')} border border-current/20`}>
                          {dominante} domina
                        </span>
                      )}
                    </div>
                    {/* Mini progress bar */}
                    <div className="flex h-1 mt-2 rounded-full overflow-hidden bg-gray-100 w-48">
                      <div className={`${getTeamBar(c.time_a, 'bg-gray-500')} transition-all`} style={{ width: `${pctA}%` }} />
                      <div className="bg-gray-300 transition-all" style={{ width: `${c.empates / c.jogos * 100}%` }} />
                      <div className={`${getTeamBar(c.time_b, 'bg-gray-400')} transition-all`} style={{ width: `${pctB}%` }} />
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center text-gray-600">{c.jogos}</td>
                  <td className="py-3 px-3 text-center font-semibold text-green-600">{c.vitorias_a}</td>
                  <td className="py-3 px-3 text-center text-gray-500">{c.empates}</td>
                  <td className="py-3 px-3 text-center font-semibold text-blue-500">{c.vitorias_b}</td>
                  <td className="py-3 px-3 text-center">
                    <span className="text-gray-700 font-medium">{c.gols_a}</span>
                    <span className="text-gray-400 mx-1">–</span>
                    <span className="text-gray-700 font-medium">{c.gols_b}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden divide-y divide-gray-100">
        {confrontos.map(c => {
          const pctA = c.jogos > 0 ? (c.vitorias_a / c.jogos) * 100 : 0
          const pctEmpate = c.jogos > 0 ? (c.empates / c.jogos) * 100 : 0
          const pctB = c.jogos > 0 ? (c.vitorias_b / c.jogos) * 100 : 0
          const dominante = c.vitorias_a > c.vitorias_b ? c.time_a : c.vitorias_b > c.vitorias_a ? c.time_b : null

          return (
            <div key={`${c.time_a}||${c.time_b}`} className="px-4 py-4">
              {/* Teams header */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-gray-800 text-sm">{c.time_a}</span>
                  <span className="text-gray-400 text-xs">×</span>
                  <span className="font-semibold text-gray-800 text-sm">{c.time_b}</span>
                </div>
                <span className="text-xs text-gray-400 shrink-0">{c.jogos} jogo{c.jogos !== 1 ? 's' : ''}</span>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
                <div className={`${getTeamBg(c.time_a, 'bg-gray-50')} rounded-lg px-2 py-2`}>
                  <p className={`text-lg font-bold ${getTeamColor(c.time_a, 'text-gray-700')}`}>{c.vitorias_a}</p>
                  <p className="text-gray-500 mt-0.5 leading-tight">{c.time_a}</p>
                </div>
                <div className="bg-gray-50 rounded-lg px-2 py-2">
                  <p className="text-lg font-bold text-gray-500">{c.empates}</p>
                  <p className="text-gray-400 mt-0.5">Empates</p>
                </div>
                <div className={`${getTeamBg(c.time_b, 'bg-gray-50')} rounded-lg px-2 py-2`}>
                  <p className={`text-lg font-bold ${getTeamColor(c.time_b, 'text-gray-700')}`}>{c.vitorias_b}</p>
                  <p className="text-gray-500 mt-0.5 leading-tight">{c.time_b}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-100">
                <div className={getTeamBar(c.time_a, 'bg-gray-500')} style={{ width: `${pctA}%` }} />
                <div className="bg-gray-300" style={{ width: `${pctEmpate}%` }} />
                <div className={getTeamBar(c.time_b, 'bg-gray-400')} style={{ width: `${pctB}%` }} />
              </div>

              {/* Goals + dominante */}
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500">
                  Gols: <span className="font-medium text-gray-700">{c.gols_a} – {c.gols_b}</span>
                </span>
                {dominante && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${getTeamBg(dominante, 'bg-gray-100')} ${getTeamColor(dominante, 'text-gray-700')} border border-current/20`}>
                    {dominante} domina
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
