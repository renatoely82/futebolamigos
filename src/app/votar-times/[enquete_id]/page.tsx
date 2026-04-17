'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { POSICAO_CORES } from '@/lib/supabase'
import type { Jogador, PropostaTimeComJogadores } from '@/lib/supabase'

type Opcao = { id: string; texto: string; ordem: number }
type Enquete = {
  id: string
  titulo: string
  ativa: boolean
  partida_id: string | null
  enquete_opcoes: Opcao[]
}
type TokenRow = { jogador_id: string; usado: boolean; jogadores: { nome: string } | null }
type Stage = 'loading' | 'vote' | 'ja_votou' | 'encerrada' | 'sucesso' | 'erro'

export default function VotarTimesPage() {
  const { enquete_id } = useParams<{ enquete_id: string }>()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [enquete, setEnquete] = useState<Enquete | null>(null)
  const [tokenRow, setTokenRow] = useState<TokenRow | null>(null)
  const [propostas, setPropostas] = useState<PropostaTimeComJogadores[]>([])
  const [stage, setStage] = useState<Stage>('loading')
  const [selected, setSelected] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token) {
      setStage('erro')
      setErrorMsg('Link inválido. Solicite um novo link.')
      return
    }

    fetch(`/api/enquetes/${enquete_id}?token=${token}`)
      .then(async r => {
        if (!r.ok) {
          setStage('erro')
          setErrorMsg('Link inválido ou votação não encontrada.')
          return
        }
        const { enquete: e, tokenRow: t } = await r.json()
        setEnquete(e)
        setTokenRow(t)

        if (!e.ativa) { setStage('encerrada'); return }
        if (t.usado) { setStage('ja_votou'); return }

        // Load proposals if partida_id exists
        if (e.partida_id) {
          fetch(`/api/partidas/${e.partida_id}/propostas`)
            .then(async pRes => {
              if (pRes.ok) setPropostas(await pRes.json())
            })
            .catch(() => {/* proposals optional, voting still works without visual cards */})
        }

        setStage('vote')
      })
      .catch(() => {
        setStage('erro')
        setErrorMsg('Erro ao carregar votação.')
      })
  }, [enquete_id, token])

  const opcoes = (enquete?.enquete_opcoes ?? []).sort((a, b) => a.ordem - b.ordem)
  const jogadorNome = tokenRow?.jogadores?.nome ?? 'Jogador'

  async function handleVotar() {
    if (!selected) return
    setSubmitting(true)

    const res = await fetch(`/api/enquetes/${enquete_id}/votar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, opcao_id: selected }),
    })

    if (!res.ok) {
      const data = await res.json()
      if (data.error === 'Você já votou nesta enquete') {
        setStage('ja_votou')
      } else {
        setErrorMsg(data.error || 'Erro ao registrar voto.')
        setStage('erro')
      }
      setSubmitting(false)
      return
    }

    setStage('sucesso')
    setSubmitting(false)
  }

  // Find proposal for a given opcao index
  function getPropostaForIndex(index: number): PropostaTimeComJogadores | undefined {
    return propostas.find(p => p.proposta_numero === (index + 1))
  }

  return (
    <div className="min-h-screen bg-[#f4f6f9] p-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-green-500 rounded-2xl mb-3">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm font-medium">Barcelombra Fútbol · Times</p>
        </div>

        {stage === 'loading' && (
          <div className="text-center text-gray-400 py-10">Carregando...</div>
        )}

        {stage === 'erro' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600 font-medium">Link inválido</p>
            <p className="text-red-500 text-sm mt-1">{errorMsg}</p>
          </div>
        )}

        {stage === 'encerrada' && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
            <p className="text-gray-700 font-semibold text-lg">{enquete?.titulo}</p>
            <p className="text-gray-500 text-sm mt-3">Esta votação foi encerrada.</p>
          </div>
        )}

        {stage === 'ja_votou' && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
            <svg className="w-10 h-10 text-blue-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-blue-700 font-semibold">Você já votou!</p>
            <p className="text-blue-500 text-sm mt-1">Seu voto já foi registrado.</p>
          </div>
        )}

        {stage === 'sucesso' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <svg className="w-12 h-12 text-green-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-green-700 font-bold text-lg">Voto registrado!</p>
            <p className="text-green-600 text-sm mt-1">Obrigado, {jogadorNome}. Sua escolha foi salva.</p>
          </div>
        )}

        {stage === 'vote' && enquete && (
          <div>
            <p className="text-xs text-gray-400 mb-1 text-center">Olá, {jogadorNome} 👋</p>
            <h1 className="text-gray-800 font-bold text-lg mb-1 text-center">{enquete.titulo}</h1>
            <p className="text-gray-500 text-sm mb-5 text-center">Escolha a proposta de times que preferir</p>

            <div className="space-y-4 mb-6">
              {opcoes.map((op, i) => {
                const proposta = getPropostaForIndex(i)
                const isSelected = selected === op.id
                return (
                  <button
                    key={op.id}
                    onClick={() => setSelected(op.id)}
                    className={`w-full text-left rounded-xl border-2 transition-all overflow-hidden ${
                      isSelected
                        ? 'border-green-500 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* Header */}
                    <div className={`flex items-center gap-2 px-4 py-2.5 ${isSelected ? 'bg-green-50' : 'bg-gray-50'}`}>
                      <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${isSelected ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
                        {isSelected && <span className="block w-2 h-2 rounded-full bg-white" />}
                      </span>
                      <span className={`font-semibold text-sm ${isSelected ? 'text-green-700' : 'text-gray-700'}`}>
                        {op.texto}
                      </span>
                    </div>

                    {/* Teams */}
                    {proposta ? (
                      <div className="grid grid-cols-2 divide-x divide-gray-100 bg-white px-3 py-3 gap-2">
                        {([
                          { label: 'Time A', jogadores: proposta.time_a },
                          { label: 'Time B', jogadores: proposta.time_b },
                        ] as const).map(({ label, jogadores }) => (
                          <div key={label} className="px-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">{label}</p>
                            <ul className="space-y-1">
                              {jogadores.map((j: Jogador) => (
                                <li key={j.id} className="flex items-center gap-1">
                                  <span className={`text-[9px] font-semibold px-1 py-0.5 rounded shrink-0 ${POSICAO_CORES[j.posicao_principal]}`}>
                                    {j.posicao_principal.substring(0, 3).toUpperCase()}
                                  </span>
                                  <span className="text-xs text-gray-700 truncate">{j.nome}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white px-4 py-2 text-xs text-gray-400">
                        Selecione para votar nesta proposta
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            <button
              onClick={handleVotar}
              disabled={!selected || submitting}
              className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {submitting ? 'Enviando...' : 'Confirmar Voto'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
