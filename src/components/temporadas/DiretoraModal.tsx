'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import type { Jogador, TemporadaDiretoriaComJogador } from '@/lib/supabase'

interface DiretoraModalProps {
  open: boolean
  onClose: () => void
  temporadaId: string
  todosJogadores: Jogador[]
}

export default function DiretoraModal({ open, onClose, temporadaId, todosJogadores }: DiretoraModalProps) {
  const [diretoria, setDiretoria] = useState<TemporadaDiretoriaComJogador[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [originalIds, setOriginalIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busca, setBusca] = useState('')

  useEffect(() => {
    if (!open) setBusca('')
  }, [open])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch(`/api/temporadas/${temporadaId}/diretoria`)
      .then(r => r.json())
      .then((data: TemporadaDiretoriaComJogador[]) => {
        setDiretoria(data)
        const ids = new Set(data.map(d => d.jogador_id))
        setSelected(new Set(ids))
        setOriginalIds(new Set(ids))
      })
      .finally(() => setLoading(false))
  }, [open, temporadaId])

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    const toAdd = [...selected].filter(id => !originalIds.has(id))
    const toRemove = [...originalIds].filter(id => !selected.has(id))

    await Promise.all([
      ...toAdd.map(jogador_id =>
        fetch(`/api/temporadas/${temporadaId}/diretoria`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jogador_id }),
        })
      ),
      ...toRemove.map(jogador_id =>
        fetch(`/api/temporadas/${temporadaId}/diretoria/${jogador_id}`, { method: 'DELETE' })
      ),
    ])

    setSaving(false)
    onClose()
  }

  const ativos = todosJogadores.filter(j => j.ativo)

  const filtrados = ativos
    .filter(j => j.nome.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => {
      const aSelected = selected.has(a.id)
      const bSelected = selected.has(b.id)
      if (aSelected !== bSelected) return aSelected ? -1 : 1
      return a.nome.localeCompare(b.nome, 'pt-BR')
    })

  return (
    <Modal open={open} onClose={onClose} title="Diretoria da Temporada" size="xl">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-500">
          Selecione os jogadores que fazem parte da diretoria desta temporada. Eles serão os votantes padrão na votação de Proposta de Times.
        </p>

        {loading ? (
          <div className="py-8 text-center text-gray-400 text-sm">Carregando...</div>
        ) : ativos.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">Nenhum jogador ativo cadastrado.</div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 font-medium">
                {selected.size} membro{selected.size !== 1 ? 's' : ''} selecionado{selected.size !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
              </svg>
              <input
                type="text"
                placeholder="Pesquisar jogador..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-gray-400 text-gray-700"
              />
            </div>
            <div className="divide-y divide-[#f0f0f0] border border-[#e0e0e0] rounded-lg overflow-hidden max-h-72 overflow-y-auto">
              {filtrados.length === 0 ? (
                <div className="py-6 text-center text-gray-400 text-sm">Nenhum jogador encontrado.</div>
              ) : filtrados.map(j => (
                <label
                  key={j.id}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${selected.has(j.id) ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-50'}`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(j.id)}
                    onChange={() => toggle(j.id)}
                    className="w-4 h-4 accent-green-500 shrink-0"
                  />
                  <span className={`text-sm ${selected.has(j.id) ? 'text-green-800 font-medium' : 'text-gray-800'}`}>{j.nome}</span>
                  <span className="ml-auto text-xs text-gray-400 shrink-0">{j.posicao_principal}</span>
                </label>
              ))}
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-[#e0e0e0] hover:border-gray-400 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-5 py-2 text-sm font-semibold bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
