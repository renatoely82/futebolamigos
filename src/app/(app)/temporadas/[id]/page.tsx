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
  const [savingMensalista, setSavingMensalista] = useState(false)
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
      body: JSON.stringify({ jogador_id: selectedJogadorId }),
    })
    setSavingMensalista(false)
    setAddMensalistaOpen(false)
    setSelectedJogadorId('')
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
    agendada: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    realizada: 'text-lime-400 bg-lime-500/10 border-lime-500/20',
    cancelada: 'text-gray-500 bg-gray-500/10 border-gray-500/20',
  }

  if (loading) {
    return <div className="p-6 text-center text-gray-500 py-20">Carregando...</div>
  }

  if (!temporada) {
    return (
      <div className="p-6 text-center py-20">
        <p className="text-gray-500">Temporada não encontrada.</p>
        <Link href="/temporadas" className="mt-4 inline-block text-lime-400 hover:text-lime-300 text-sm">
          Voltar às temporadas
        </Link>
      </div>
    )
  }

  const mensalistasOrdenados = [...mensalistas].sort((a, b) =>
    a.jogador.nome.localeCompare(b.jogador.nome, 'pt-BR')
  )

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/temporadas" className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m7-7-7 7 7 7" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-white text-2xl font-bold">{temporada.nome}</h1>
              {temporada.ativa && (
                <span className="text-xs bg-lime-500/20 text-lime-400 border border-lime-500/30 px-2 py-0.5 rounded-full font-medium">
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
          className="bg-[#222] hover:bg-[#333] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shrink-0"
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
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2a2a2a] flex items-center gap-2">
              <svg className="w-5 h-5 text-lime-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h2 className="text-white font-semibold">Tabela de Classificação</h2>
            </div>
            <div className="p-2">
              <ClassificacaoTable entries={classificacao} />
            </div>
          </div>

          {/* Mensalistas */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2a2a2a] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-lime-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5.916-3.52M9 20H4v-2a4 4 0 015.916-3.52M15 7a4 4 0 11-8 0 4 4 0 018 0zm6 3a3 3 0 11-6 0 3 3 0 016 0zm-18 0a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h2 className="text-white font-semibold">Mensalistas</h2>
                <span className="text-gray-500 text-sm">({mensalistas.length})</span>
              </div>
              <button
                onClick={() => { setSelectedJogadorId(''); setAddMensalistaOpen(true) }}
                className="bg-lime-500 hover:bg-lime-400 text-black text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
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
              <div className="divide-y divide-[#1e1e1e]">
                {mensalistasOrdenados.map(m => (
                  <div key={m.id} className="flex items-center justify-between px-5 py-3">
                    <span className="text-white text-sm">{m.jogador.nome}</span>
                    <button
                      onClick={() => handleRemoveMensalista(m.jogador_id)}
                      className="text-gray-500 hover:text-red-400 transition-colors p-1 rounded"
                      title="Remover"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeWidth={2} strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Artilheiros + Matches */}
        <div className="space-y-6">
          {/* Top Scorers */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2a2a2a] flex items-center gap-2">
              <svg className="w-5 h-5 text-lime-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <h2 className="text-white font-semibold">Artilheiros</h2>
            </div>
            <div className="p-2">
              <ArtilheirosTable entries={classificacao} />
            </div>
          </div>

          {/* Matches */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2a2a2a] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
                  <path strokeWidth={1.5} d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                <h2 className="text-white font-semibold">Partidas da Temporada</h2>
              </div>
              <span className="text-gray-500 text-sm">{partidas.length} partida(s)</span>
            </div>
            {partidas.length === 0 ? (
              <div className="py-10 text-center text-gray-500 text-sm">
                Nenhuma partida nesta temporada.
              </div>
            ) : (
              <div className="divide-y divide-[#1e1e1e]">
                {partidas.map(p => (
                  <Link
                    key={p.id}
                    href={`/partidas/${p.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors"
                  >
                    <div>
                      <p className="text-white text-sm font-medium">{fmtPartidaDate(p.data)}</p>
                      {p.local && <p className="text-gray-500 text-xs mt-0.5">{p.local}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      {p.placar_time_a !== null && p.placar_time_b !== null && (
                        <span className="text-white font-bold text-sm">
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
        onClose={() => setAddMensalistaOpen(false)}
        title="Adicionar Mensalista"
      >
        <div className="space-y-4">
          {(() => {
            const mensalistaIds = new Set(mensalistas.map(m => m.jogador_id))
            const disponiveis = todosJogadores.filter(j => !mensalistaIds.has(j.id))
            if (disponiveis.length === 0) {
              return <p className="text-gray-400 text-sm">Todos os jogadores ativos já são mensalistas desta temporada.</p>
            }
            return (
              <>
                <select
                  value={selectedJogadorId}
                  onChange={e => setSelectedJogadorId(e.target.value)}
                  className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-lime-500"
                >
                  <option value="">Selecione um jogador...</option>
                  {disponiveis.map(j => (
                    <option key={j.id} value={j.id}>{j.nome}</option>
                  ))}
                </select>
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={handleAddMensalista}
                    disabled={!selectedJogadorId || savingMensalista}
                    className="flex-1 bg-lime-500 hover:bg-lime-400 disabled:opacity-50 text-black font-semibold py-2.5 rounded-lg transition-colors"
                  >
                    {savingMensalista ? 'Salvando...' : 'Adicionar'}
                  </button>
                  <button
                    onClick={() => setAddMensalistaOpen(false)}
                    className="flex-1 bg-[#222] hover:bg-[#333] text-white font-semibold py-2.5 rounded-lg transition-colors"
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
