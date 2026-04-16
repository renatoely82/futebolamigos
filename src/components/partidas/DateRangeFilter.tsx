'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface Props {
  defaultInicio?: string
  defaultFim?: string
}

export default function DateRangeFilter({ defaultInicio = '', defaultFim = '' }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const hasExplicitInicio = searchParams.has('data_inicio')
  const hasExplicitFim = searchParams.has('data_fim')
  const hasExplicitFilter = hasExplicitInicio || hasExplicitFim

  // Show explicit URL params if present, otherwise show temporada defaults
  const dataInicio = hasExplicitInicio ? (searchParams.get('data_inicio') ?? '') : defaultInicio
  const dataFim = hasExplicitFim ? (searchParams.get('data_fim') ?? '') : defaultFim

  function buildUrl(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    }
    const qs = params.toString()
    return qs ? `/partidas?${qs}` : '/partidas'
  }

  function handleInicio(e: React.ChangeEvent<HTMLInputElement>) {
    router.replace(buildUrl({ data_inicio: e.target.value }))
  }

  function handleFim(e: React.ChangeEvent<HTMLInputElement>) {
    router.replace(buildUrl({ data_fim: e.target.value }))
  }

  function handleLimpar() {
    router.replace(buildUrl({ data_inicio: '', data_fim: '' }))
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-gray-500 hidden sm:inline">De</label>
        <input
          type="date"
          value={dataInicio}
          onChange={handleInicio}
          className="bg-white border border-[#e0e0e0] text-gray-800 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-green-500 cursor-pointer"
        />
      </div>
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-gray-500 hidden sm:inline">Até</label>
        <input
          type="date"
          value={dataFim}
          onChange={handleFim}
          className="bg-white border border-[#e0e0e0] text-gray-800 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-green-500 cursor-pointer"
        />
      </div>
      {hasExplicitFilter && (
        <button
          onClick={handleLimpar}
          title="Restaurar datas da temporada"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
