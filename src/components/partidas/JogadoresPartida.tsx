'use client'

import { useState } from 'react'
import type { Jogador, PartidaJogadorComDetalhes } from '@/lib/supabase'
import { PositionBadge } from '@/components/ui/Badge'

interface JogadoresPartidaProps {
  partidaId: string
  confirmedPlayers: PartidaJogadorComDetalhes[]
  allPlayers: Jogador[]
  onUpdate: () => void
  readonly?: boolean
}

export default function JogadoresPartida({
  partidaId,
  confirmedPlayers,
  allPlayers,
  onUpdate,
  readonly = false,
}: JogadoresPartidaProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const confirmedIds = new Set(confirmedPlayers.map(p => p.jogador_id))
  const available = allPlayers.filter(
    j => !confirmedIds.has(j.id) && j.ativo &&
      j.nome.toLowerCase().includes(search.toLowerCase())
  )

  async function handleAdd(jogadorId: string) {
    setLoading(jogadorId)
    try {
      await fetch(`/api/partidas/${partidaId}/jogadores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jogador_id: jogadorId }),
      })
      onUpdate()
    } finally {
      setLoading(null)
    }
  }

  async function handleRemove(jogadorId: string) {
    setLoading(jogadorId)
    try {
      await fetch(`/api/partidas/${partidaId}/jogadores`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jogador_id: jogadorId }),
      })
      onUpdate()
    } finally {
      setLoading(null)
    }
  }

  const convocadosList = (
    <div>
      <h3 className="text-gray-800 font-semibold mb-3">
        Convocados ({confirmedPlayers.length})
      </h3>
      {confirmedPlayers.length === 0 ? (
        <p className="text-gray-500 text-sm">Nenhum jogador ainda.</p>
      ) : (
        <div className="space-y-2">
          {[...confirmedPlayers].sort((a, b) => a.jogador.nome.localeCompare(b.jogador.nome, 'pt-BR')).map(({ jogador, adicionado_manualmente }) => (
            <div
              key={jogador.id}
              className="flex items-center gap-3 bg-white border border-[#e0e0e0] rounded-lg px-4 py-2.5"
            >
              <PositionBadge posicao={jogador.posicao_principal} />
              <span className="text-gray-800 text-sm flex-1">{jogador.nome}</span>
              {!adicionado_manualmente && (
                <span className="text-green-600 text-xs">Mensalista</span>
              )}
              {!readonly && (
                <button
                  onClick={() => handleRemove(jogador.id)}
                  disabled={loading === jogador.id}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded disabled:opacity-40"
                  title="Remover"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeWidth={2} strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )

  if (readonly) {
    return convocadosList
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Esquerda: Adicionar Jogador */}
      <div>
        <h3 className="text-gray-800 font-semibold mb-3">Adicionar Jogador</h3>
        <input
          type="text"
          placeholder="Buscar jogador..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white border border-[#e0e0e0] rounded-lg px-3 py-2 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 mb-3 text-sm"
        />
        {available.length === 0 ? (
          <p className="text-gray-500 text-sm">
            {search ? 'Nenhum resultado.' : 'Todos os jogadores já estão convocados.'}
          </p>
        ) : (
          <div className="space-y-2 max-h-80 lg:max-h-[480px] overflow-y-auto">
            {available.map(j => (
              <div
                key={j.id}
                className="flex items-center gap-3 bg-white border border-[#e0e0e0] rounded-lg px-4 py-2.5"
              >
                <PositionBadge posicao={j.posicao_principal} />
                <span className="text-gray-800 text-sm flex-1">{j.nome}</span>
                <button
                  onClick={() => handleAdd(j.id)}
                  disabled={loading === j.id}
                  className="text-gray-400 hover:text-green-600 transition-colors p-1 rounded disabled:opacity-40"
                  title="Adicionar"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeWidth={2} strokeLinecap="round" d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Direita: Convocados */}
      {convocadosList}
    </div>
  )
}
