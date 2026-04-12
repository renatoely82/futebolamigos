'use client'

import { useState } from 'react'
import type { Jogador, PartidaJogadorComDetalhes } from '@/lib/supabase'
import { PositionBadge } from '@/components/ui/Badge'

interface JogadoresPartidaProps {
  partidaId: string
  confirmedPlayers: PartidaJogadorComDetalhes[]
  allPlayers: Jogador[]
  onUpdate: () => void
}

export default function JogadoresPartida({
  partidaId,
  confirmedPlayers,
  allPlayers,
  onUpdate,
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

  return (
    <div className="space-y-6">
      {/* Confirmed list */}
      <div>
        <h3 className="text-white font-semibold mb-3">
          Convocados ({confirmedPlayers.length})
        </h3>
        {confirmedPlayers.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhum jogador ainda.</p>
        ) : (
          <div className="space-y-2">
            {confirmedPlayers.map(({ jogador, adicionado_manualmente }) => (
              <div
                key={jogador.id}
                className="flex items-center gap-3 bg-[#111] border border-[#222] rounded-lg px-4 py-2.5"
              >
                <PositionBadge posicao={jogador.posicao_principal} />
                <span className="text-white text-sm flex-1">{jogador.nome}</span>
                {jogador.mensalista && !adicionado_manualmente && (
                  <span className="text-lime-500 text-xs">Mensalista</span>
                )}
                <button
                  onClick={() => handleRemove(jogador.id)}
                  disabled={loading === jogador.id}
                  className="text-gray-500 hover:text-red-400 transition-colors p-1 rounded disabled:opacity-40"
                  title="Remover"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeWidth={2} strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add player */}
      <div>
        <h3 className="text-white font-semibold mb-3">Adicionar Jogador</h3>
        <input
          type="text"
          placeholder="Buscar jogador..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-lime-500 mb-3 text-sm"
        />
        {available.length === 0 ? (
          <p className="text-gray-500 text-sm">
            {search ? 'Nenhum resultado.' : 'Todos os jogadores já estão convocados.'}
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {available.map(j => (
              <div
                key={j.id}
                className="flex items-center gap-3 bg-[#111] border border-[#222] rounded-lg px-4 py-2.5"
              >
                <PositionBadge posicao={j.posicao_principal} />
                <span className="text-white text-sm flex-1">{j.nome}</span>
                <button
                  onClick={() => handleAdd(j.id)}
                  disabled={loading === j.id}
                  className="text-gray-400 hover:text-lime-400 transition-colors p-1 rounded disabled:opacity-40"
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
    </div>
  )
}
