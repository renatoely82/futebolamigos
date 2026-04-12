'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NovaPartidaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    data: new Date().toISOString().split('T')[0],
    local: '',
    observacoes: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/partidas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
            <label className="block text-sm font-medium text-gray-300 mb-1">Observações</label>
            <textarea
              value={form.observacoes}
              onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
              rows={3}
              className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-lime-500 resize-none"
              placeholder="Informações extras..."
            />
          </div>

          <div className="bg-lime-500/10 border border-lime-500/20 rounded-lg px-4 py-3">
            <p className="text-lime-400 text-sm">
              Os mensalistas serão incluídos automaticamente ao criar a partida.
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
