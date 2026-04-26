'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import { useToast } from '@/components/ui/Toast'
import type { Regra, CategoriaRegra, Temporada } from '@/lib/supabase'
import Modal from '@/components/ui/Modal'

const CATEGORIAS: { value: CategoriaRegra; label: string }[] = [
  { value: 'pagamento', label: 'Pagamento' },
  { value: 'desistencias', label: 'Desistências' },
  { value: 'penalizacoes', label: 'Penalizações' },
  { value: 'geral', label: 'Geral' },
]

const CATEGORIA_CORES: Record<CategoriaRegra, string> = {
  pagamento: 'text-green-700 bg-green-50 border-green-200',
  desistencias: 'text-orange-700 bg-orange-50 border-orange-200',
  penalizacoes: 'text-red-700 bg-red-50 border-red-200',
  geral: 'text-blue-700 bg-blue-50 border-blue-200',
}

export default function RegrasPage() {
  const { id } = useParams<{ id: string }>()
  const { toast } = useToast()
  const [temporada, setTemporada] = useState<Temporada | null>(null)
  const [regras, setRegras] = useState<Regra[]>([])
  const [todasTemporadas, setTodasTemporadas] = useState<Temporada[]>([])
  const [loading, setLoading] = useState(true)

  // Modal nova regra / editar
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Regra | null>(null)
  const [formCategoria, setFormCategoria] = useState<CategoriaRegra>('geral')
  const [formDescricao, setFormDescricao] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Copiar de outra temporada
  const [copiarOpen, setCopiarOpen] = useState(false)
  const [origemId, setOrigemId] = useState('')
  const [copiando, setCopiando] = useState(false)
  const [copiarError, setCopiarError] = useState('')

  // Excluir confirmação inline
  const [confirmandoExcluir, setConfirmandoExcluir] = useState<string | null>(null)

  // Toggle ativa (otimista)
  const [toggling, setToggling] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [tRes, rRes, tsRes] = await Promise.all([
      fetch(`/api/temporadas/${id}`),
      fetch(`/api/temporadas/${id}/regras`),
      fetch(`/api/temporadas`),
    ])
    if (tRes.ok) setTemporada(await tRes.json())
    if (rRes.ok) setRegras(await rRes.json())
    if (tsRes.ok) {
      const todas: Temporada[] = await tsRes.json()
      setTodasTemporadas(todas.filter(t => t.id !== id))
    }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  function abrirNovaRegra() {
    setEditando(null)
    setFormCategoria('geral')
    setFormDescricao('')
    setFormError('')
    setModalOpen(true)
  }

  function abrirEditarRegra(regra: Regra) {
    setEditando(regra)
    setFormCategoria(regra.categoria)
    setFormDescricao(regra.descricao)
    setFormError('')
    setModalOpen(true)
  }

  async function handleSalvar() {
    if (!formDescricao.trim()) {
      setFormError('A descrição é obrigatória.')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      if (editando) {
        const res = await fetch(`/api/temporadas/${id}/regras/${editando.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ descricao: formDescricao, categoria: formCategoria }),
        })
        if (!res.ok) {
          const j = await res.json()
          setFormError(j.error || 'Erro ao salvar.')
          return
        }
      } else {
        const res = await fetch(`/api/temporadas/${id}/regras`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categoria: formCategoria, descricao: formDescricao }),
        })
        if (!res.ok) {
          const j = await res.json()
          setFormError(j.error || 'Erro ao criar regra.')
          return
        }
      }
      setModalOpen(false)
      toast(editando ? 'Regra atualizada.' : 'Regra criada.')
      load()
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleAtiva(regra: Regra) {
    setToggling(regra.id)
    // Optimistic update
    setRegras(prev => prev.map(r => r.id === regra.id ? { ...r, ativa: !r.ativa } : r))
    const res = await fetch(`/api/temporadas/${id}/regras/${regra.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativa: !regra.ativa }),
    })
    if (!res.ok) {
      // Revert
      setRegras(prev => prev.map(r => r.id === regra.id ? { ...r, ativa: regra.ativa } : r))
    }
    setToggling(null)
  }

  async function handleExcluir(regraId: string) {
    await fetch(`/api/temporadas/${id}/regras/${regraId}`, { method: 'DELETE' })
    setConfirmandoExcluir(null)
    load()
  }

  async function handleCopiar() {
    if (!origemId) return
    setCopiando(true)
    setCopiarError('')
    const res = await fetch(`/api/temporadas/${id}/regras/copiar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origem_temporada_id: origemId }),
    })
    if (!res.ok) {
      const j = await res.json()
      setCopiarError(j.error || 'Erro ao copiar regras.')
      setCopiando(false)
      return
    }
    setCopiando(false)
    setCopiarOpen(false)
    setOrigemId('')
    load()
  }

  if (loading) {
    return <div className="p-6 text-center text-gray-500 py-20">Carregando...</div>
  }

  if (!temporada) {
    return (
      <div className="p-6 text-center py-20">
        <p className="text-gray-500">Temporada não encontrada.</p>
        <Link href="/temporadas" className="mt-4 inline-block text-green-600 hover:text-green-700 text-sm">
          Voltar às temporadas
        </Link>
      </div>
    )
  }

  // Group rules by category
  const regrasPorCategoria = CATEGORIAS.map(cat => ({
    ...cat,
    regras: regras.filter(r => r.categoria === cat.value),
  }))

  const totalRegras = regras.length
  const totalAtivas = regras.filter(r => r.ativa).length

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Breadcrumbs items={[
            { label: 'Temporadas', href: '/temporadas' },
            { label: temporada.nome, href: `/temporadas/${id}` },
            { label: 'Regras' },
          ]} />
          <h1 className="text-gray-800 text-2xl font-bold mt-1">Regras</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {temporada.nome}
            {totalRegras > 0 && (
              <span className="ml-2 text-xs">· {totalAtivas}/{totalRegras} ativas</span>
            )}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {todasTemporadas.length > 0 && (
            <button
              onClick={() => { setOrigemId(''); setCopiarError(''); setCopiarOpen(true) }}
              className="bg-white hover:bg-gray-100 text-gray-700 border border-[#e0e0e0] px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="hidden sm:inline">Copiar de outra temporada</span>
              <span className="sm:hidden">Copiar</span>
            </button>
          )}
          <button
            onClick={abrirNovaRegra}
            className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeWidth={2} strokeLinecap="round" d="M12 4v16m8-8H4" />
            </svg>
            Nova Regra
          </button>
        </div>
      </div>

      {/* Empty state */}
      {totalRegras === 0 && (
        <div className="bg-white border border-[#e0e0e0] rounded-xl py-16 text-center">
          <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-gray-500 text-sm">Nenhuma regra cadastrada para esta temporada.</p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={abrirNovaRegra}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              Adicionar primeira regra
            </button>
            {todasTemporadas.length > 0 && (
              <button
                onClick={() => { setOrigemId(''); setCopiarError(''); setCopiarOpen(true) }}
                className="text-gray-600 hover:text-gray-800 text-sm underline"
              >
                ou copiar de outra temporada
              </button>
            )}
          </div>
        </div>
      )}

      {/* Categories */}
      {totalRegras > 0 && (
        <div className="space-y-4">
          {regrasPorCategoria.map(cat => (
            cat.regras.length === 0 ? null : (
              <div key={cat.value} className="bg-white border border-[#e0e0e0] rounded-xl overflow-hidden">
                {/* Category header */}
                <div className={`px-5 py-3 border-b border-[#e0e0e0] flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full border ${CATEGORIA_CORES[cat.value]}`}>
                      {cat.label}
                    </span>
                    <span className="text-gray-400 text-sm">{cat.regras.length} regra{cat.regras.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                {/* Rules list */}
                <div className="divide-y divide-gray-100">
                  {cat.regras.map((regra) => (
                    <div key={regra.id} className={`px-5 py-3.5 flex items-start gap-3 transition-colors ${!regra.ativa ? 'bg-gray-50' : ''}`}>
                      {/* Number */}
                      <span className={`text-sm font-bold w-5 shrink-0 mt-0.5 ${regra.ativa ? 'text-gray-400' : 'text-gray-300'}`}>
                        {regra.numero}.
                      </span>

                      {/* Description */}
                      <p className={`flex-1 text-sm leading-relaxed ${regra.ativa ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                        {regra.descricao}
                      </p>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        {/* Toggle ativa */}
                        <button
                          onClick={() => handleToggleAtiva(regra)}
                          disabled={toggling === regra.id}
                          title={regra.ativa ? 'Desativar regra' : 'Ativar regra'}
                          className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                            regra.ativa
                              ? 'text-green-600 hover:bg-red-50 hover:text-red-500'
                              : 'text-gray-300 hover:bg-green-50 hover:text-green-600'
                          }`}
                        >
                          {regra.ativa ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => abrirEditarRegra(regra)}
                          title="Editar regra"
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>

                        {/* Delete */}
                        {confirmandoExcluir === regra.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleExcluir(regra.id)}
                              className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1 bg-red-50 rounded-lg border border-red-200 transition-colors"
                            >
                              Excluir
                            </button>
                            <button
                              onClick={() => setConfirmandoExcluir(null)}
                              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 bg-gray-100 rounded-lg transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmandoExcluir(regra.id)}
                            title="Excluir regra"
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {/* Modal Nova / Editar Regra */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editando ? 'Editar Regra' : 'Nova Regra'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoria</label>
            <select
              value={formCategoria}
              onChange={e => setFormCategoria(e.target.value as CategoriaRegra)}
              className="w-full bg-white border border-[#e0e0e0] rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:border-green-500"
            >
              {CATEGORIAS.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Descrição</label>
            <textarea
              value={formDescricao}
              onChange={e => setFormDescricao(e.target.value)}
              placeholder="Descreva a regra..."
              rows={3}
              className="w-full bg-white border border-[#e0e0e0] rounded-lg px-3 py-2 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 resize-none"
            />
          </div>
          {formError && (
            <p className="text-red-500 text-sm">{formError}</p>
          )}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleSalvar}
              disabled={saving}
              className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              onClick={() => setModalOpen(false)}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Copiar de Outra Temporada */}
      <Modal
        open={copiarOpen}
        onClose={() => setCopiarOpen(false)}
        title="Copiar Regras de Outra Temporada"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            As regras da temporada selecionada serão copiadas para <strong className="text-gray-700">{temporada.nome}</strong>.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Temporada de origem</label>
            <select
              value={origemId}
              onChange={e => setOrigemId(e.target.value)}
              className="w-full bg-white border border-[#e0e0e0] rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:border-green-500"
            >
              <option value="">Selecione uma temporada...</option>
              {todasTemporadas.map(t => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </div>
          {copiarError && (
            <p className="text-red-500 text-sm">{copiarError}</p>
          )}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleCopiar}
              disabled={!origemId || copiando}
              className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
            >
              {copiando ? 'Copiando...' : 'Copiar Regras'}
            </button>
            <button
              onClick={() => setCopiarOpen(false)}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
