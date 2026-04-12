'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Temporada } from '@/lib/supabase'

export default function NovaPartidaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [temporadas, setTemporadas] = useState<Temporada[]>([])
  const [form, setForm] = useState({
    data: new Date().toISOString().split('T')[0],
    local: '',
    numero_jogadores: '',
    nome_time_a: 'Amarelo',
    nome_time_b: 'Azul',
    observacoes: '',
    temporada_id: '',
  })

  useEffect(() => {
    fetch('/api/temporadas').then(r => r.json()).then((list: Temporada[]) => {
      setTemporadas(list)
      const ativa = list.find(t => t.ativa)
      if (ativa) setForm(f => ({ ...f, temporada_id: ativa.id }))
    })
  }, [])

  const numJogadores = parseInt(form.numero_jogadores)
  const showOddWarning = !isNaN(numJogadores) && numJogadores > 0 && numJogadores % 2 !== 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/partidas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          numero_jogadores: form.numero_jogadores ? parseInt(form.numero_jogadores) : null,
          nome_time_a: form.nome_time_a || 'Amarelo',
          nome_time_b: form.nome_time_b || 'Azul',
          temporada_id: form.temporada_id || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro ao criar partida.'); return }
      router.push(`/partidas/${data.id}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/partidas" className="text-gray-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m7-7-7 7 7 7" />
          </svg>
        </Link>
        <h1 className="text-white text-2xl font-bold">Nova Partida</h1>
      </div>

      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Data *</label>
            <input
              type="date"
              required
              value={form.data}
              onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
              className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-lime-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Local</label>
            <input
              type="text"
              value={form.local}
              onChange={e => setForm(f => ({ ...f, local: e.target.value }))}
              className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-lime-500"
              placeholder="Ex: Quadra do clube"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Número de Jogadores</label>
            <input
              type="number"
              min="2"
              max="100"
              value={form.numero_jogadores}
              onChange={e => setForm(f => ({ ...f, numero_jogadores: e.target.value }))}
              className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-lime-500"
              placeholder="Ex: 14"
            />
            {showOddWarning && (
              <p className="text-yellow-400 text-xs mt-1">
                Número ímpar — não é possível dividir igualmente nos dois times.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Nome do Time A</label>
              <input
                type="text"
                value={form.nome_time_a}
                onChange={e => setForm(f => ({ ...f, nome_time_a: e.target.value }))}
                className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-lime-500"
                placeholder="Amarelo"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Nome do Time B</label>
              <input
                type="text"
                value={form.nome_time_b}
                onChange={e => setForm(f => ({ ...f, nome_time_b: e.target.value }))}
                className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-lime-500"
                placeholder="Azul"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Observações</label>
            <textarea
              value={form.observacoes}
              onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
              rows={3}
              className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-lime-500 resize-none"
              placeholder="Informações extras..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Temporada</label>
            {temporadas.length === 0 ? (
              <p className="text-gray-500 text-sm py-2">
                Nenhuma temporada cadastrada.{' '}
                <Link href="/temporadas/nova" className="text-lime-400 hover:text-lime-300">Criar temporada</Link>
              </p>
            ) : (
              <select
                value={form.temporada_id}
                onChange={e => setForm(f => ({ ...f, temporada_id: e.target.value }))}
                className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-lime-500"
              >
                <option value="">Sem temporada</option>
                {temporadas.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nome}{t.ativa ? ' (ativa)' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="bg-lime-500/10 border border-lime-500/20 rounded-lg px-4 py-3">
            <p className="text-lime-400 text-sm">
              Os mensalistas da temporada serão incluídos automaticamente ao criar a partida.
            </p>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-lime-500 hover:bg-lime-400 disabled:opacity-50 text-black font-semibold py-2.5 rounded-lg transition-colors"
            >
              {loading ? 'Criando...' : 'Criar Partida'}
            </button>
            <Link
              href="/partidas"
              className="flex-1 text-center bg-[#222] hover:bg-[#333] text-white font-semibold py-2.5 rounded-lg transition-colors"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
