'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Jogador, PartidaJogadorComDetalhes, Partida, PropostaTimeComJogadores } from '@/lib/supabase'
import { POSICAO_CORES } from '@/lib/supabase'
import TeamProposalCard from '@/components/partidas/TeamProposalCard'
import TeamEditor from '@/components/partidas/TeamEditor'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface PartidaAnteriorTimes {
  data: string
  nome_time_a: string
  nome_time_b: string
  time_a: Jogador[]
  time_b: Jogador[]
}

export default function TimesPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [partida, setPartida] = useState<Partida | null>(null)
  const [proposals, setProposals] = useState<PropostaTimeComJogadores[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [editTimeA, setEditTimeA] = useState<Jogador[]>([])
  const [editTimeB, setEditTimeB] = useState<Jogador[]>([])
  const [editBanco, setEditBanco] = useState<Jogador[]>([])
  const [partidaAnterior, setPartidaAnterior] = useState<PartidaAnteriorTimes | null>(null)
  const [showPartidaAnterior, setShowPartidaAnterior] = useState(false)

  const loadPartida = useCallback(async () => {
    const res = await fetch(`/api/partidas/${id}`)
    if (res.ok) setPartida(await res.json())
  }, [id])

  const loadPartidaAnterior = useCallback(async () => {
    const res = await fetch(`/api/partidas/${id}/times`)
    if (res.ok) {
      const data = await res.json()
      setPartidaAnterior(data)
    }
  }, [id])

  useEffect(() => {
    loadPartida()
    loadPartidaAnterior()
  }, [loadPartida, loadPartidaAnterior])

  async function generateTeams() {
    setEditMode(false)
    setGenerating(true)
    setError('')
    try {
      const res = await fetch(`/api/partidas/${id}/times`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro ao gerar times.'); return }
      setProposals(data)
    } finally {
      setGenerating(false)
    }
  }

  async function enterEditMode() {
    if (!partida?.times_escolhidos) return
    setLoading(true)
    const res = await fetch(`/api/partidas/${id}/jogadores`)
    if (!res.ok) { setLoading(false); return }
    const rows: PartidaJogadorComDetalhes[] = await res.json()
    const allPlayers = rows.map(r => r.jogador)
    const { time_a: idsA, time_b: idsB } = partida.times_escolhidos
    const teamA = allPlayers.filter(j => idsA.includes(j.id))
    const teamB = allPlayers.filter(j => idsB.includes(j.id))
    const banco = allPlayers.filter(j => !idsA.includes(j.id) && !idsB.includes(j.id))
    setEditTimeA(teamA)
    setEditTimeB(teamB)
    setEditBanco(banco)
    setProposals([])
    setEditMode(true)
    setLoading(false)
  }

  function handleTeamsChange(index: number, timeA: Jogador[], timeB: Jogador[]) {
    const proposta = proposals[index]
    const isSelected = selectedTeams
      ? JSON.stringify([...proposta.time_a.map(j => j.id)].sort()) ===
        JSON.stringify([...selectedTeams.time_a].sort())
      : false

    setProposals(prev => prev.map((p, i) =>
      i === index ? { ...p, time_a: timeA, time_b: timeB } : p
    ))

    if (isSelected) {
      const newTeams = {
        time_a: timeA.map(j => j.id),
        time_b: timeB.map(j => j.id),
      }
      fetch(`/api/partidas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ times_escolhidos: newTeams }),
      })
      setPartida(p => p ? { ...p, times_escolhidos: newTeams } : p)
    }
  }

  async function handleSelect(proposta: PropostaTimeComJogadores) {
    setLoading(true)
    await fetch(`/api/partidas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        times_escolhidos: {
          time_a: proposta.time_a.map(j => j.id),
          time_b: proposta.time_b.map(j => j.id),
        },
      }),
    })
    setPartida(p => p ? {
      ...p,
      times_escolhidos: {
        time_a: proposta.time_a.map(j => j.id),
        time_b: proposta.time_b.map(j => j.id),
      },
    } : p)
    setLoading(false)
  }

  async function handleEditorSave(timeA: Jogador[], timeB: Jogador[]) {
    const newTeams = {
      time_a: timeA.map(j => j.id),
      time_b: timeB.map(j => j.id),
    }
    await fetch(`/api/partidas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ times_escolhidos: newTeams }),
    })
    setPartida(p => p ? { ...p, times_escolhidos: newTeams } : p)
    setEditTimeA(timeA)
    setEditTimeB(timeB)
  }

  const selectedTeams = partida?.times_escolhidos
  const isRealizada = partida?.status === 'realizada'

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-start gap-3 mb-6">
        <Link href={`/partidas/${id}`} className="text-gray-400 hover:text-gray-700 transition-colors mt-1">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m7-7-7 7 7 7" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-gray-800 text-2xl font-bold">
            {editMode ? 'Alterar Times' : 'Propostas de Times'}
          </h1>
          {partida && (
            <p className="text-gray-500 text-sm mt-0.5">
              {format(parseISO(partida.data), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
          )}
        </div>

        {!isRealizada && (
          <div className="flex items-center gap-2">
            {selectedTeams && !editMode && (
              <button
                onClick={enterEditMode}
                disabled={loading}
                className="flex items-center gap-2 bg-white hover:bg-gray-100 disabled:opacity-50 text-gray-700 font-semibold px-4 py-2 rounded-lg transition-colors border border-[#e0e0e0]"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Alterar
              </button>
            )}
            {editMode ? (
              <button
                onClick={() => router.push(`/partidas/${id}`)}
                className="flex items-center gap-2 bg-white hover:bg-gray-100 text-gray-700 font-semibold px-4 py-2 rounded-lg transition-colors border border-[#e0e0e0]"
              >
                Concluir
              </button>
            ) : (
              <button
                onClick={generateTeams}
                disabled={generating}
                className="flex items-center gap-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                <svg className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {generating ? 'Gerando...' : proposals.length > 0 ? 'Regerar' : 'Gerar Times'}
              </button>
            )}
          </div>
        )}
      </div>

      {partidaAnterior && (
        <div className="mb-5 border border-[#e0e0e0] rounded-xl overflow-hidden">
          <button
            onClick={() => setShowPartidaAnterior(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-semibold text-gray-600">
                Jogo anterior —{' '}
                {format(parseISO(partidaAnterior.data), "d 'de' MMMM", { locale: ptBR })}
              </span>
            </div>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${showPartidaAnterior ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showPartidaAnterior && (
            <div className="px-4 py-3 grid grid-cols-2 gap-3">
              {([
                { nome: partidaAnterior.nome_time_a, jogadores: partidaAnterior.time_a },
                { nome: partidaAnterior.nome_time_b, jogadores: partidaAnterior.time_b },
              ] as const).map((time) => (
                <div key={time.nome}>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{time.nome}</p>
                  <ul className="space-y-1">
                    {time.jogadores.map((j) => (
                      <li key={j.id} className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${POSICAO_CORES[j.posicao_principal]} shrink-0`}>
                          {j.posicao_principal.substring(0, 3).toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-700 truncate">{j.nome}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {editMode && (
        <TeamEditor
          key={`${editTimeA.map(j => j.id).join()}-${editTimeB.map(j => j.id).join()}`}
          initialTimeA={editTimeA}
          initialTimeB={editTimeB}
          initialBanco={editBanco}
          nomeTimeA={partida?.nome_time_a ?? 'Amarelo'}
          nomeTimeB={partida?.nome_time_b ?? 'Azul'}
          onSave={handleEditorSave}
        />
      )}

      {!editMode && proposals.length === 0 && !generating && !isRealizada && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">⚽</div>
          {selectedTeams ? (
            <>
              <p className="text-gray-500 text-lg font-medium">Times já definidos</p>
              <p className="text-gray-400 text-sm mt-2 mb-6">
                Clique em &quot;Alterar&quot; para editar os times, ou &quot;Gerar Times&quot; para novas propostas.
              </p>
            </>
          ) : (
            <>
              <p className="text-gray-500 text-lg font-medium">Pronto para sortear os times?</p>
              <p className="text-gray-400 text-sm mt-2 mb-6">
                Clique em &quot;Gerar Times&quot; para ver 3 propostas balanceadas por posição e nível.
              </p>
              <button
                onClick={generateTeams}
                disabled={generating}
                className="bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                Gerar Times
              </button>
            </>
          )}
        </div>
      )}

      {!editMode && proposals.length > 0 && (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            {proposals.map((p, i) => (
              <TeamProposalCard
                key={p.proposta_numero}
                proposta={p}
                nomeTimeA={partida?.nome_time_a ?? 'Amarelo'}
                nomeTimeB={partida?.nome_time_b ?? 'Azul'}
                selected={
                  selectedTeams
                    ? JSON.stringify([...p.time_a.map(j => j.id)].sort()) ===
                      JSON.stringify([...(selectedTeams.time_a)].sort())
                    : false
                }
                onSelect={() => handleSelect(p)}
                loading={loading}
                onTeamsChange={(timeA, timeB) => handleTeamsChange(i, timeA, timeB)}
              />
            ))}
          </div>

          {selectedTeams && (
            <div className="mt-8 flex justify-center">
              <Link
                href={`/partidas/${id}`}
                className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m7-7-7 7 7 7" />
                </svg>
                Voltar à Partida
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}
