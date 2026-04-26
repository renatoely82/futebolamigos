'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Partida, Jogador, PartidaJogadorComDetalhes, SubstituicaoComDetalhes, TeamSplit } from '@/lib/supabase'
import { POSICAO_ABREV } from '@/lib/supabase'

interface Props {
  partida: Partida
  players: PartidaJogadorComDetalhes[]
  allPlayers: Jogador[]
  onUpdate: () => void
}

export default function SubstituicoesPartida({ partida, players, allPlayers, onUpdate }: Props) {
  const [substituicoes, setSubstituicoes] = useState<SubstituicaoComDetalhes[]>([])
  const [showForm, setShowForm] = useState(false)
  const [ausente, setAusente] = useState('')
  const [substituto, setSubstituto] = useState('')
  const [motivo, setMotivo] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const loadSubstituicoes = useCallback(async () => {
    const res = await fetch(`/api/partidas/${partida.id}/substituicoes`)
    if (res.ok) setSubstituicoes(await res.json())
  }, [partida.id])

  useEffect(() => { loadSubstituicoes() }, [loadSubstituicoes])

  const tc = partida.times_escolhidos as TeamSplit | null
  const todosNosTimes = tc ? [...(tc.time_a ?? []), ...(tc.time_b ?? [])] : []

  // Jogadores dos times com nome resolvido
  const jogadoresNosTimes = todosNosTimes
    .map(pid => {
      const pj = players.find(p => p.jogador_id === pid)
      return pj ? pj.jogador : allPlayers.find(j => j.id === pid)
    })
    .filter(Boolean) as Jogador[]

  // IDs já com substituição registrada (ausentes)
  const ausentesRegistrados = new Set(substituicoes.map(s => s.jogador_ausente_id))
  // IDs já como substitutos
  const substitutosRegistrados = new Set(substituicoes.map(s => s.jogador_substituto_id))

  // Opções para o select de ausente: jogadores nos times que ainda não têm substituição
  const opcoesAusente = jogadoresNosTimes.filter(j => !ausentesRegistrados.has(j.id))

  // Opções para o select de substituto: qualquer jogador que não está nos times e não é já substituto
  const opcoesSubstituto = allPlayers.filter(
    j => !todosNosTimes.includes(j.id) && !substitutosRegistrados.has(j.id) && j.ativo
  )

  async function handleSave() {
    if (!ausente || !substituto) {
      setError('Selecione o jogador ausente e o substituto.')
      return
    }
    setSaving(true)
    setError('')
    const res = await fetch(`/api/partidas/${partida.id}/substituicoes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jogador_ausente_id: ausente, jogador_substituto_id: substituto, motivo: motivo || null }),
    })
    if (res.ok) {
      setShowForm(false)
      setAusente('')
      setSubstituto('')
      setMotivo('')
      await loadSubstituicoes()
      onUpdate()
    } else {
      const data = await res.json()
      setError(data.error ?? 'Erro ao salvar substituição.')
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await fetch(`/api/partidas/${partida.id}/substituicoes`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ substituicao_id: id }),
    })
    setDeletingId(null)
    await loadSubstituicoes()
    onUpdate()
  }

  return (
    <div className="bg-white border border-[#e0e0e0] rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-gray-800 font-semibold text-sm">Substituições</h2>
        {!showForm && opcoesAusente.length > 0 && (
          <button
            onClick={() => { setShowForm(true); setError('') }}
            className="text-green-600 hover:text-green-700 text-sm font-medium transition-colors"
          >
            + Registrar
          </button>
        )}
      </div>

      {substituicoes.length === 0 && !showForm && (
        <p className="text-gray-400 text-sm">Nenhuma substituição registrada.</p>
      )}

      {substituicoes.length > 0 && (
        <div className="space-y-2 mb-3">
          {substituicoes.map(s => (
            <div key={s.id} className="flex items-start justify-between gap-3">
              <div className="text-sm">
                <span className="line-through text-gray-400">{s.jogador_ausente.nome}</span>
                <span className="text-gray-400 mx-1.5">→</span>
                <span className="font-medium text-gray-800">{s.jogador_substituto.nome}</span>
                {s.motivo && (
                  <span className="block text-xs text-gray-400 mt-0.5">{s.motivo}</span>
                )}
              </div>
              <button
                onClick={() => handleDelete(s.id)}
                disabled={deletingId === s.id}
                className="shrink-0 text-gray-300 hover:text-red-400 transition-colors disabled:opacity-40"
                title="Remover substituição"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="border-t border-gray-100 pt-4 mt-2 space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">Jogador ausente (estava no time)</p>
            <select
              value={ausente}
              onChange={e => setAusente(e.target.value)}
              className="w-full bg-white border border-[#e0e0e0] rounded-lg px-3 py-2 text-gray-800 text-sm focus:outline-none focus:border-green-500"
            >
              <option value="">Selecionar...</option>
              {opcoesAusente.map(j => (
                <option key={j.id} value={j.id}>{j.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Substituto (quem entrou no lugar)</p>
            <select
              value={substituto}
              onChange={e => setSubstituto(e.target.value)}
              className="w-full bg-white border border-[#e0e0e0] rounded-lg px-3 py-2 text-gray-800 text-sm focus:outline-none focus:border-green-500"
            >
              <option value="">Selecionar...</option>
              {opcoesSubstituto.map(j => (
                <option key={j.id} value={j.id}>{j.nome} — {POSICAO_ABREV[j.posicao_principal] ?? j.posicao_principal}</option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Motivo (opcional)</p>
            <input
              type="text"
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Faltou, lesão, trabalho..."
              className="w-full bg-white border border-[#e0e0e0] rounded-lg px-3 py-2 text-gray-800 text-sm focus:outline-none focus:border-green-500"
            />
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              onClick={() => { setShowForm(false); setAusente(''); setSubstituto(''); setMotivo(''); setError('') }}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
