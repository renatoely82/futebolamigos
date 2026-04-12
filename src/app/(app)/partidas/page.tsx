import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { StatusBadge } from '@/components/ui/Badge'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Partida } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type PartidaComCount = Partida & { player_count: number }

export default async function PartidasPage() {
  const supabase = await createClient()
  const { data: rawPartidas } = await supabase
    .from('partidas')
    .select('*')
    .order('data', { ascending: false })

  // Fetch player counts for all matches
  const list = rawPartidas ?? [] as Partida[]
  const partidas: PartidaComCount[] = await Promise.all(
    list.map(async (p: Partida) => {
      const { count } = await supabase
        .from('partida_jogadores')
        .select('*', { count: 'exact', head: true })
        .eq('partida_id', p.id)
      return { ...p, player_count: count ?? 0 }
    })
  )

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-bold">Partidas</h1>
          <p className="text-gray-500 text-sm mt-0.5">{partidas.length} partidas registradas</p>
        </div>
        <Link
          href="/partidas/nova"
          className="bg-lime-500 hover:bg-lime-400 text-black font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeWidth={2.5} strokeLinecap="round" d="M12 5v14M5 12h14" />
          </svg>
          Nova Partida
        </Link>
      </div>

      {partidas.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500">Nenhuma partida registrada.</p>
          <Link href="/partidas/nova" className="mt-4 text-lime-400 hover:text-lime-300 text-sm block">
            Registrar primeira partida
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {partidas.map(p => {
            const count = p.player_count
            return (
              <div
                key={p.id}
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 hover:border-[#3a3a3a] transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-white font-semibold">
                        {format(parseISO(p.data), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </span>
                      <StatusBadge status={p.status} />
                      {p.times_escolhidos && (
                        <span className="bg-purple-500/20 text-purple-400 text-xs px-2 py-0.5 rounded font-medium">
                          Times definidos
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-gray-500 text-sm">
                      {p.local && <span>{p.local}</span>}
                      <span>{count} jogadores</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Link
                      href={`/partidas/${p.id}`}
                      className="text-gray-400 hover:text-white hover:bg-white/5 px-3 py-1.5 rounded-lg text-sm transition-colors"
                    >
                      Detalhes
                    </Link>
                    <Link
                      href={`/partidas/${p.id}/times`}
                      className="text-lime-400 hover:text-lime-300 hover:bg-lime-500/10 px-3 py-1.5 rounded-lg text-sm transition-colors"
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
