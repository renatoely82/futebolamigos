'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getTeamColor } from '@/lib/team-colors'
import type { PortalPartida } from '@/app/api/public/portal/[id]/route'
import { POSICOES } from '@/lib/supabase'

const STATUS_LABEL: Record<string, string> = {
  agendada: 'Agendada',
  realizada: 'Realizada',
  cancelada: 'Cancelada',
}
const STATUS_COLOR: Record<string, string> = {
  agendada: 'text-blue-300 bg-blue-900/40 border-blue-700',
  realizada: 'text-green-300 bg-green-900/40 border-green-700',
  cancelada: 'text-gray-400 bg-gray-700/40 border-gray-600',
}

function formatDate(data: string) {
  return format(parseISO(data), "EEE, dd 'de' MMM", { locale: ptBR })
}

interface Props {
  partidas: PortalPartida[]
}

export default function PortalPartidasTab({ partidas }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (partidas.length === 0) {
    return <p className="text-gray-400 text-sm text-center py-10">Nenhuma partida nesta temporada.</p>
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {partidas.map(p => {
        const hasScore = p.placar_time_a !== null && p.placar_time_b !== null
        const isExpanded = expandedId === p.id
        const colorA = getTeamColor(p.nome_time_a, 'text-green-400')
        const colorB = getTeamColor(p.nome_time_b, 'text-blue-400')

        return (
          <div
            key={p.id}
            className={`rounded-xl overflow-hidden border transition-all cursor-pointer ${
              isExpanded ? 'border-green-400 shadow-md' : 'border-gray-200 hover:border-green-400 hover:shadow-md'
            }`}
            onClick={() => setExpandedId(isExpanded ? null : p.id)}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-2 gap-2"
              style={{ background: 'linear-gradient(135deg, #006b3d, #00894e)' }}
            >
              <p className="text-white text-sm font-medium capitalize truncate">
                {formatDate(p.data)}
                {p.local && <span className="text-green-200 font-normal"> · {p.local}</span>}
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs border px-2 py-0.5 rounded-full ${STATUS_COLOR[p.status]}`}>
                  {STATUS_LABEL[p.status]}
                </span>
                <span className="text-green-200 text-xs">{isExpanded ? '▲' : '▼'}</span>
              </div>
            </div>

            {/* Placar */}
            <div className="flex items-center bg-white px-4 py-5 gap-2">
              <div className="flex-1 text-center">
                <p className="font-bold text-gray-800 text-sm leading-tight">{p.nome_time_a}</p>
              </div>
              <div className="flex items-center justify-center gap-2 px-4 shrink-0">
                {hasScore ? (
                  <>
                    <span className="text-4xl font-black text-gray-800 leading-none">{p.placar_time_a}</span>
                    <span className="text-2xl font-bold text-gray-300 leading-none">×</span>
                    <span className="text-4xl font-black text-gray-800 leading-none">{p.placar_time_b}</span>
                  </>
                ) : (
                  <span className="text-2xl font-bold text-gray-300 leading-none">vs</span>
                )}
              </div>
              <div className="flex-1 text-center">
                <p className="font-bold text-gray-800 text-sm leading-tight">{p.nome_time_b}</p>
              </div>
            </div>

            {/* Escalação expandida */}
            {isExpanded && (
              <div className="border-t border-gray-100 bg-gray-50 px-4 py-4" onClick={e => e.stopPropagation()}>
                {p.escalacao ? (
                  <div className="grid grid-cols-2 gap-4">
                    {/* Time A */}
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${colorA}`}>{p.nome_time_a}</p>
                      <div className="space-y-1.5">
                        {[...p.escalacao.time_a]
                          .sort((a, b) => POSICOES.indexOf(a.posicao as never) - POSICOES.indexOf(b.posicao as never) || a.nome.localeCompare(b.nome, 'pt-BR'))
                          .map(j => (
                            <div key={j.id} className="flex items-center gap-1.5">
                              <span className="text-gray-400 text-xs w-12 shrink-0 truncate">{j.posicao}</span>
                              <span className="text-gray-800 text-sm flex-1 truncate">{j.nome}</span>
                              {(j.gols ?? 0) > 0 && <span className="text-xs text-gray-500 shrink-0">⚽ {j.gols}</span>}
                              {(j.gols_contra ?? 0) > 0 && <span className="text-xs text-red-400 shrink-0">⚽↩ {j.gols_contra}</span>}
                            </div>
                          ))}
                      </div>
                    </div>
                    {/* Time B */}
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${colorB}`}>{p.nome_time_b}</p>
                      <div className="space-y-1.5">
                        {[...p.escalacao.time_b]
                          .sort((a, b) => POSICOES.indexOf(a.posicao as never) - POSICOES.indexOf(b.posicao as never) || a.nome.localeCompare(b.nome, 'pt-BR'))
                          .map(j => (
                            <div key={j.id} className="flex items-center gap-1.5">
                              <span className="text-gray-400 text-xs w-12 shrink-0 truncate">{j.posicao}</span>
                              <span className="text-gray-800 text-sm flex-1 truncate">{j.nome}</span>
                              {(j.gols ?? 0) > 0 && <span className="text-xs text-gray-500 shrink-0">⚽ {j.gols}</span>}
                              {(j.gols_contra ?? 0) > 0 && <span className="text-xs text-red-400 shrink-0">⚽↩ {j.gols_contra}</span>}
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm text-center py-1">Escalação não definida.</p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
