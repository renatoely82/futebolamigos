'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Jogador, Posicao, PartidaJogadorComDetalhes, Partida, PropostaTimeComJogadores, VotacaoStatus } from '@/lib/supabase'
import { POSICAO_CORES, POSICOES } from '@/lib/supabase'
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
  const [convocados, setConvocados] = useState<PartidaJogadorComDetalhes[]>([])
  const [showPosicoes, setShowPosicoes] = useState(false)
  const [votacao, setVotacao] = useState<VotacaoStatus | null>(null)
  const [votacaoLoading, setVotacaoLoading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const loadPartida = useCallback(async () => {
    const res = await fetch(`/api/partidas/${id}`)
    if (res.ok) setPartida(await res.json())
  }, [id])

  const loadVotacao = useCallback(async () => {
    const res = await fetch(`/api/partidas/${id}/votacao`)
    if (res.ok) {
      const data = await res.json()
      setVotacao(data.status === 'com_votacao' ? data : null)
    }
  }, [id])

  const loadPartidaAnterior = useCallback(async () => {
    const res = await fetch(`/api/partidas/${id}/times`)
    if (res.ok) {
      const data = await res.json()
      setPartidaAnterior(data)
    }
  }, [id])

  const loadConvocados = useCallback(async () => {
    const res = await fetch(`/api/partidas/${id}/jogadores`)
    if (res.ok) {
      const data: PartidaJogadorComDetalhes[] = await res.json()
      setConvocados(data.filter(pj => pj.confirmado))
    }
  }, [id])

  useEffect(() => {
    loadPartida()
    loadPartidaAnterior()
    loadConvocados()
    loadVotacao()
  }, [loadPartida, loadPartidaAnterior, loadConvocados, loadVotacao])

  // Poll voting counts every 30s when voting is open
  useEffect(() => {
    if (!votacao?.ativa) return
    const interval = setInterval(loadVotacao, 30000)
    return () => clearInterval(interval)
  }, [votacao?.ativa, loadVotacao])

  useEffect(() => {
    if (partida && !partida.times_escolhidos) {
      setShowPosicoes(true)
    }
  }, [partida])

  async function handlePosicaoChange(jogadorId: string, posicao: Posicao) {
    const prev = convocados
    setConvocados(list =>
      list.map(pj =>
        pj.jogador_id === jogadorId ? { ...pj, posicao_convocacao: posicao } : pj
      )
    )
    const res = await fetch(`/api/partidas/${id}/jogadores`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jogador_id: jogadorId, posicao_convocacao: posicao }),
    })
    if (!res.ok) setConvocados(prev)
  }

  async function generateTeams() {
    setEditMode(false)
    setGenerating(true)
    setShowPosicoes(false)
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
    const allPlayers = rows.map(r =>
      r.posicao_convocacao ? { ...r.jogador, posicao_principal: r.posicao_convocacao } : r.jogador
    )
    const { time_a: idsA, time_b: idsB } = partida.times_escolhidos
    const teamA = allPlayers.filter(j => idsA.includes(j.id))
    const teamB = allPlayers.filter(j => idsB.includes(j.id))
    const banco = allPlayers.filter(j => !idsA.includes(j.id) && !idsB.includes(j.id))
    setEditTimeA(teamA)
    setEditTimeB(teamB)
    setEditBanco(banco)
    setProposals([])
    setShowPosicoes(false)
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

  async function abrirVotacao() {
    setVotacaoLoading(true)
    const res = await fetch(`/api/partidas/${id}/votacao`, { method: 'POST' })
    if (res.ok) await loadVotacao()
    setVotacaoLoading(false)
  }

  async function encerrarVotacao() {
    setVotacaoLoading(true)
    await fetch(`/api/partidas/${id}/votacao`, { method: 'DELETE' })
    await loadVotacao()
    setVotacaoLoading(false)
  }

  async function aplicarVencedora() {
    if (!votacao) return
    const vencedora = [...votacao.propostas_com_votos].sort((a, b) => b.votos - a.votos)[0]
    if (!vencedora) return
    const proposta = proposals.find(p => p.proposta_numero === vencedora.proposta_numero)
    if (!proposta) return
    await handleSelect(proposta)
  }

  function copyLink(token: string) {
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/votar-times/${votacao?.enquete_id}?token=${token}`
    navigator.clipboard.writeText(url)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  function shareWhatsApp(nome: string, token: string) {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const url = `${origin}/votar-times/${votacao?.enquete_id}?token=${token}`
    const dataStr = partida ? ` de ${format(parseISO(partida.data), "d 'de' MMMM", { locale: ptBR })}` : ''
    const msg = `⚽ *Barcelombra Fútbol* — Vote nos times${dataStr}!\n\n${url}`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
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

      {selectedTeams && !editMode && proposals.length === 0 && !generating && (
        <div className="mb-5 border border-[#e0e0e0] rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-[#e0e0e0]">
            <span className="text-sm font-semibold text-gray-600">Times Definidos</span>
          </div>
          <div className="px-4 py-3 grid grid-cols-2 gap-3">
            {[
              { nome: partida?.nome_time_a ?? 'Amarelo', ids: selectedTeams.time_a },
              { nome: partida?.nome_time_b ?? 'Azul', ids: selectedTeams.time_b },
            ].map((time) => {
              const membros = convocados
                .filter(pj => time.ids.includes(pj.jogador_id))
                .sort((a, b) => {
                  const posA = POSICOES.indexOf(a.posicao_convocacao ?? a.jogador.posicao_principal)
                  const posB = POSICOES.indexOf(b.posicao_convocacao ?? b.jogador.posicao_principal)
                  if (posA !== posB) return posA - posB
                  return a.jogador.nome.localeCompare(b.jogador.nome, 'pt-BR')
                })
              return (
                <div key={time.nome}>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{time.nome}</p>
                  <ul className="space-y-1">
                    {membros.map(pj => {
                      const pos = pj.posicao_convocacao ?? pj.jogador.posicao_principal
                      return (
                        <li key={pj.jogador_id} className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${POSICAO_CORES[pos]} shrink-0`}>
                            {pos.substring(0, 3).toUpperCase()}
                          </span>
                          <span className="text-sm text-gray-700 truncate">{pj.jogador.nome}</span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      )}

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

      {!isRealizada && convocados.length > 0 && (
        <div className="mb-5 border border-[#e0e0e0] rounded-xl overflow-hidden">
          <button
            onClick={() => setShowPosicoes(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
          >
            <span className="text-sm font-semibold text-gray-600">Posições para o Sorteio</span>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${showPosicoes ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showPosicoes && (
            <div className="grid grid-cols-[max-content_auto]">
              {[...convocados]
                .sort((a, b) => {
                  const posA = POSICOES.indexOf(a.posicao_convocacao ?? a.jogador.posicao_principal)
                  const posB = POSICOES.indexOf(b.posicao_convocacao ?? b.jogador.posicao_principal)
                  if (posA !== posB) return posA - posB
                  return a.jogador.nome.localeCompare(b.jogador.nome, 'pt-BR')
                })
                .map((pj, i, arr) => {
                  const effective = pj.posicao_convocacao ?? pj.jogador.posicao_principal
                  const registered = new Set([
                    pj.jogador.posicao_principal,
                    pj.jogador.posicao_secundaria_1,
                    pj.jogador.posicao_secundaria_2,
                  ].filter((p): p is Posicao => p !== null))
                  const borderClass = i < arr.length - 1 ? 'border-b border-[#f0f0f0]' : ''
                  return (
                    <Fragment key={pj.jogador_id}>
                      <span className={`text-sm text-gray-700 flex items-center pl-4 pr-2 py-2.5 ${borderClass}`}>
                        {pj.jogador.nome}
                      </span>
                      <div className={`flex items-center gap-1 pr-4 py-2.5 ${borderClass}`}>
                        {POSICOES.map(pos => (
                          <button
                            key={pos}
                            onClick={() => pos !== effective && handlePosicaoChange(pj.jogador_id, pos)}
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded transition-opacity ${POSICAO_CORES[pos]} ${
                              pos === effective
                                ? 'opacity-100'
                                : registered.has(pos)
                                ? 'opacity-50 hover:opacity-80'
                                : 'opacity-20 hover:opacity-50'
                            }`}
                          >
                            {pos.substring(0, 3).toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </Fragment>
                  )
                })}
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

      {!editMode && proposals.length === 0 && !generating && !isRealizada && !selectedTeams && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">⚽</div>
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
        </div>
      )}

      {!editMode && proposals.length > 0 && (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            {proposals.map((p, i) => {
              const votoInfo = votacao?.propostas_com_votos.find(v => v.proposta_numero === p.proposta_numero)
              return (
                <div key={p.proposta_numero} className="relative">
                  {votoInfo !== undefined && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10">
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full border shadow-sm ${
                        votoInfo.votos > 0 ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-500 border-gray-200'
                      }`}>
                        {votoInfo.votos} {votoInfo.votos === 1 ? 'voto' : 'votos'}
                      </span>
                    </div>
                  )}
                  <TeamProposalCard
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
                </div>
              )
            })}
          </div>

          {/* Voting panel */}
          {!isRealizada && (
            <div className="mt-8 border border-[#e0e0e0] rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-[#e0e0e0] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <span className="text-sm font-semibold text-gray-600">Votação</span>
                  {votacao && (
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${votacao.ativa ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                      {votacao.ativa ? 'Aberta' : 'Encerrada'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {votacao?.ativa && (
                    <button
                      onClick={loadVotacao}
                      className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Atualizar
                    </button>
                  )}
                  {votacao?.ativa && (
                    <button
                      onClick={encerrarVotacao}
                      disabled={votacaoLoading}
                      className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50 transition-colors"
                    >
                      Encerrar
                    </button>
                  )}
                </div>
              </div>

              {!votacao ? (
                <div className="px-4 py-5 flex flex-col items-center gap-3">
                  <p className="text-sm text-gray-500 text-center">
                    Abra a votação para enviar links às pessoas da diretoria via WhatsApp.
                  </p>
                  <button
                    onClick={abrirVotacao}
                    disabled={votacaoLoading}
                    className="flex items-center gap-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    {votacaoLoading ? 'Abrindo...' : 'Abrir Votação'}
                  </button>
                </div>
              ) : (
                <div>
                  {/* Token list */}
                  <div className="divide-y divide-[#f0f0f0]">
                    {(votacao.tokens ?? [])
                      .sort((a, b) => {
                        const nA = a.jogadores?.nome ?? ''
                        const nB = b.jogadores?.nome ?? ''
                        return nA.localeCompare(nB, 'pt-BR')
                      })
                      .map(t => (
                        <div key={t.token} className="flex items-center justify-between px-4 py-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${t.usado ? 'bg-green-400' : 'bg-gray-200'}`} />
                            <span className="text-sm text-gray-700 truncate">{t.jogadores?.nome ?? '—'}</span>
                            {t.usado && <span className="text-[10px] text-green-600 font-medium shrink-0">votou</span>}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-3">
                            <button
                              onClick={() => shareWhatsApp(t.jogadores?.nome ?? '', t.token)}
                              className="p-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 transition-colors"
                              title="Compartilhar no WhatsApp"
                            >
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.85L.057 23.5l5.796-1.52A11.93 11.93 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.805 9.805 0 01-5.003-1.368l-.358-.213-3.44.903.919-3.352-.233-.375A9.784 9.784 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => copyLink(t.token)}
                              className="p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500 transition-colors"
                              title="Copiar link"
                            >
                              {copied === t.token ? (
                                <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Apply winner */}
                  {proposals.length > 0 && (
                    <div className="px-4 py-4 border-t border-[#e0e0e0] flex justify-center">
                      <button
                        onClick={aplicarVencedora}
                        disabled={loading}
                        className="flex items-center gap-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Aplicar Proposta Vencedora
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {selectedTeams && (
            <div className="mt-6 flex justify-center">
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
