'use client'

import { useState, useEffect } from 'react'
import type { Partida, PartidaJogadorComDetalhes, GolComDetalhes, SubstituicaoComDetalhes } from '@/lib/supabase'
import { POSICOES } from '@/lib/supabase'
import { getTeamColor } from '@/lib/team-colors'

interface Props {
  partida: Partida
  players: PartidaJogadorComDetalhes[]
  substituicoes?: SubstituicaoComDetalhes[]
  onUpdate: () => void
}

export default function ResultadoPartida({ partida, players, substituicoes = [], onUpdate }: Props) {
  const [gols, setGols] = useState<GolComDetalhes[]>([])
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // edit state
  const [placarA, setPlacarA] = useState<string>('')
  const [placarB, setPlacarB] = useState<string>('')
  const [golsEdit, setGolsEdit] = useState<Record<string, { normal: number; contra: number }>>({})

  useEffect(() => {
    fetch(`/api/partidas/${partida.id}/gols`)
      .then(r => r.json())
      .then(data => setGols(Array.isArray(data) ? data : []))
  }, [partida.id])

  function startEdit() {
    setPlacarA(partida.placar_time_a != null ? String(partida.placar_time_a) : '')
    setPlacarB(partida.placar_time_b != null ? String(partida.placar_time_b) : '')
    const map: Record<string, { normal: number; contra: number }> = {}
    gols.forEach(g => {
      if (!map[g.jogador_id]) map[g.jogador_id] = { normal: 0, contra: 0 }
      if (g.gol_contra) map[g.jogador_id].contra += g.quantidade
      else map[g.jogador_id].normal += g.quantidade
    })
    setGolsEdit(map)
    setEditing(true)
  }

  function setPlayerGoals(jogadorId: string, tipo: 'normal' | 'contra', value: number) {
    setGolsEdit(prev => {
      const entry = prev[jogadorId] ?? { normal: 0, contra: 0 }
      const next = { ...prev, [jogadorId]: { ...entry, [tipo]: Math.max(0, value) } }
      if (next[jogadorId].normal === 0 && next[jogadorId].contra === 0) delete next[jogadorId]
      return next
    })
  }

  async function handleSave() {
    setSaving(true)

    const goalsPayload = Object.entries(golsEdit).flatMap(([jogador_id, { normal, contra }]) => {
      const rows = []
      if (normal > 0) rows.push({ jogador_id, quantidade: normal, gol_contra: false })
      if (contra > 0) rows.push({ jogador_id, quantidade: contra, gol_contra: true })
      return rows
    })

    await Promise.all([
      fetch(`/api/partidas/${partida.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placar_time_a: placarA !== '' ? Number(placarA) : null,
          placar_time_b: placarB !== '' ? Number(placarB) : null,
        }),
      }),
      fetch(`/api/partidas/${partida.id}/gols`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gols: goalsPayload }),
      }),
    ])

    // reload gols
    const res = await fetch(`/api/partidas/${partida.id}/gols`)
    const data = await res.json()
    setGols(Array.isArray(data) ? data : [])

    setSaving(false)
    setEditing(false)
    onUpdate()
  }

  const hasResult = partida.placar_time_a != null && partida.placar_time_b != null

  // players available for goal attribution
  const availablePlayers = players.filter(p => p.confirmado)

  const teamAIds = new Set(partida.times_escolhidos?.time_a ?? [])
  const teamBIds = new Set(partida.times_escolhidos?.time_b ?? [])

  // Substituição: ausentes não recebem gols; substitutos herdam o time do ausente
  const ausenteIds = new Set(substituicoes.map(s => s.jogador_ausente_id))
  const substitutoTime = new Map<string, 'A' | 'B'>()
  for (const s of substituicoes) {
    if (teamAIds.has(s.jogador_ausente_id)) substitutoTime.set(s.jogador_substituto_id, 'A')
    else if (teamBIds.has(s.jogador_ausente_id)) substitutoTime.set(s.jogador_substituto_id, 'B')
  }

  const byPosition = (a: typeof availablePlayers[number], b: typeof availablePlayers[number]) => {
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
  const colorA = getTeamColor(partida.nome_time_a, 'text-green-600')
  const colorB = getTeamColor(partida.nome_time_b, 'text-blue-600')

  function renderGoalRow(pj: typeof availablePlayers[number]) {
    const entry = golsEdit[pj.jogador_id] ?? { normal: 0, contra: 0 }
    return (
      <div key={pj.jogador_id} className="flex items-center gap-2">
        <span className="text-gray-800 text-sm flex-1 truncate min-w-0">{pj.jogador.nome}</span>
        {/* Gols normais */}
        <div className="flex items-center gap-1">
          <span className="text-gray-500 text-xs w-4 text-right">G</span>
          <button
            onClick={() => setPlayerGoals(pj.jogador_id, 'normal', entry.normal - 1)}
            disabled={entry.normal === 0}
            className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-30 flex items-center justify-center text-base leading-none"
          >
            −
          </button>
          <span className={`w-5 text-center text-sm font-bold ${entry.normal > 0 ? 'text-green-600' : 'text-gray-400'}`}>
            {entry.normal}
          </span>
          <button
            onClick={() => setPlayerGoals(pj.jogador_id, 'normal', entry.normal + 1)}
            className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center text-base leading-none"
          >
            +
          </button>
        </div>
        {/* Gols contra */}
        <div className="flex items-center gap-1">
          <span className="text-orange-500 text-xs w-6 text-right font-medium">GC</span>
          <button
            onClick={() => setPlayerGoals(pj.jogador_id, 'contra', entry.contra - 1)}
            disabled={entry.contra === 0}
            className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-30 flex items-center justify-center text-base leading-none"
          >
            −
          </button>
          <span className={`w-5 text-center text-sm font-bold ${entry.contra > 0 ? 'text-orange-500' : 'text-gray-400'}`}>
            {entry.contra}
          </span>
          <button
            onClick={() => setPlayerGoals(pj.jogador_id, 'contra', entry.contra + 1)}
            className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center text-base leading-none"
          >
            +
          </button>
        </div>
      </div>
    )
  }

  if (editing) {
    return (
      <div className="bg-white border border-green-500/30 rounded-xl p-6 mb-6">
        <h2 className="text-gray-800 font-semibold mb-4">Resultado da Partida</h2>

        {/* Placar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1">
            <label className={`text-xs font-medium uppercase tracking-wide block mb-1 ${getTeamColor(partida.nome_time_a, 'text-green-600')}`}>
              {partida.nome_time_a}
            </label>
            <input
              type="number"
              min="0"
              value={placarA}
              onChange={e => setPlacarA(e.target.value)}
              className="w-full bg-white border border-[#e0e0e0] rounded-lg px-3 py-2 text-gray-800 text-2xl font-bold text-center focus:outline-none focus:border-green-500"
              placeholder="0"
            />
          </div>
          <span className="text-gray-400 text-2xl font-bold mt-5">×</span>
          <div className="flex-1">
            <label className={`text-xs font-medium uppercase tracking-wide block mb-1 ${getTeamColor(partida.nome_time_b, 'text-blue-600')}`}>
              {partida.nome_time_b}
            </label>
            <input
              type="number"
              min="0"
              value={placarB}
              onChange={e => setPlacarB(e.target.value)}
              className="w-full bg-white border border-[#e0e0e0] rounded-lg px-3 py-2 text-gray-800 text-2xl font-bold text-center focus:outline-none focus:border-blue-500"
              placeholder="0"
            />
          </div>
        </div>

        {/* Artilheiros */}
        {availablePlayers.length > 0 && (
          <div className="mb-6">
            <h3 className="text-gray-500 text-sm font-medium mb-3">Artilheiros</h3>
            {hasTeams ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${colorA}`}>{partida.nome_time_a}</p>
                  <div className="space-y-2">{playersA.map(renderGoalRow)}</div>
                </div>
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${colorB}`}>{partida.nome_time_b}</p>
                  <div className="space-y-2">{playersB.map(renderGoalRow)}</div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">{availablePlayers.sort(byPosition).map(renderGoalRow)}</div>
            )}
            {unassigned.length > 0 && (
              <div className="mt-3">
                <p className="text-gray-500 text-xs font-medium mb-2">Sem time definido</p>
                <div className="space-y-2">{unassigned.map(renderGoalRow)}</div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {saving ? 'Salvando...' : 'Salvar Resultado'}
          </button>
          <button
            onClick={() => setEditing(false)}
            disabled={saving}
            className="flex-1 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 font-semibold py-2.5 rounded-lg transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-[#e0e0e0] rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-gray-800 font-semibold">Resultado da Partida</h2>
        <button
          onClick={startEdit}
          className="text-green-600 text-sm hover:text-green-700 transition-colors"
        >
          {hasResult ? 'Editar →' : 'Informar resultado →'}
        </button>
      </div>

      {hasResult ? (
        <>
          {/* Placar */}
          <div className="flex items-center justify-center gap-6 mb-5">
            <div className="text-center">
              <div className={`text-xs font-medium uppercase tracking-wide mb-1 ${colorA}`}>
                {partida.nome_time_a}
              </div>
              <div className="text-gray-800 text-5xl font-bold">{partida.placar_time_a}</div>
            </div>
            <div className="text-gray-400 text-3xl font-bold">×</div>
            <div className="text-center">
              <div className={`text-xs font-medium uppercase tracking-wide mb-1 ${colorB}`}>
                {partida.nome_time_b}
              </div>
              <div className="text-gray-800 text-5xl font-bold">{partida.placar_time_b}</div>
            </div>
          </div>

          {/* Jogadores por time */}
          {availablePlayers.length > 0 && (
            <div>
              <h3 className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-3">Jogadores</h3>
              {hasTeams ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${colorA}`}>{partida.nome_time_a}</p>
                    <div className="space-y-1.5">
                      {playersA.map(pj => {
                        const totalNormal = gols.filter(g => g.jogador_id === pj.jogador_id && !g.gol_contra).reduce((s, g) => s + g.quantidade, 0)
                        const totalContra = gols.filter(g => g.jogador_id === pj.jogador_id && g.gol_contra).reduce((s, g) => s + g.quantidade, 0)
                        return (
                          <div key={pj.jogador_id} className="flex items-center gap-2">
                            <span className="text-gray-800 text-sm flex-1 truncate">{pj.jogador.nome}</span>
                            <span className="flex items-center gap-1 shrink-0">
                              {totalNormal > 0 && (
                                <span className="text-xs font-semibold text-gray-500">⚽ {totalNormal}</span>
                              )}
                              {totalContra > 0 && (
                                <span className="text-xs font-semibold text-red-400">GC {totalContra}</span>
                              )}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${colorB}`}>{partida.nome_time_b}</p>
                    <div className="space-y-1.5">
                      {playersB.map(pj => {
                        const totalNormal = gols.filter(g => g.jogador_id === pj.jogador_id && !g.gol_contra).reduce((s, g) => s + g.quantidade, 0)
                        const totalContra = gols.filter(g => g.jogador_id === pj.jogador_id && g.gol_contra).reduce((s, g) => s + g.quantidade, 0)
                        return (
                          <div key={pj.jogador_id} className="flex items-center gap-2">
                            <span className="text-gray-800 text-sm flex-1 truncate">{pj.jogador.nome}</span>
                            <span className="flex items-center gap-1 shrink-0">
                              {totalNormal > 0 && (
                                <span className="text-xs font-semibold text-gray-500">⚽ {totalNormal}</span>
                              )}
                              {totalContra > 0 && (
                                <span className="text-xs font-semibold text-red-400">GC {totalContra}</span>
                              )}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {availablePlayers.sort(byPosition).map(pj => {
                    const totalNormal = gols.filter(g => g.jogador_id === pj.jogador_id && !g.gol_contra).reduce((s, g) => s + g.quantidade, 0)
                    const totalContra = gols.filter(g => g.jogador_id === pj.jogador_id && g.gol_contra).reduce((s, g) => s + g.quantidade, 0)
                    return (
                      <div key={pj.jogador_id} className="flex items-center gap-2">
                        <span className="text-gray-800 text-sm flex-1 truncate">{pj.jogador.nome}</span>
                        <span className="flex items-center gap-1 shrink-0">
                          {totalNormal > 0 && (
                            <span className="text-xs font-semibold text-gray-500">⚽ {totalNormal}</span>
                          )}
                          {totalContra > 0 && (
                            <span className="text-xs font-semibold text-red-400">GC {totalContra}</span>
                          )}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
              {unassigned.length > 0 && (
                <div className="mt-3">
                  <p className="text-gray-500 text-xs font-medium mb-1.5">Sem time</p>
                  <div className="space-y-1.5">
                    {unassigned.map(pj => {
                      const totalNormal = gols.filter(g => g.jogador_id === pj.jogador_id && !g.gol_contra).reduce((s, g) => s + g.quantidade, 0)
                      const totalContra = gols.filter(g => g.jogador_id === pj.jogador_id && g.gol_contra).reduce((s, g) => s + g.quantidade, 0)
                      return (
                        <div key={pj.jogador_id} className="flex items-center gap-2">
                          <span className="text-gray-800 text-sm flex-1 truncate">{pj.jogador.nome}</span>
                          <span className="flex items-center gap-1 shrink-0">
                            {totalNormal > 0 && (
                              <span className="text-xs font-semibold text-gray-500">⚽ {totalNormal}</span>
                            )}
                            {totalContra > 0 && (
                              <span className="text-xs font-semibold text-red-400">GC {totalContra}</span>
                            )}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="text-gray-400 text-sm text-center py-2">Nenhum resultado informado.</p>
      )}
    </div>
  )
}
