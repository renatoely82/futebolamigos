'use client'

import { useState } from 'react'
import type { Jogador } from '@/lib/supabase'
import { PositionBadge } from '@/components/ui/Badge'

interface JogadorCardProps {
  jogador: Jogador
  onEdit: () => void
  onDelete: () => void
}

export default function JogadorCard({ jogador, onEdit, onDelete }: JogadorCardProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopyPortalLink() {
    const url = `${window.location.origin}/jogador/${jogador.id}?token=${jogador.portal_token}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white border border-[#e0e0e0] rounded-xl p-4 hover:border-[#c8c8c8] transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-gray-800 font-semibold truncate">{jogador.nome}</h3>
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <PositionBadge posicao={jogador.posicao_principal} />
            {jogador.posicao_secundaria_1 && (
              <span className="text-gray-500 text-xs">{jogador.posicao_secundaria_1}</span>
            )}
            {jogador.posicao_secundaria_2 && (
              <span className="text-gray-500 text-xs">/ {jogador.posicao_secundaria_2}</span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
              <div
                key={n}
                className={`w-3 h-3 rounded-sm ${n <= jogador.nivel ? 'bg-green-500' : 'bg-gray-200'}`}
              />
            ))}
            <span className="text-gray-500 text-xs ml-1">Nível {jogador.nivel}</span>
          </div>
          {jogador.telefone && (
            <p className="text-gray-500 text-xs mt-1">{jogador.telefone}</p>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={handleCopyPortalLink}
            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            title="Copiar link do portal"
          >
            {copied ? (
              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 0 0-5.656 0l-4 4a4 4 0 1 0 5.656 5.656l1.102-1.101m-.758-4.899a4 4 0 0 0 5.656 0l4-4a4 4 0 0 0-5.656-5.656l-1.1 1.1" />
              </svg>
            )}
          </button>
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Editar"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Remover"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      {jogador.observacoes && (
        <p className="text-gray-500 text-xs mt-3 border-t border-[#e0e0e0] pt-3">{jogador.observacoes}</p>
      )}
    </div>
  )
}
