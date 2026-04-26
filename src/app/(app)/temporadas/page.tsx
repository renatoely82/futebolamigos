'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Temporada } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import Modal from '@/components/ui/Modal'
import TemporadaForm, { type TemporadaFormData } from '@/components/temporadas/TemporadaForm'
import { SkeletonLine } from '@/components/ui/Skeleton'

export default function TemporadasPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [temporadas, setTemporadas] = useState<Temporada[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Temporada | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [copying, setCopying] = useState<Temporada | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Temporada | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [copyLoading, setCopyLoading] = useState(false)
  const [copyDatas, setCopyDatas] = useState({ data_inicio: '', data_fim: '' })

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
    toast('Temporada atualizada.')
    load()
  }

  async function handleDelete() {
    if (!confirmDelete) return
    setDeleting(true)
    const res = await fetch(`/api/temporadas/${confirmDelete.id}`, { method: 'DELETE' })
    setDeleting(false)
    setConfirmDelete(null)
    if (!res.ok) {
      const json = await res.json()
      toast(json.error || 'Erro ao excluir temporada.', 'error')
      return
    }
    toast('Temporada excluída.')
    load()
  }

  function addOneYear(date: string) {
    const d = new Date(date)
    d.setFullYear(d.getFullYear() + 1)
    return d.toISOString().slice(0, 10)
  }

  function openCopyModal(t: Temporada) {
    setCopyDatas({
      data_inicio: addOneYear(t.data_inicio),
      data_fim: addOneYear(t.data_fim),
    })
    setCopying(t)
  }

  async function handleCopyConfirm() {
    if (!copying) return
    if (copyDatas.data_fim < copyDatas.data_inicio) {
      toast('A data de fim deve ser posterior à data de início.', 'error')
      return
    }
    setCopyLoading(true)
    try {
      const res = await fetch('/api/temporadas/copiar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origem_temporada_id: copying.id,
          data_inicio: copyDatas.data_inicio,
          data_fim: copyDatas.data_fim,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast(json.error || 'Erro ao copiar temporada.', 'error')
        return
      }
      setCopying(null)
      router.push(`/temporadas/${json.id}`)
    } finally {
      setCopyLoading(false)
    }
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
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white border border-[#e0e0e0] rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <SkeletonLine className="h-5 w-40" />
                  {i === 0 && <SkeletonLine className="h-5 w-12 rounded-full" />}
                </div>
                <SkeletonLine className="h-4 w-48" />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <SkeletonLine className="w-8 h-8 rounded-lg" />
                <SkeletonLine className="w-8 h-8 rounded-lg" />
                <SkeletonLine className="w-8 h-8 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
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
              className="bg-white border border-[#e0e0e0] rounded-xl p-4 flex items-center justify-between gap-4 hover:border-[#c8c8c8] transition-colors"
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
                  onClick={() => openCopyModal(t)}
                  className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Copiar temporada"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
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
                  onClick={() => setConfirmDelete(t)}
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

      <Modal
        open={!!confirmDelete}
        onClose={() => { if (!deleting) setConfirmDelete(null) }}
        title="Excluir Temporada"
      >
        <p className="text-gray-600 text-sm mb-6">
          Tem certeza que deseja excluir a temporada{' '}
          <strong className="text-gray-800">{confirmDelete?.nome}</strong>?
          {' '}Todas as partidas, regras e dados vinculados serão removidos permanentemente.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {deleting ? 'Excluindo...' : 'Excluir'}
          </button>
          <button
            onClick={() => setConfirmDelete(null)}
            disabled={deleting}
            className="flex-1 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 font-semibold py-2.5 rounded-lg transition-colors"
          >
            Cancelar
          </button>
        </div>
      </Modal>

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

      {copying && (
        <Modal
          open={!!copying}
          onClose={() => setCopying(null)}
          title="Copiar Temporada"
        >
          <div className="space-y-4">
            <p className="text-gray-700 text-sm">
              Copiando <span className="font-semibold">{copying.nome}</span>. Informe as datas da nova temporada:
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Data de Início *</label>
                <input
                  type="date"
                  required
                  value={copyDatas.data_inicio}
                  onChange={e => setCopyDatas(d => ({ ...d, data_inicio: e.target.value }))}
                  className="w-full bg-white border border-[#e0e0e0] rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Data de Fim *</label>
                <input
                  type="date"
                  required
                  value={copyDatas.data_fim}
                  onChange={e => setCopyDatas(d => ({ ...d, data_fim: e.target.value }))}
                  className="w-full bg-white border border-[#e0e0e0] rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:border-green-500"
                />
              </div>
            </div>
            <ul className="text-xs text-gray-400 space-y-0.5 list-disc list-inside">
              <li>Regras serão copiadas da temporada origem</li>
              <li>Mensalistas ativos no último mês serão copiados com meses ajustados ao novo período</li>
              <li>A nova temporada será criada como inativa</li>
            </ul>
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleCopyConfirm}
                disabled={copyLoading || !copyDatas.data_inicio || !copyDatas.data_fim}
                className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
              >
                {copyLoading ? 'Copiando...' : 'Copiar'}
              </button>
              <button
                onClick={() => setCopying(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
