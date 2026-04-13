'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Jogador } from '@/lib/supabase'
import JogadorCard from '@/components/jogadores/JogadorCard'
import JogadorForm, { type JogadorFormData } from '@/components/jogadores/JogadorForm'
import Modal from '@/components/ui/Modal'
import { format, addDays, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function JogadoresPage() {
  const [jogadores, setJogadores] = useState<Jogador[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Jogador | null>(null)
  const [busca, setBusca] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/jogadores')
    if (res.ok) setJogadores(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const jogadoresFiltrados = jogadores.filter(j =>
    j.nome.toLowerCase().includes(busca.toLowerCase())
  )

  // Birthday alert: players with birthday in next 7 days
  const today = new Date()
  const inSevenDays = addDays(today, 7)
  const aniversariantes = jogadores.filter(j => {
    if (!j.aniversario) return false
    const bday = parseISO(j.aniversario)
    const thisYear = new Date(today.getFullYear(), bday.getMonth(), bday.getDate())
    return thisYear >= today && thisYear <= inSevenDays
  })

  async function handleSave(data: JogadorFormData) {
    if (editing) {
      const res = await fetch(`/api/jogadores/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
    } else {
      const res = await fetch('/api/jogadores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
    }
    setModalOpen(false)
    setEditing(null)
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover jogador?')) return
    await fetch(`/api/jogadores/${id}`, { method: 'DELETE' })
    load()
  }

  function handleEdit(j: Jogador) {
    setEditing(j)
    setModalOpen(true)
  }

  function handleNewClick() {
    setEditing(null)
    setModalOpen(true)
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-gray-800 text-2xl font-bold">Jogadores</h1>
          <p className="text-gray-500 text-sm mt-0.5">{jogadores.length} jogadores cadastrados</p>
        </div>
        <button
          onClick={handleNewClick}
          className="bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeWidth={2.5} strokeLinecap="round" d="M12 5v14M5 12h14" />
          </svg>
          Novo Jogador
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Pesquisar jogador..."
          className="w-full bg-white border border-gray-200 text-gray-800 placeholder-gray-400 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors"
        />
        {busca && (
          <button
            onClick={() => setBusca('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Birthday alert */}
      {aniversariantes.length > 0 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-2xl">🎂</span>
          <div>
            <p className="text-yellow-700 font-semibold text-sm">Aniversariantes esta semana</p>
            <p className="text-yellow-600 text-sm mt-0.5">
              {aniversariantes.map(j => {
                const bday = parseISO(j.aniversario!)
                const thisYear = new Date(today.getFullYear(), bday.getMonth(), bday.getDate())
                return `${j.nome} (${format(thisYear, "d 'de' MMM", { locale: ptBR })})`
              }).join(' • ')}
            </p>
          </div>
        </div>
      )}

      {/* Player list */}
      {loading ? (
        <div className="text-center py-20 text-gray-500">Carregando...</div>
      ) : jogadores.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500">Nenhum jogador cadastrado.</p>
          <button onClick={handleNewClick} className="mt-4 text-green-600 hover:text-green-700 text-sm">
            Adicionar primeiro jogador
          </button>
        </div>
      ) : jogadoresFiltrados.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500">Nenhum jogador encontrado para "{busca}".</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {jogadoresFiltrados.map(j => (
            <JogadorCard
              key={j.id}
              jogador={j}
              onEdit={() => handleEdit(j)}
              onDelete={() => handleDelete(j.id)}
            />
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        title={editing ? 'Editar Jogador' : 'Novo Jogador'}
      >
        <JogadorForm
          initial={editing ?? undefined}
          onSave={handleSave}
          onCancel={() => { setModalOpen(false); setEditing(null) }}
        />
      </Modal>
    </div>
  )
}
