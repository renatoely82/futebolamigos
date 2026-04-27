'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isSameDay,
  format, parseISO, addMonths, subMonths,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { PartidaComCount } from './types'

const STATUS_DOT: Record<string, string> = {
  agendada: 'bg-blue-500',
  realizada: 'bg-green-500',
  cancelada: 'bg-red-400',
}

const STATUS_PILL: Record<string, string> = {
  agendada: 'bg-blue-100 text-blue-700 border border-blue-200',
  realizada: 'bg-green-100 text-green-700 border border-green-200',
  cancelada: 'bg-red-50 text-red-500 border border-red-200',
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function CalendarioPartidas({ partidas }: { partidas: PartidaComCount[] }) {
  const router = useRouter()

  const initialMonth = useMemo(() => {
    const today = new Date()
    const upcoming = partidas
      .filter(p => p.status === 'agendada')
      .sort((a, b) => a.data.localeCompare(b.data))
      .find(p => parseISO(p.data) >= today)
    return startOfMonth(upcoming ? parseISO(upcoming.data) : today)
  }, [partidas])

  const [currentMonth, setCurrentMonth] = useState(initialMonth)

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  const partidasByDay = useMemo(() => {
    const map = new Map<string, PartidaComCount[]>()
    for (const p of partidas) {
      const key = p.data.slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    }
    return map
  }, [partidas])

  const today = new Date()

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth(m => subMonths(m, 1))}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Mês anterior"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <h2 className="text-gray-800 font-semibold text-base capitalize">
            {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
          </h2>
          {!isSameMonth(currentMonth, today) && (
            <button
              onClick={() => setCurrentMonth(startOfMonth(today))}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md transition-colors"
            >
              Hoje
            </button>
          )}
        </div>
        <button
          onClick={() => setCurrentMonth(m => addMonths(m, 1))}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Próximo mês"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 border-l border-t border-[#e0e0e0] rounded-b-lg overflow-hidden">
        {days.map(day => {
          const key = format(day, 'yyyy-MM-dd')
          const dayPartidas = partidasByDay.get(key) ?? []
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isToday = isSameDay(day, today)

          return (
            <div
              key={key}
              className={`min-h-[72px] sm:min-h-[96px] border-r border-b border-[#e0e0e0] p-1 sm:p-1.5 ${
                isCurrentMonth ? 'bg-white' : 'bg-gray-50'
              }`}
            >
              <div className={`text-xs font-medium mb-1 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full ${
                isToday
                  ? 'bg-green-500 text-white'
                  : isCurrentMonth ? 'text-gray-700' : 'text-gray-300'
              }`}>
                {format(day, 'd')}
              </div>

              <div className="space-y-0.5">
                {dayPartidas.map(p => (
                  <button
                    key={p.id}
                    onClick={() => router.push(`/partidas/${p.id}`)}
                    className={`w-full text-left rounded px-1 py-0.5 leading-tight truncate transition-opacity hover:opacity-75 ${STATUS_PILL[p.status]}`}
                  >
                    {/* Mobile: dot + placar ou status curto */}
                    <span className="sm:hidden flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[p.status]}`} />
                      <span className="text-[10px] truncate">
                        {p.status === 'realizada' && p.placar_time_a !== null
                          ? `${p.placar_time_a}–${p.placar_time_b}`
                          : p.status === 'agendada' ? 'Ag.' : 'Can.'}
                      </span>
                    </span>
                    {/* Desktop: pill com placar ou local */}
                    <span className="hidden sm:block text-xs truncate">
                      {p.status === 'realizada' && p.placar_time_a !== null
                        ? `${p.nome_time_a} ${p.placar_time_a}–${p.placar_time_b} ${p.nome_time_b}`
                        : p.local ?? (p.status === 'agendada' ? 'Agendada' : 'Cancelada')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3">
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" /> Agendada
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" /> Realizada
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400 shrink-0" /> Cancelada
        </span>
      </div>
    </div>
  )
}
