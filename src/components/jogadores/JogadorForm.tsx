'use client'

import { useState } from 'react'
import type { Jogador, Posicao, Nivel } from '@/lib/supabase'
import { POSICOES } from '@/lib/supabase'

interface JogadorFormProps {
  initial?: Partial<Jogador>
  onSave: (data: JogadorFormData) => Promise<void>
  onCancel: () => void
}

export interface JogadorFormData {
  nome: string
  posicao_principal: Posicao
  posicao_secundaria_1: Posicao | null
  posicao_secundaria_2: Posicao | null
  nivel: Nivel
  telefone: string
  aniversario: string
  observacoes: string
}

export default function JogadorForm({ initial, onSave, onCancel }: JogadorFormProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<JogadorFormData>({
    nome: initial?.nome ?? '',
    posicao_principal: initial?.posicao_principal ?? 'Atacante',
    posicao_secundaria_1: initial?.posicao_secundaria_1 ?? null,
    posicao_secundaria_2: initial?.posicao_secundaria_2 ?? null,
    nivel: initial?.nivel ?? 3,
    telefone: initial?.telefone ?? '',
    aniversario: initial?.aniversario ?? '',
    observacoes: initial?.observacoes ?? '',
  })

  function set<K extends keyof JogadorFormData>(key: K, value: JogadorFormData[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.nome.trim()) { setError('Nome é obrigatório.'); return }
    setSaving(true)
    try {
      await onSave(form)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  const posNullOptions: (Posicao | '')[] = ['', ...POSICOES]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Nome */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Nome *</label>
        <input
          type="text"
          value={form.nome}
          onChange={e => set('nome', e.target.value)}
          className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-lime-500"
          placeholder="Nome do jogador"
        />
      </div>

      {/* Posições */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Posição Principal *</label>
          <select
            value={form.posicao_principal}
            onChange={e => set('posicao_principal', e.target.value as Posicao)}
            className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-lime-500"
          >
            {POSICOES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">2ª Posição</label>
          <select
            value={form.posicao_secundaria_1 ?? ''}
            onChange={e => set('posicao_secundaria_1', e.target.value ? e.target.value as Posicao : null)}
            className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-lime-500"
          >
            {posNullOptions.map(p => <option key={p} value={p}>{p || 'Nenhuma'}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">3ª Posição</label>
          <select
            value={form.posicao_secundaria_2 ?? ''}
            onChange={e => set('posicao_secundaria_2', e.target.value ? e.target.value as Posicao : null)}
            className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-lime-500"
          >
            {posNullOptions.map(p => <option key={p} value={p}>{p || 'Nenhuma'}</option>)}
          </select>
        </div>
      </div>

      {/* Nível */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Nível</label>
        <div className="flex gap-2">
          {([1, 2, 3, 4, 5] as Nivel[]).map(n => (
            <button
              key={n}
              type="button"
              onClick={() => set('nivel', n)}
              className={`w-9 h-9 rounded-lg text-sm font-bold transition-colors ${
                form.nivel >= n
                  ? 'bg-lime-500 text-black'
                  : 'bg-[#222] text-gray-500 hover:bg-[#333]'
              }`}
            >
              {n}
            </button>
          ))}
          <span className="ml-2 text-gray-400 text-sm self-center">
            {['', 'Fraco', 'Abaixo da média', 'Médio', 'Bom', 'Craque'][form.nivel]}
          </span>
        </div>
      </div>

      {/* Telefone + Aniversário */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Telefone</label>
          <input
            type="tel"
            value={form.telefone}
            onChange={e => set('telefone', e.target.value)}
            className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-lime-500"
            placeholder="+55 11 99999-0000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Aniversário</label>
          <input
            type="date"
            value={form.aniversario}
            onChange={e => set('aniversario', e.target.value)}
            className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-lime-500"
          />
        </div>
      </div>

      {/* Observações */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Observações</label>
        <textarea
          value={form.observacoes}
          onChange={e => set('observacoes', e.target.value)}
          rows={2}
          className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-lime-500 resize-none"
          placeholder="Notas sobre o jogador..."
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-lime-500 hover:bg-lime-400 disabled:opacity-50 text-black font-semibold py-2.5 rounded-lg transition-colors"
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-[#222] hover:bg-[#333] text-white font-semibold py-2.5 rounded-lg transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
