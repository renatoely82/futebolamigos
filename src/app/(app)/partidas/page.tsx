import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import type { Temporada } from '@/lib/supabase'
import TemporadaFilter from '@/components/partidas/TemporadaFilter'
import PartidaCardList from '@/components/partidas/PartidaCardList'
import type { PartidaComCount } from '@/components/partidas/types'

export const dynamic = 'force-dynamic'

export default async function PartidasPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { temporada: temporadaParam } = await searchParams
  const supabase = await createClient()

  // Fetch all temporadas
  const { data: temporadas } = await supabase
    .from('temporadas')
    .select('*')
    .order('data_inicio', { ascending: false })

  const listaTemporadas: Temporada[] = temporadas ?? []

  // Determine selected temporada: use param, or fall back to active
  let temporadaSelecionadaId: string | null = null
  if (typeof temporadaParam === 'string' && temporadaParam) {
    temporadaSelecionadaId = temporadaParam
  } else {
    const ativa = listaTemporadas.find(t => t.ativa)
    temporadaSelecionadaId = ativa?.id ?? null
  }

  let query = supabase
    .from('partidas')
    .select('*, partida_jogadores(count)')
    .order('data', { ascending: false })

  if (temporadaSelecionadaId) {
    query = query.eq('temporada_id', temporadaSelecionadaId)
  }

  const { data: rawPartidas } = await query
  const partidas: PartidaComCount[] = (rawPartidas ?? []).map(p => ({
    ...p,
    player_count: (p.partida_jogadores as { count: number }[])?.[0]?.count ?? 0,
  }))

  const temporadaSelecionada = listaTemporadas.find(t => t.id === temporadaSelecionadaId) ?? null

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-gray-800 text-2xl font-bold">Partidas</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {partidas.length} partida{partidas.length !== 1 ? 's' : ''}
            {temporadaSelecionada ? ` · ${temporadaSelecionada.nome}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {listaTemporadas.length > 0 && (
            <TemporadaFilter
              temporadas={listaTemporadas}
              temporadaSelecionadaId={temporadaSelecionadaId}
            />
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
      ) : (
        <PartidaCardList partidas={partidas} />
      )}
    </div>
  )
}
