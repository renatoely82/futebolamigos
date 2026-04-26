'use client'

import { useState, useEffect } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import type { EvolucaoData, EvolucaoSerie } from '@/app/api/temporadas/[id]/evolucao/route'

const PALETTE = [
  '#16a34a', // green-600
  '#2563eb', // blue-600
  '#dc2626', // red-600
  '#d97706', // amber-600
  '#7c3aed', // violet-600
  '#0891b2', // cyan-600
  '#db2777', // pink-600
  '#65a30d', // lime-600
  '#ea580c', // orange-600
  '#4338ca', // indigo-700
  '#0d9488', // teal-600
  '#be123c', // rose-700
]

const TOP_N = 8 // show top N by default

interface Props {
  temporadaId: string
  dataInicio?: string
  dataFim?: string
}

export default function EvolucaoChart({ temporadaId, dataInicio, dataFim }: Props) {
  const [data, setData] = useState<EvolucaoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (dataInicio) params.set('data_inicio', dataInicio)
    if (dataFim) params.set('data_fim', dataFim)
    fetch(`/api/temporadas/${temporadaId}/evolucao?${params}`)
      .then(r => r.json())
      .then((d: EvolucaoData) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [temporadaId, dataInicio, dataFim])

  if (loading) {
    return (
      <div className="px-4 py-6 animate-pulse space-y-3">
        <div className="h-4 bg-gray-200 rounded w-40" />
        <div className="h-64 bg-gray-100 rounded-xl" />
      </div>
    )
  }

  if (!data || data.labels.length === 0) {
    return (
      <div className="py-16 text-center text-gray-500 text-sm">
        Nenhuma partida realizada com resultado registrado neste período.
      </div>
    )
  }

  if (data.labels.length < 2) {
    return (
      <div className="py-16 text-center text-gray-500 text-sm">
        É necessário pelo menos 2 partidas para mostrar a evolução.
      </div>
    )
  }

  const visibleSeries: EvolucaoSerie[] = showAll ? data.series : data.series.slice(0, TOP_N)
  const hiddenCount = data.series.length - TOP_N

  // Build Recharts data array: one object per match
  const chartData = data.labels.map((l, i) => {
    const point: Record<string, string | number> = { label: l.label }
    for (const s of visibleSeries) {
      point[s.nome] = s.pontos[i] ?? 0
    }
    return point
  })

  return (
    <div className="px-4 py-4">
      {hiddenCount > 0 && (
        <div className="flex justify-end mb-3">
          <button
            onClick={() => setShowAll(v => !v)}
            className="text-xs text-gray-500 hover:text-gray-700 border border-[#e0e0e0] px-3 py-1.5 rounded-lg transition-colors"
          >
            {showAll ? `Mostrar top ${TOP_N}` : `Mostrar todos (${data.series.length})`}
          </button>
        </div>
      )}

      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={chartData} margin={{ top: 4, right: 12, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
            itemStyle={{ padding: '1px 0' }}
            formatter={(value, name) => [String(value) + ' pts', String(name)]}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
            iconType="circle"
            iconSize={8}
          />
          {visibleSeries.map((s, i) => (
            <Line
              key={s.id}
              type="monotone"
              dataKey={s.nome}
              stroke={PALETTE[i % PALETTE.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
