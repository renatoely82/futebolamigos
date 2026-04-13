'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Temporada, ClassificacaoEntry, Partida, Jogador } from '@/lib/supabase'
import Modal from '@/components/ui/Modal'
import TemporadaForm, { type TemporadaFormData } from '@/components/temporadas/TemporadaForm'
import ClassificacaoTable from '@/components/temporadas/ClassificacaoTable'
import ArtilheirosTable from '@/components/temporadas/ArtilheirosTable'

interface MensalistaEntry {
  id: string
  jogador_id: string
  jogador: Jogador
  meses: number[] | null
}

const MESES_NOMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function getMesesTemporada(dataInicio: string, dataFim: string): number[] {
  const inicio = new Date(dataInicio + 'T00:00:00')
  const fim = new Date(dataFim + 'T00:00:00')
  const meses: number[] = []
  const cur = new Date(inicio.getFullYear(), inicio.getMonth(), 1)
  while (cur <= fim) {
    meses.push(cur.getMonth() + 1)
    cur.setMonth(cur.getMonth() + 1)
  }
  return meses
}

export default function TemporadaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [temporada, setTemporada] = useState<Temporada | null>(null)
  const [classificacao, setClassificacao] = useState<ClassificacaoEntry[]>([])
  const [partidas, setPartidas] = useState<Partida[]>([])
  const [mensalistas, setMensalistas] = useState<MensalistaEntry[]>([])
  const [todosJogadores, setTodosJogadores] = useState<Jogador[]>([])
  const [addMensalistaOpen, setAddMensalistaOpen] = useState(false)
  const [selectedJogadorId, setSelectedJogadorId] = useState('')
  const [selectedMeses, setSelectedMeses] = useState<number[] | null>(null) // null = todos
  const [savingMensalista, setSavingMensalista] = useState(false)
  const [updatingMeses, setUpdatingMeses] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  const load = useCallback(async () => {
    const [tRes, cRes, pRes, mRes, jRes] = await Promise.all([
      fetch(`/api/temporadas/${id}`),
      fetch(`/api/temporadas/${id}/classificacao`),
      fetch(`/api/partidas?temporada_id=${id}`),
      fetch(`/api/temporadas/${id}/mensalistas`),
      fetch(`/api/jogadores`),
    ])
    if (tRes.ok) setTemporada(await tRes.json())
    if (cRes.ok) setClassificacao(await cRes.json())
    if (pRes.ok) setPartidas(await pRes.json())
    if (mRes.ok) setMensalistas(await mRes.json())
    if (jRes.ok) setTodosJogadores(await jRes.json())
    setLoading(false)
  }, [id])

  async function handleAddMensalista() {
    if (!selectedJogadorId) return
    setSavingMensalista(true)
    await fetch(`/api/temporadas/${id}/mensalistas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jogador_id: selectedJogadorId, meses: selectedMeses }),
    })
    setSavingMensalista(false)
    setAddMensalistaOpen(false)
    setSelectedJogadorId('')
    setSelectedMeses(null)
    load()
  }

  async function handleToggleMes(jogadorId: string, mes: number, mesesAtuais: number[] | null, todosOsMeses: number[]) {
    setUpdatingMeses(jogadorId)
    const base = mesesAtuais ?? todosOsMeses
    const novosMeses = base.includes(mes)
      ? base.filter(m => m !== mes)
      : [...base, mes].sort((a, b) => a - b)
    const payload = novosMeses.length === todosOsMeses.length ? null : novosMeses
    await fetch(`/api/temporadas/${id}/mensalistas`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jogador_id: jogadorId, meses: payload }),
    })
    setUpdatingMeses(null)
    load()
  }

  async function handleRemoveMensalista(jogadorId: string) {
    await fetch(`/api/temporadas/${id}/mensalistas`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jogador_id: jogadorId }),
    })
    load()
  }

  useEffect(() => { load() }, [load])

  async function handleSave(data: TemporadaFormData) {
    const res = await fetch(`/api/temporadas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Erro ao salvar.')
    setModalOpen(false)
    load()
  }

  function fmtDate(date: string) {
    return format(parseISO(date), "dd/MM/yyyy", { locale: ptBR })
  }

  function fmtPartidaDate(date: string) {
    return format(parseISO(date), "dd/MM/yyyy", { locale: ptBR })
  }

  const STATUS_LABEL: Record<string, string> = {
    agendada: 'Agendada',
    realizada: 'Realizada',
    cancelada: 'Cancelada',
  }
  const STATUS_COLOR: Record<string, string> = {
    agendada: 'text-blue-600 bg-blue-100 border-blue-200',
    realizada: 'text-green-700 bg-green-100 border-green-200',
    cancelada: 'text-gray-500 bg-gray-100 border-gray-200',
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

  const mensalistasOrdenados = [...mensalistas]
    .filter(m => m.jogador != null)
    .sort((a, b) => a.jogador.nome.localeCompare(b.jogador.nome, 'pt-BR'))

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/temporadas" className="text-gray-400 hover:text-gray-700 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m7-7-7 7 7 7" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-gray-800 text-2xl font-bold">{temporada.nome}</h1>
              {temporada.ativa && (
                <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                  Ativa
                </span>
              )}
            </div>
            <p className="text-gray-500 text-sm mt-0.5">
              {fmtDate(temporada.data_inicio)} — {fmtDate(temporada.data_fim)}
            </p>
          </div>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-white hover:bg-gray-100 text-gray-700 border border-[#e2e8f0] px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Editar
        </button>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Column 1: Classification + Mensalistas */}
        <div className="space-y-6">
          {/* Classification */}
          <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e9ecf1] flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h2 className="text-gray-800 font-semibold">Tabela de Classificação</h2>
            </div>
            <div className="p-2">
              <ClassificacaoTable entries={classificacao} />
            </div>
          </div>

          {/* Mensalistas */}
          {(() => {
            const mesesTemporada = getMesesTemporada(temporada.data_inicio, temporada.data_fim)
            return (
              <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[#e9ecf1] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5.916-3.52M9 20H4v-2a4 4 0 015.916-3.52M15 7a4 4 0 11-8 0 4 4 0 018 0zm6 3a3 3 0 11-6 0 3 3 0 016 0zm-18 0a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <h2 className="text-gray-800 font-semibold">Mensalistas</h2>
                    <span className="text-gray-500 text-sm">({mensalistas.length})</span>
                  </div>
                  <button
                    onClick={() => { setSelectedJogadorId(''); setSelectedMeses(null); setAddMensalistaOpen(true) }}
                    className="bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeWidth={2} strokeLinecap="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Adicionar
                  </button>
                </div>

                {mensalistasOrdenados.length === 0 ? (
                  <div className="py-10 text-center text-gray-500 text-sm">
                    Nenhum mensalista nesta temporada.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {mensalistasOrdenados.map(m => {
                      const mesesAtivos = m.meses ?? mesesTemporada
                      const isUpdating = updatingMeses === m.jogador_id
                      return (
                        <div key={m.id} className="px-4 py-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-800 text-sm font-medium">{m.jogador.nome}</span>
                            <button
                              onClick={() => handleRemoveMensalista(m.jogador_id)}
                              className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded"
                              title="Remover"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeWidth={2} strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          <div className={`flex flex-wrap gap-1 ${isUpdating ? 'opacity-50 pointer-events-none' : ''}`}>
                            {mesesTemporada.map(mes => {
                              const ativo = mesesAtivos.includes(mes)
                              return (
                                <button
                                  key={mes}
                                  onClick={() => handleToggleMes(m.jogador_id, mes, m.meses, mesesTemporada)}
                                  className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-colors ${
                                    ativo
                                      ? 'bg-green-100 text-green-700 border-green-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                                      : 'bg-transparent text-gray-500 border-gray-200 hover:bg-green-50 hover:text-green-600 hover:border-green-200'
                                  }`}
                                >
                                  {MESES_NOMES[mes - 1]}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })()}
        </div>

        {/* Column 2: Artilheiros + Matches */}
        <div className="space-y-6">
          {/* Top Scorers */}
          <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e9ecf1] flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <h2 className="text-gray-800 font-semibold">Artilheiros</h2>
            </div>
            <div className="p-2">
              <ArtilheirosTable entries={classificacao} />
            </div>
          </div>

          {/* Matches */}
          <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e9ecf1] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
                  <path strokeWidth={1.5} d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                <h2 className="text-gray-800 font-semibold">Partidas da Temporada</h2>
              </div>
              <span className="text-gray-500 text-sm">{partidas.length} partida(s)</span>
            </div>
            {partidas.length === 0 ? (
              <div className="py-10 text-center text-gray-500 text-sm">
                Nenhuma partida nesta temporada.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {partidas.map(p => (
                  <Link
                    key={p.id}
                    href={`/partidas/${p.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="text-gray-800 text-sm font-medium">{fmtPartidaDate(p.data)}</p>
                      {p.local && <p className="text-gray-500 text-xs mt-0.5">{p.local}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      {p.placar_time_a !== null && p.placar_time_b !== null && (
                        <span className="text-gray-800 font-bold text-sm">
                          {p.nome_time_a} {p.placar_time_a} × {p.placar_time_b} {p.nome_time_b}
                        </span>
                      )}
                      <span className={`text-xs border px-2 py-0.5 rounded-full ${STATUS_COLOR[p.status]}`}>
                        {STATUS_LABEL[p.status]}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Adicionar Mensalista */}
      <Modal
        open={addMensalistaOpen}
        onClose={() => { setAddMensalistaOpen(false); setSelectedMeses(null) }}
        title="Adicionar Mensalista"
      >
        <div className="space-y-4">
          {(() => {
            const mensalistaIds = new Set(mensalistas.map(m => m.jogador_id))
            const disponiveis = todosJogadores.filter(j => !mensalistaIds.has(j.id))
            if (disponiveis.length === 0) {
              return <p className="text-gray-500 text-sm">Todos os jogadores ativos já são mensalistas desta temporada.</p>
            }
            const mesesTemporada = getMesesTemporada(temporada.data_inicio, temporada.data_fim)
            const mesesSelecionados = selectedMeses ?? mesesTemporada
            return (
              <>
                <select
                  value={selectedJogadorId}
                  onChange={e => setSelectedJogadorId(e.target.value)}
                  className="w-full bg-white border border-[#d1d9e0] rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:border-green-500"
                >
                  <option value="">Selecione um jogador...</option>
                  {disponiveis.map(j => (
                    <option key={j.id} value={j.id}>{j.nome}</option>
                  ))}
                </select>

                <div>
                  <p className="text-xs text-gray-500 mb-2">Meses ativos na temporada</p>
                  <div className="flex flex-wrap gap-1.5">
                    {mesesTemporada.map(mes => {
                      const ativo = mesesSelecionados.includes(mes)
                      return (
                        <button
                          key={mes}
                          type="button"
                          onClick={() => {
                            const base = mesesSelecionados
                            const novo = ativo ? base.filter(m => m !== mes) : [...base, mes].sort((a, b) => a - b)
                            setSelectedMeses(novo.length === mesesTemporada.length ? null : novo)
                          }}
                          className={`text-sm px-2.5 py-1 rounded-full border font-medium transition-colors ${
                            ativo
                              ? 'bg-green-100 text-green-700 border-green-200'
                              : 'bg-transparent text-gray-500 border-gray-200'
                          }`}
                        >
                          {MESES_NOMES[mes - 1]}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={handleAddMensalista}
                    disabled={!selectedJogadorId || savingMensalista}
                    className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
                  >
                    {savingMensalista ? 'Salvando...' : 'Adicionar'}
                  </button>
                  <button
                    onClick={() => { setAddMensalistaOpen(false); setSelectedMeses(null) }}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )
          })()}
        </div>
      </Modal>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Editar Temporada"
      >
        <TemporadaForm
          initial={temporada}
          onSave={handleSave}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </div>
  )
}
