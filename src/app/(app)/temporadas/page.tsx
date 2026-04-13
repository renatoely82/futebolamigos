'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Temporada } from '@/lib/supabase'
import Modal from '@/components/ui/Modal'
import TemporadaForm, { type TemporadaFormData } from '@/components/temporadas/TemporadaForm'

export default function TemporadasPage() {
  const [temporadas, setTemporadas] = useState<Temporada[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Temporada | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/temporadas')
    if (res.ok) setTemporadas(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave(data: TemporadaFormData) {
    const res = await fetch(`/api/temporadas/${editing!.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Erro ao salvar.')
    setModalOpen(false)
    setEditing(null)
    load()
  }

  async function handleDelete(t: Temporada) {
    if (!confirm(`Excluir a temporada "${t.nome}"?`)) return
    const res = await fetch(`/api/temporadas/${t.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json()
      alert(json.error)
      return
    }
    load()
  }

  function fmt(date: string) {
    return format(parseISO(date), "dd/MM/yyyy", { locale: ptBR })
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-gray-800 text-2xl font-bold">Temporadas</h1>
          <p className="text-gray-500 text-sm mt-0.5">{temporadas.length} temporada(s) cadastrada(s)</p>
        </div>
        <Link
          href="/temporadas/nova"
          className="bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeWidth={2.5} strokeLinecap="round" d="M12 5v14M5 12h14" />
          </svg>
          Nova Temporada
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Carregando...</div>
      ) : temporadas.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500">Nenhuma temporada cadastrada.</p>
          <Link href="/temporadas/nova" className="mt-4 inline-block text-green-600 hover:text-green-700 text-sm">
            Criar primeira temporada
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {temporadas.map(t => (
            <div
              key={t.id}
              className="bg-white border border-[#e2e8f0] rounded-xl p-4 flex items-center justify-between gap-4 hover:border-[#c1c4c9] transition-colors"
            >
              <Link href={`/temporadas/${t.id}`} className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-gray-800 font-semibold">{t.nome}</span>
                  {t.ativa && (
                    <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                      Ativa
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-sm mt-0.5">
                  {fmt(t.data_inicio)} — {fmt(t.data_fim)}
                </p>
              </Link>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => { setEditing(t); setModalOpen(true) }}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Editar"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(t)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Excluir"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal
          open={modalOpen}
          onClose={() => { setModalOpen(false); setEditing(null) }}
          title="Editar Temporada"
        >
          <TemporadaForm
            initial={editing}
            onSave={handleSave}
            onCancel={() => { setModalOpen(false); setEditing(null) }}
          />
        </Modal>
      )}
    </div>
  )
}
