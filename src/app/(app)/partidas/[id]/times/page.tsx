'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import type { Partida, PropostaTimeComJogadores } from '@/lib/supabase'
import TeamProposalCard from '@/components/partidas/TeamProposalCard'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function TimesPage() {
  const params = useParams()
  const id = params.id as string

  const [partida, setPartida] = useState<Partida | null>(null)
  const [proposals, setProposals] = useState<PropostaTimeComJogadores[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  const loadPartida = useCallback(async () => {
    const res = await fetch(`/api/partidas/${id}`)
    if (res.ok) setPartida(await res.json())
  }, [id])

  useEffect(() => { loadPartida() }, [loadPartida])

  async function generateTeams() {
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

  const selectedTeams = partida?.times_escolhidos

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <Link href={`/partidas/${id}`} className="text-gray-400 hover:text-white transition-colors mt-1">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m7-7-7 7 7 7" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-white text-2xl font-bold">Propostas de Times</h1>
          {partida && (
            <p className="text-gray-500 text-sm mt-0.5">
              {format(parseISO(partida.data), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
          )}
        </div>
        <button
          onClick={generateTeams}
          disabled={generating}
          className="flex items-center gap-2 bg-lime-500 hover:bg-lime-400 disabled:opacity-50 text-black font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <svg className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {generating ? 'Gerando...' : proposals.length > 0 ? 'Regerar' : 'Gerar Times'}
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {proposals.length === 0 && !generating && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">⚽</div>
          <p className="text-gray-400 text-lg font-medium">Pronto para sortear os times?</p>
          <p className="text-gray-500 text-sm mt-2 mb-6">
            Clique em &quot;Gerar Times&quot; para ver 3 propostas balanceadas por posição e nível.
          </p>
          <button
            onClick={generateTeams}
            disabled={generating}
            className="bg-lime-500 hover:bg-lime-400 text-black font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Gerar Times
          </button>
        </div>
      )}

      {selectedTeams && proposals.length === 0 && (
        <div className="mb-6 bg-lime-500/10 border border-lime-500/20 rounded-xl px-4 py-3">
          <p className="text-lime-400 text-sm font-medium">
            Times já definidos para esta partida. Clique em &quot;Regerar&quot; para criar novas propostas.
          </p>
        </div>
      )}

      {proposals.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-3">
          {proposals.map(p => (
            <TeamProposalCard
              key={p.proposta_numero}
              proposta={p}
              selected={
                selectedTeams
                  ? JSON.stringify([...p.time_a.map(j => j.id)].sort()) ===
                    JSON.stringify([...(selectedTeams.time_a)].sort())
                  : false
              }
              onSelect={() => handleSelect(p)}
              loading={loading}
            />
          ))}
        </div>
      )}
    </div>
  )
}
