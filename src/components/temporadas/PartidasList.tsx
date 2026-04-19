'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Partida, PartidaJogadorComDetalhes, GolComDetalhes, SubstituicaoComDetalhes } from '@/lib/supabase'
import { POSICOES } from '@/lib/supabase'
import { getTeamColor } from '@/lib/team-colors'

interface Props {
  partidas: Partida[]
}

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

// ─── Expanded detail sub-component ───────────────────────────────────────────

interface ExpandedProps {
  partida: Partida
}

function PartidaExpandida({ partida }: ExpandedProps) {
  const [players, setPlayers] = useState<PartidaJogadorComDetalhes[]>([])
  const [gols, setGols] = useState<GolComDetalhes[]>([])
  const [substituicoes, setSubstituicoes] = useState<SubstituicaoComDetalhes[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/partidas/${partida.id}/jogadores`).then(r => r.json()),
      fetch(`/api/partidas/${partida.id}/gols`).then(r => r.json()),
      fetch(`/api/partidas/${partida.id}/substituicoes`).then(r => r.json()),
    ]).then(([pj, gl, sub]) => {
      setPlayers(Array.isArray(pj) ? pj : [])
      setGols(Array.isArray(gl) ? gl : [])
      setSubstituicoes(Array.isArray(sub) ? sub : [])
      setLoading(false)
    })
  }, [partida.id])

  const hasResult = partida.placar_time_a != null && partida.placar_time_b != null
  const colorA = getTeamColor(partida.nome_time_a, 'text-green-600')
  const colorB = getTeamColor(partida.nome_time_b, 'text-blue-600')

  const availablePlayers = players.filter(p => p.confirmado)
  const teamAIds = new Set(partida.times_escolhidos?.time_a ?? [])
  const teamBIds = new Set(partida.times_escolhidos?.time_b ?? [])

  const ausenteIds = new Set(substituicoes.map(s => s.jogador_ausente_id))
  const substitutoTime = new Map<string, 'A' | 'B'>()
  for (const s of substituicoes) {
    if (teamAIds.has(s.jogador_ausente_id)) substitutoTime.set(s.jogador_substituto_id, 'A')
    else if (teamBIds.has(s.jogador_ausente_id)) substitutoTime.set(s.jogador_substituto_id, 'B')
  }

  const byPosition = (a: PartidaJogadorComDetalhes, b: PartidaJogadorComDetalhes) => {
    const posDiff = POSICOES.indexOf(a.jogador.posicao_principal) - POSICOES.indexOf(b.jogador.posicao_principal)
    if (posDiff !== 0) return posDiff
    return a.jogador.nome.localeCompare(b.jogador.nome, 'pt-BR')
  }

  const playersA = availablePlayers
    .filter(p => (teamAIds.has(p.jogador_id) && !ausenteIds.has(p.jogador_id)) || substitutoTime.get(p.jogador_id) === 'A')
    .sort(byPosition)
  const playersB = availablePlayers
    .filter(p => (teamBIds.has(p.jogador_id) && !ausenteIds.has(p.jogador_id)) || substitutoTime.get(p.jogador_id) === 'B')
    .sort(byPosition)
  const unassigned = availablePlayers
    .filter(p => !teamAIds.has(p.jogador_id) && !teamBIds.has(p.jogador_id) && substitutoTime.get(p.jogador_id) === undefined)
    .sort(byPosition)

  const hasTeams = partida.times_escolhidos != null

  function renderPlayerRow(pj: PartidaJogadorComDetalhes) {
    const totalNormal = gols.filter(g => g.jogador_id === pj.jogador_id && !g.gol_contra).reduce((s, g) => s + g.quantidade, 0)
    const totalContra = gols.filter(g => g.jogador_id === pj.jogador_id && g.gol_contra).reduce((s, g) => s + g.quantidade, 0)
    return (
      <div key={pj.jogador_id} className="flex items-center gap-2">
        <span className="text-gray-800 text-sm flex-1 truncate">{pj.jogador.nome}</span>
        <span className="flex items-center gap-1 shrink-0">
          {totalNormal > 0 && <span className="text-xs font-semibold text-gray-500">⚽ {totalNormal}</span>}
          {totalContra > 0 && <span className="text-xs font-semibold text-red-400">GC {totalContra}</span>}
        </span>
      </div>
    )
  }

  return (
    <div className="border-t border-gray-100 bg-gray-50 px-4 py-4" onClick={e => e.stopPropagation()}>
      {loading ? (
        <p className="text-gray-400 text-sm text-center py-2">A carregar...</p>
      ) : (
        <>
          {/* Resultado */}
          {hasResult ? (
            <div className="flex items-center justify-center gap-6 mb-4">
              <div className="text-center">
                <div className={`text-xs font-medium uppercase tracking-wide mb-1 ${colorA}`}>{partida.nome_time_a}</div>
                <div className="text-gray-800 text-4xl font-bold">{partida.placar_time_a}</div>
              </div>
              <div className="text-gray-400 text-2xl font-bold">×</div>
              <div className="text-center">
                <div className={`text-xs font-medium uppercase tracking-wide mb-1 ${colorB}`}>{partida.nome_time_b}</div>
                <div className="text-gray-800 text-4xl font-bold">{partida.placar_time_b}</div>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center mb-4">Nenhum resultado informado.</p>
          )}

          {/* Jogadores */}
          {availablePlayers.length > 0 && (
            <div className="mb-4">
              <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-2">Jogadores</p>
              {hasTeams ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wide mb-1.5 ${colorA}`}>{partida.nome_time_a}</p>
                    <div className="space-y-1.5">{playersA.map(renderPlayerRow)}</div>
                  </div>
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wide mb-1.5 ${colorB}`}>{partida.nome_time_b}</p>
                    <div className="space-y-1.5">{playersB.map(renderPlayerRow)}</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">{availablePlayers.sort(byPosition).map(renderPlayerRow)}</div>
              )}
              {unassigned.length > 0 && (
                <div className="mt-3">
                  <p className="text-gray-500 text-xs font-medium mb-1.5">Sem time</p>
                  <div className="space-y-1.5">{unassigned.map(renderPlayerRow)}</div>
                </div>
              )}
            </div>
          )}

          {/* Link para detalhe */}
          <Link
            href={`/partidas/${partida.id}`}
            className="block text-center text-sm text-green-600 hover:text-green-700 font-medium mt-1"
          >
            Ver detalhes →
          </Link>
        </>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PartidasList({ partidas }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (partidas.length === 0) {
    return (
      <div className="py-10 text-center text-gray-500 text-sm">
        Nenhuma partida nesta temporada.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {partidas.map(p => {
        const hasScore = p.placar_time_a !== null && p.placar_time_b !== null
        const isExpanded = expandedId === p.id

        return (
          <div
            key={p.id}
            className={`rounded-xl overflow-hidden border transition-all cursor-pointer ${
              isExpanded
                ? 'border-green-400 shadow-md'
                : 'border-gray-200 hover:border-green-400 hover:shadow-md'
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

            {/* Score body */}
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

            {/* Expanded detail */}
            {isExpanded && <PartidaExpandida partida={p} />}
          </div>
        )
      })}
    </div>
  )
}
