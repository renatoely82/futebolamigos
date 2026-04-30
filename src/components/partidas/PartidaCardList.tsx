'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { StatusBadge } from '@/components/ui/Badge'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { POSICAO_CORES, POSICAO_ABREV } from '@/lib/supabase'
import type { Jogador, GolComDetalhes, PartidaJogadorComDetalhes } from '@/lib/supabase'
import type { PartidaComCount } from './types'
import Modal from '@/components/ui/Modal'

interface TimesData {
  time_a: Jogador[]
  time_b: Jogador[]
  gols: Map<string, { normal: number; contra: number }>
}

function EscalacaoInline({
  partidaId,
  timesIds,
  nomeTimeA,
  nomeTimeB,
}: {
  partidaId: string
  timesIds: { time_a: string[]; time_b: string[] }
  nomeTimeA: string
  nomeTimeB: string
}) {
  const [times, setTimes] = useState<TimesData | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  async function toggle(e: React.MouseEvent) {
    e.stopPropagation()
    if (open) { setOpen(false); return }
    setOpen(true)
    if (times) return
    setLoading(true)
    try {
      const [resJogadores, resGols] = await Promise.all([
        fetch(`/api/partidas/${partidaId}/jogadores`),
        fetch(`/api/partidas/${partidaId}/gols`),
      ])
      if (!resJogadores.ok) return
      const rows: PartidaJogadorComDetalhes[] = await resJogadores.json()
      const map = new Map(rows.map(r => [r.jogador_id, r.jogador]))

      const golsMap = new Map<string, { normal: number; contra: number }>()
      if (resGols.ok) {
        const golsData: GolComDetalhes[] = await resGols.json()
        for (const g of golsData) {
          const entry = golsMap.get(g.jogador_id) ?? { normal: 0, contra: 0 }
          if (g.gol_contra) entry.contra += g.quantidade
          else entry.normal += g.quantidade
          golsMap.set(g.jogador_id, entry)
        }
      }

      setTimes({
        time_a: timesIds.time_a.map(id => map.get(id)).filter(Boolean) as Jogador[],
        time_b: timesIds.time_b.map(id => map.get(id)).filter(Boolean) as Jogador[],
        gols: golsMap,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={(e) => toggle(e)}
        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
          open
            ? 'bg-green-100 text-green-700'
            : 'text-green-600 hover:text-green-700 hover:bg-green-50'
        }`}
      >
        {open ? 'Fechar' : 'Times'}
      </button>

      {open && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          {loading ? (
            <p className="text-gray-400 text-xs text-center py-2">Carregando...</p>
          ) : times ? (
            <div className="grid grid-cols-2 gap-3">
              {([
                { nome: nomeTimeA, jogadores: times.time_a },
                { nome: nomeTimeB, jogadores: times.time_b },
              ] as const).map(time => (
                <div key={time.nome}>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{time.nome}</p>
                  <ul className="space-y-1">
                    {time.jogadores.map(j => {
                      const g = times.gols.get(j.id)
                      return (
                        <li key={j.id} className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${POSICAO_CORES[j.posicao_principal]}`}>
                            {POSICAO_ABREV[j.posicao_principal] ?? j.posicao_principal}
                          </span>
                          <span className="text-sm text-gray-700 truncate flex-1">{j.nome}</span>
                          {g && (
                            <span className="flex items-center gap-1 shrink-0">
                              {g.normal > 0 && (
                                <span className="text-xs font-semibold text-gray-500">
                                  ⚽ {g.normal}
                                </span>
                              )}
                              {g.contra > 0 && (
                                <span className="text-xs font-semibold text-red-400">
                                  ⚽↩️ {g.contra}
                                </span>
                              )}
                            </span>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-xs text-center py-2">Não foi possível carregar os times.</p>
          )}
        </div>
      )}
    </div>
  )
}

function horaFim(hora: string, duracaoMinutos: number): string {
  const [h, m] = hora.split(':').map(Number)
  const totalMin = h * 60 + m + duracaoMinutos
  const hFim = Math.floor(totalMin / 60) % 24
  const mFim = totalMin % 60
  return `${String(hFim).padStart(2, '0')}:${String(mFim).padStart(2, '0')}`
}

export default function PartidaCardList({ partidas }: { partidas: PartidaComCount[] }) {
  const router = useRouter()
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirmId) return
    setDeleting(true)
    try {
      await fetch(`/api/partidas/${confirmId}`, { method: 'DELETE' })
      setConfirmId(null)
      router.refresh()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Modal
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        title="Excluir partida"
      >
        <p className="text-gray-600 text-sm mb-6">
          Tem certeza que deseja excluir esta partida? Todos os dados vinculados (jogadores, gols, times) serão removidos permanentemente.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => setConfirmId(null)}
            disabled={deleting}
            className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-60"
          >
            {deleting ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </Modal>

    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {partidas.map(p => {
        const count = p.player_count
        const isRealizada = p.status === 'realizada'
        const temTimes = isRealizada && !!p.times_escolhidos

        return (
          <div
            key={p.id}
            onClick={() => router.push(`/partidas/${p.id}`)}
            className="bg-white border border-[#e0e0e0] rounded-xl p-4 hover:border-[#c8c8c8] transition-colors flex flex-col gap-3 cursor-pointer"
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
                <span className="text-gray-500 text-xs">{p.hora} – {horaFim(p.hora, p.duracao_minutos)}</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmId(p.id) }}
                className="text-gray-300 hover:text-red-400 transition-colors p-1 rounded shrink-0"
                title="Excluir partida"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            {isRealizada && p.placar_time_a !== null && p.placar_time_b !== null && (
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
                {temTimes ? null : (
                  <Link
                    href={`/partidas/${p.id}/times`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50 px-3 py-1.5 rounded-lg text-sm transition-colors"
                  >
                    Times
                  </Link>
                )}
              </div>
            </div>

            {temTimes && (
              <EscalacaoInline
                partidaId={p.id}
                timesIds={p.times_escolhidos!}
                nomeTimeA={p.nome_time_a}
                nomeTimeB={p.nome_time_b}
              />
            )}
          </div>
        )
      })}
    </div>
    </>
  )
}
