'use client'

import { useEffect } from 'react'
import type { Jogador } from '@/lib/supabase'
import { PositionBadge } from '@/components/ui/Badge'

export type ZoneOption = {
  id: string
  label: string
  color: string
  disabled?: boolean
}

interface PlayerMoveBottomSheetProps {
  jogador: Jogador
  zones: ZoneOption[]
  onMove: (zoneId: string) => void
  onClose: () => void
}

export default function PlayerMoveBottomSheet({
  jogador,
  zones,
  onMove,
  onClose,
}: PlayerMoveBottomSheetProps) {
  // Fecha ao pressionar Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Painel */}
      <div className="relative w-full bg-white rounded-t-2xl shadow-2xl animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Jogador selecionado */}
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Mover jogador</p>
          <div className="flex items-center gap-2">
            <PositionBadge posicao={jogador.posicao_principal} />
            <span className="font-semibold text-gray-800">{jogador.nome}</span>
          </div>
        </div>

        {/* Opções de destino */}
        <div className="px-4 py-3 space-y-2">
          {zones.map(zone => (
            <button
              key={zone.id}
              disabled={zone.disabled}
              onClick={() => {
                if (!zone.disabled) {
                  onMove(zone.id)
                  onClose()
                }
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
                zone.disabled
                  ? 'border-gray-100 bg-gray-50 text-gray-400 cursor-default'
                  : 'border-gray-200 bg-white active:bg-gray-50 text-gray-800'
              }`}
            >
              <span className={`text-sm font-semibold ${zone.disabled ? 'text-gray-400' : zone.color}`}>
                {zone.label}
              </span>
              {zone.disabled && (
                <span className="text-xs text-gray-400 ml-auto">atual</span>
              )}
            </button>
          ))}
        </div>

        {/* Cancelar */}
        <div className="px-4 pb-6 pt-1">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium active:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
