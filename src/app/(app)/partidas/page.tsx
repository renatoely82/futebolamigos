import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import type { Temporada } from '@/lib/supabase'
import TemporadaFilter from '@/components/partidas/TemporadaFilter'
import DateRangeFilter from '@/components/partidas/DateRangeFilter'
import PartidaCardList from '@/components/partidas/PartidaCardList'
import CalendarioPartidas from '@/components/partidas/CalendarioPartidas'
import type { PartidaComCount } from '@/components/partidas/types'

export const dynamic = 'force-dynamic'

export default async function PartidasPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const {
    temporada: temporadaParam,
    data_inicio: dataInicioParam,
    data_fim: dataFimParam,
    view: viewParam,
  } = await searchParams

  const view = viewParam === 'calendario' ? 'calendario' : 'lista'

  const supabase = await createClient()

  const { data: temporadas } = await supabase
    .from('temporadas')
    .select('*')
    .order('data_inicio', { ascending: false })

  const listaTemporadas: Temporada[] = temporadas ?? []

  let temporadaSelecionadaId: string | null = null
  if (typeof temporadaParam === 'string' && temporadaParam) {
    temporadaSelecionadaId = temporadaParam
  } else {
    const ativa = listaTemporadas.find(t => t.ativa)
    temporadaSelecionadaId = ativa?.id ?? null
  }

  const dataInicioExplicita = typeof dataInicioParam === 'string' ? dataInicioParam : undefined
  const dataFimExplicita = typeof dataFimParam === 'string' ? dataFimParam : undefined

  const temporadaSelecionada = listaTemporadas.find(t => t.id === temporadaSelecionadaId) ?? null
  const dataInicio = dataInicioExplicita ?? temporadaSelecionada?.data_inicio
  const dataFim = dataFimExplicita ?? temporadaSelecionada?.data_fim

  let query = supabase
    .from('partidas')
    .select('*, partida_jogadores(count)')
    .order('data', { ascending: false })

  if (temporadaSelecionadaId) query = query.eq('temporada_id', temporadaSelecionadaId)
  if (dataInicio) query = query.gte('data', dataInicio)
  if (dataFim) query = query.lte('data', dataFim)

  const { data: rawPartidas } = await query
  const partidas: PartidaComCount[] = (rawPartidas ?? []).map(p => ({
    ...p,
    player_count: (p.partida_jogadores as { count: number }[])?.[0]?.count ?? 0,
  }))

  // Build base URL params (without view) for the toggle links
  const baseParams = new URLSearchParams()
  if (temporadaSelecionadaId) baseParams.set('temporada', temporadaSelecionadaId)
  if (dataInicioExplicita) baseParams.set('data_inicio', dataInicioExplicita)
  if (dataFimExplicita) baseParams.set('data_fim', dataFimExplicita)

  const listaHref = `/partidas?${baseParams.toString()}`
  const calendarioHref = `/partidas?${baseParams.toString()}${baseParams.toString() ? '&' : ''}view=calendario`

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-gray-800 text-2xl font-bold">Partidas</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {partidas.length} partida{partidas.length !== 1 ? 's' : ''}
            {temporadaSelecionada ? ` · ${temporadaSelecionada.nome}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {listaTemporadas.length > 0 && (
            <div className="hidden sm:block">
              <TemporadaFilter
                temporadas={listaTemporadas}
                temporadaSelecionadaId={temporadaSelecionadaId}
              />
            </div>
          )}
          <Link
            href="/partidas/nova"
            className="bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeWidth={2.5} strokeLinecap="round" d="M12 5v14M5 12h14" />
            </svg>
            <span className="hidden sm:inline">Nova Partida</span>
          </Link>
        </div>
      </div>

      {listaTemporadas.length > 0 && (
        <div className="mb-3 sm:hidden">
          <TemporadaFilter
            temporadas={listaTemporadas}
            temporadaSelecionadaId={temporadaSelecionadaId}
          />
        </div>
      )}

      <div className="mb-4">
        <DateRangeFilter
          defaultInicio={temporadaSelecionada?.data_inicio}
          defaultFim={temporadaSelecionada?.data_fim}
        />
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-4">
        <Link
          href={listaHref}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            view === 'lista'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeWidth={2} strokeLinecap="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
          </svg>
          Lista
        </Link>
        <Link
          href={calendarioHref}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            view === 'calendario'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth={2} />
            <path strokeWidth={2} strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          Calendário
        </Link>
      </div>

      {partidas.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500">
            {temporadaSelecionada
              ? `Nenhuma partida em ${temporadaSelecionada.nome}.`
              : 'Nenhuma partida registrada.'}
          </p>
          <Link href="/partidas/nova" className="mt-4 text-green-600 hover:text-green-700 text-sm block">
            Registrar primeira partida
          </Link>
        </div>
      ) : view === 'calendario' ? (
        <CalendarioPartidas partidas={partidas} />
      ) : (
        <PartidaCardList partidas={partidas} />
      )}
    </div>
  )
}
