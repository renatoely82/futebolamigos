'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'

type Opcao = { id: string; texto: string; ordem: number }
type Enquete = { id: string; titulo: string; descricao: string | null; ativa: boolean; mostrar_resultados: boolean; enquete_opcoes: Opcao[] }
type TokenRow = { jogador_id: string; usado: boolean; jogadores: { nome: string } | null }
type Resultado = { id: string; texto: string; votos: number }

type Stage = 'loading' | 'vote' | 'already_voted' | 'closed' | 'success' | 'results' | 'error'

export default function VotacaoPage() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [enquete, setEnquete] = useState<Enquete | null>(null)
  const [tokenRow, setTokenRow] = useState<TokenRow | null>(null)
  const [stage, setStage] = useState<Stage>('loading')
  const [selected, setSelected] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [resultados, setResultados] = useState<Resultado[] | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token) { setStage('error'); setErrorMsg('Link inválido.'); return }

    fetch(`/api/enquetes/${id}?token=${token}`)
      .then(async r => {
        if (!r.ok) { setStage('error'); setErrorMsg('Link inválido ou enquete não encontrada.'); return }
        const { enquete: e, tokenRow: t } = await r.json()
        setEnquete(e)
        setTokenRow(t)
        if (!e.ativa) setStage('closed')
        else if (t.usado) setStage('already_voted')
        else setStage('vote')
      })
      .catch(() => { setStage('error'); setErrorMsg('Erro ao carregar enquete.') })
  }, [id, token])

  async function handleVotar() {
    if (!selected) return
    setSubmitting(true)

    const res = await fetch(`/api/enquetes/${id}/votar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, opcao_id: selected }),
    })

    if (!res.ok) {
      const data = await res.json()
      if (data.error === 'Você já votou nesta enquete') setStage('already_voted')
      else { setErrorMsg(data.error || 'Erro ao votar'); setStage('error') }
      setSubmitting(false)
      return
    }

    if (enquete?.mostrar_resultados) {
      const rRes = await fetch(`/api/enquetes/${id}/resultados`)
      // Note: this public page won't have admin auth, so results endpoint may not work.
      // We show a simple success instead.
      if (rRes.ok) {
        const data = await rRes.json()
        setResultados(data.contagem)
        setStage('results')
      } else {
        setStage('success')
      }
    } else {
      setStage('success')
    }
    setSubmitting(false)
  }

  const opcoes = enquete?.enquete_opcoes.sort((a, b) => a.ordem - b.ordem) ?? []
  const jogadorNome = tokenRow?.jogadores?.nome ?? 'Jogador'

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-green-500 rounded-2xl mb-3">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" opacity=".3" />
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm font-medium">Futebol Amigos · Enquete</p>
        </div>

        {stage === 'loading' && (
          <div className="text-center text-gray-400 py-10">Carregando...</div>
        )}

        {stage === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600 font-medium">Link inválido</p>
            <p className="text-red-500 text-sm mt-1">{errorMsg}</p>
          </div>
        )}

        {stage === 'closed' && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
            <p className="text-gray-700 font-semibold text-lg">{enquete?.titulo}</p>
            <p className="text-gray-500 text-sm mt-3">Esta enquete foi encerrada.</p>
          </div>
        )}

        {stage === 'already_voted' && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
            <svg className="w-10 h-10 text-blue-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-blue-700 font-semibold">Você já votou!</p>
            <p className="text-blue-500 text-sm mt-1">Seu voto já foi registrado nesta enquete.</p>
          </div>
        )}

        {stage === 'vote' && enquete && (
          <div className="bg-white border border-[#e0e0e0] rounded-2xl shadow-sm p-5">
            <p className="text-xs text-gray-400 mb-1">Olá, {jogadorNome} 👋</p>
            <h1 className="text-gray-800 font-bold text-lg mb-4">{enquete.titulo}</h1>
            {enquete.descricao && <p className="text-gray-500 text-sm mb-4">{enquete.descricao}</p>}

            <div className="space-y-2 mb-5">
              {opcoes.map(op => (
                <button
                  key={op.id}
                  onClick={() => setSelected(op.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium ${
                    selected === op.id
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${selected === op.id ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
                      {selected === op.id && <span className="block w-full h-full rounded-full bg-white scale-50" />}
                    </span>
                    {op.texto}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={handleVotar}
              disabled={!selected || submitting}
              className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {submitting ? 'Enviando...' : 'Votar'}
            </button>
          </div>
        )}

        {stage === 'success' && enquete && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <svg className="w-12 h-12 text-green-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-green-700 font-bold text-lg">Voto registrado!</p>
            <p className="text-green-600 text-sm mt-1">Obrigado, {jogadorNome}. Sua resposta foi salva.</p>
          </div>
        )}

        {stage === 'results' && resultados && enquete && (
          <div className="bg-white border border-[#e0e0e0] rounded-2xl shadow-sm p-5">
            <div className="text-center mb-4">
              <svg className="w-8 h-8 text-green-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-green-700 font-semibold">Voto registrado!</p>
            </div>
            <h2 className="font-bold text-gray-800 mb-3 text-sm">Resultados parciais</h2>
            <div className="space-y-2">
              {resultados.map(op => {
                const total = resultados.reduce((s, r) => s + r.votos, 0)
                const pct = total ? Math.round((op.votos / total) * 100) : 0
                return (
                  <div key={op.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{op.texto}</span>
                      <span className="text-gray-500">{pct}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
