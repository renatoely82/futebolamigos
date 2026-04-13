'use client'

import { useState } from 'react'
import type { Temporada } from '@/lib/supabase'

export interface TemporadaFormData {
  nome: string
  data_inicio: string
  data_fim: string
  ativa: boolean
}

interface Props {
  initial?: Temporada
  onSave: (data: TemporadaFormData) => Promise<void>
  onCancel: () => void
}

export default function TemporadaForm({ initial, onSave, onCancel }: Props) {
  const [form, setForm] = useState<TemporadaFormData>({
    nome: initial?.nome ?? '',
    data_inicio: initial?.data_inicio ?? '',
    data_fim: initial?.data_fim ?? '',
    ativa: initial?.ativa ?? false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.data_fim < form.data_inicio) {
      setError('A data de fim deve ser posterior à data de início.')
      return
    }
    setLoading(true)
    try {
      await onSave(form)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">Nome *</label>
        <input
          type="text"
          required
          value={form.nome}
          onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
          className="w-full bg-white border border-[#d1d9e0] rounded-lg px-3 py-2.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500"
          placeholder="Ex: 2025/2026"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Data de Início *</label>
          <input
            type="date"
            required
            value={form.data_inicio}
            onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))}
            className="w-full bg-white border border-[#d1d9e0] rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:border-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Data de Fim *</label>
          <input
            type="date"
            required
            value={form.data_fim}
            onChange={e => setForm(f => ({ ...f, data_fim: e.target.value }))}
            className="w-full bg-white border border-[#d1d9e0] rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:border-green-500"
          />
        </div>
      </div>
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={form.ativa}
          onChange={e => setForm(f => ({ ...f, ativa: e.target.checked }))}
          className="w-4 h-4 accent-green-500"
        />
        <span className="text-sm text-gray-600">Definir como temporada ativa</span>
      </label>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
        >
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-lg transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
