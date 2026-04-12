'use client'

import type { Jogador, PropostaTimeComJogadores } from '@/lib/supabase'
import { PositionBadge } from '@/components/ui/Badge'

interface TeamProposalCardProps {
  proposta: PropostaTimeComJogadores
  onSelect: () => void
  selected: boolean
  loading: boolean
}

function PlayerRow({ jogador }: { jogador: Jogador }) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-[#222] last:border-0">
      <PositionBadge posicao={jogador.posicao_principal} />
      <span className="text-white text-sm flex-1 truncate">{jogador.nome}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(n => (
          <div key={n} className={`w-2 h-2 rounded-sm ${n <= jogador.nivel ? 'bg-lime-500' : 'bg-[#333]'}`} />
        ))}
      </div>
    </div>
  )
}

export default function TeamProposalCard({ proposta, onSelect, selected, loading }: TeamProposalCardProps) {
  const scoreA = proposta.time_a.reduce((s, j) => s + j.nivel, 0)
  const scoreB = proposta.time_b.reduce((s, j) => s + j.nivel, 0)

  return (
    <div className={`bg-[#1a1a1a] border rounded-xl overflow-hidden transition-all ${
      selected ? 'border-lime-500 ring-1 ring-lime-500/50' : 'border-[#2a2a2a] hover:border-[#3a3a3a]'
    }`}>
      <div className="p-4 border-b border-[#222] flex items-center justify-between">
        <span className="text-white font-semibold">Proposta {proposta.proposta_numero}</span>
        {selected && (
          <span className="bg-lime-500 text-black text-xs font-bold px-2 py-0.5 rounded">Selecionada</span>
        )}
      </div>
      <div className="grid grid-cols-2 divide-x divide-[#222]">
        {/* Time A */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-lime-400 font-semibold text-sm">Time A</span>
            <span className="text-gray-500 text-xs">Força: {scoreA}</span>
          </div>
          {proposta.time_a.map(j => <PlayerRow key={j.id} jogador={j} />)}
        </div>
        {/* Time B */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-blue-400 font-semibold text-sm">Time B</span>
            <span className="text-gray-500 text-xs">Força: {scoreB}</span>
          </div>
          {proposta.time_b.map(j => <PlayerRow key={j.id} jogador={j} />)}
        </div>
      </div>
      <div className="p-4 border-t border-[#222]">
        <button
          onClick={onSelect}
          disabled={loading || selected}
          className={`w-full py-2 rounded-lg font-semibold text-sm transition-colors ${
            selected
              ? 'bg-lime-500/20 text-lime-400 cursor-default'
              : 'bg-lime-500 hover:bg-lime-400 text-black disabled:opacity-50'
          }`}
        >
          {selected ? 'Selecionada' : 'Escolher este time'}
        </button>
      </div>
    </div>
  )
}
