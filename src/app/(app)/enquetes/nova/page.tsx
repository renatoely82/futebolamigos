'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NovaEnquetePage() {
  const router = useRouter()
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [opcoes, setOpcoes] = useState(['', ''])
  const [mostrarResultados, setMostrarResultados] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function addOpcao() {
    if (opcoes.length < 6) setOpcoes(prev => [...prev, ''])
  }

  function removeOpcao(i: number) {
    if (opcoes.length > 2) setOpcoes(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateOpcao(i: number, value: string) {
    setOpcoes(prev => prev.map((o, idx) => idx === i ? value : o))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const filledOpcoes = opcoes.map(o => o.trim()).filter(Boolean)
    if (filledOpcoes.length < 2) {
      setError('Preencha pelo menos 2 opções')
      return
    }

    setSaving(true)
    setError('')

    const res = await fetch('/api/enquetes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo, descricao, opcoes: filledOpcoes, mostrar_resultados: mostrarResultados }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Erro ao criar enquete')
      setSaving(false)
      return
    }

    const enquete = await res.json()
    router.push(`/enquetes/${enquete.id}`)
  }

  return (
    <div className="p-4 sm:p-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/enquetes" className="text-gray-400 hover:text-gray-700 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m7-7-7 7 7 7" />
          </svg>
        </Link>
        <h1 className="text-gray-800 text-2xl font-bold">Nova Enquete</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Pergunta *</label>
          <input
            type="text"
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            required
            placeholder="Ex: Qual horário preferem para o racha?"
            className="w-full bg-white border border-[#e0e0e0] rounded-lg px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Descrição (opcional)</label>
          <textarea
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            rows={2}
            placeholder="Contexto adicional..."
            className="w-full bg-white border border-[#e0e0e0] rounded-lg px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 transition-colors resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">Opções *</label>
          <div className="space-y-2">
            {opcoes.map((op, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={op}
                  onChange={e => updateOpcao(i, e.target.value)}
                  placeholder={`Opção ${i + 1}`}
                  className="flex-1 bg-white border border-[#e0e0e0] rounded-lg px-4 py-2.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 transition-colors"
                />
                {opcoes.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOpcao(i)}
                    className="text-gray-400 hover:text-red-500 transition-colors px-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeWidth={2} strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          {opcoes.length < 6 && (
            <button
              type="button"
              onClick={addOpcao}
              className="mt-2 text-green-600 hover:text-green-700 text-sm font-medium flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeWidth={2.5} strokeLinecap="round" d="M12 5v14M5 12h14" />
              </svg>
              Adicionar opção
            </button>
          )}
        </div>

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            onClick={() => setMostrarResultados(v => !v)}
            className={`w-11 h-6 rounded-full transition-colors relative ${mostrarResultados ? 'bg-green-500' : 'bg-gray-200'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${mostrarResultados ? 'translate-x-5' : ''}`} />
          </div>
          <span className="text-sm text-gray-600">Mostrar resultados ao jogador após votar</span>
        </label>

        {error && (
          <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={saving || !titulo.trim()}
          className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {saving ? 'Criando...' : 'Criar enquete e gerar links'}
        </button>
      </form>
    </div>
  )
}
