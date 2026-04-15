'use client'

import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Partida } from '@/lib/supabase'

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

export default function PartidasList({ partidas }: Props) {
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

        return (
          <Link
            key={p.id}
            href={`/partidas/${p.id}`}
            className="block rounded-xl overflow-hidden border border-gray-200 hover:border-green-400 hover:shadow-md transition-all"
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
              <span className={`text-xs border px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLOR[p.status]}`}>
                {STATUS_LABEL[p.status]}
              </span>
            </div>

            {/* Score body */}
            <div className="flex items-center bg-white px-4 py-5 gap-2">
              {/* Team A */}
              <div className="flex-1 text-center">
                <p className="font-bold text-gray-800 text-sm leading-tight">{p.nome_time_a}</p>
              </div>

              {/* Score */}
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

              {/* Team B */}
              <div className="flex-1 text-center">
                <p className="font-bold text-gray-800 text-sm leading-tight">{p.nome_time_b}</p>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
