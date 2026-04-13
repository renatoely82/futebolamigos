import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { StatusBadge } from '@/components/ui/Badge'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Partida, Temporada } from '@/lib/supabase'
import TemporadaFilter from '@/components/partidas/TemporadaFilter'

export const dynamic = 'force-dynamic'

type PartidaComCount = Partida & { player_count: number }

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
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeWidth={2.5} strokeLinecap="round" d="M12 5v14M5 12h14" />
            </svg>
            Nova Partida
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
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {partidas.map(p => {
            const count = p.player_count
            return (
              <div
                key={p.id}
                className="bg-white border border-[#e2e8f0] rounded-xl p-4 hover:border-[#c1c4c9] transition-colors flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={p.status} />
                      {p.times_escolhidos && (
                        <span className="bg-purple-100 text-purple-600 text-xs px-2 py-0.5 rounded font-medium">
                          Times definidos
                        </span>
                      )}
                    </div>
                    <span className="text-gray-800 font-semibold text-sm mt-1 block">
                      {format(parseISO(p.data), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </span>
                  </div>
                </div>
                {p.status === 'realizada' && p.placar_time_a !== null && p.placar_time_b !== null && (
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-gray-700 text-sm font-medium truncate">{p.nome_time_a}</span>
                    <span className="bg-gray-800 text-white text-sm font-bold px-3 py-0.5 rounded-lg tabular-nums shrink-0">
                      {p.placar_time_a} – {p.placar_time_b}
                    </span>
                    <span className="text-gray-700 text-sm font-medium truncate">{p.nome_time_b}</span>
                  </div>
                )}
                <div className="flex items-center justify-between mt-auto">
                  <div className="text-gray-500 text-sm flex items-center gap-3">
                    {p.local && <span className="truncate max-w-[120px]">{p.local}</span>}
                    <span>{count} jogadores</span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Link
                      href={`/partidas/${p.id}`}
                      className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-3 py-1.5 rounded-lg text-sm transition-colors"
                    >
                      Detalhes
                    </Link>
                    <Link
                      href={`/partidas/${p.id}/times`}
                      className="text-green-600 hover:text-green-700 hover:bg-green-50 px-3 py-1.5 rounded-lg text-sm transition-colors"
                    >
                      Times
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
