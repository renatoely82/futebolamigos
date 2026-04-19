'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Temporada, ClassificacaoEntry, Partida, Jogador } from '@/lib/supabase'
import Modal from '@/components/ui/Modal'
import TemporadaForm, { type TemporadaFormData } from '@/components/temporadas/TemporadaForm'
import ClassificacaoTable from '@/components/temporadas/ClassificacaoTable'
import ArtilheirosTable from '@/components/temporadas/ArtilheirosTable'
import JogadorDetalheModal from '@/components/temporadas/JogadorDetalheModal'
import PartidasList from '@/components/temporadas/PartidasList'
import DiretoraModal from '@/components/temporadas/DiretoraModal'

interface MensalistaEntry {
  id: string
  jogador_id: string
  jogador: Jogador
  meses: number[] | null
}

type Aba = 'classificacao' | 'artilheiros' | 'partidas' | 'mensalistas'

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

function getMesesTemporadaComAno(dataInicio: string, dataFim: string): { mes: number; ano: number }[] {
  const inicio = new Date(dataInicio + 'T00:00:00')
  const fim = new Date(dataFim + 'T00:00:00')
  const result: { mes: number; ano: number }[] = []
  const cur = new Date(inicio.getFullYear(), inicio.getMonth(), 1)
  while (cur <= fim) {
    result.push({ mes: cur.getMonth() + 1, ano: cur.getFullYear() })
    cur.setMonth(cur.getMonth() + 1)
  }
  return result
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
  const [selectedMeses, setSelectedMeses] = useState<number[] | null>(null)
  const [savingMensalista, setSavingMensalista] = useState(false)
  const [updatingMeses, setUpdatingMeses] = useState<string | null>(null)
  const [pagamentosStatus, setPagamentosStatus] = useState<Map<string, boolean>>(new Map())
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [diretoraOpen, setDiretoraOpen] = useState(false)
  const [jogadorDetalheId, setJogadorDetalheId] = useState<string | null>(null)
  const [jogadorDetalheNome, setJogadorDetalheNome] = useState<string | null>(null)
  const [filtroInicio, setFiltroInicio] = useState('')
  const [filtroFim, setFiltroFim] = useState('')
  const [filtroMes, setFiltroMes] = useState<number | null>(null)
  const [abaAtiva, setAbaAtiva] = useState<Aba>('classificacao')
  const [buscaJogador, setBuscaJogador] = useState('')
  const filtroInicializado = useRef(false)

  const load = useCallback(async (inicio?: string, fim?: string) => {
    const di = inicio ?? filtroInicio
    const df = fim ?? filtroFim

    const classificacaoParams = new URLSearchParams()
    if (di) classificacaoParams.set('data_inicio', di)
    if (df) classificacaoParams.set('data_fim', df)

    const partidasParams = new URLSearchParams()
    partidasParams.set('temporada_id', id)
    if (di) partidasParams.set('data_inicio', di)
    if (df) partidasParams.set('data_fim', df)

    const [tRes, cRes, pRes, mRes, jRes, pagRes] = await Promise.all([
      fetch(`/api/temporadas/${id}`),
      fetch(`/api/temporadas/${id}/classificacao?${classificacaoParams}`),
      fetch(`/api/partidas?${partidasParams}`),
      fetch(`/api/temporadas/${id}/mensalistas`),
      fetch(`/api/jogadores`),
      fetch(`/api/pagamentos?temporada_id=${id}`),
    ])
    if (tRes.ok) setTemporada(await tRes.json())
    if (cRes.ok) setClassificacao(await cRes.json())
    if (pRes.ok) setPartidas(await pRes.json())
    if (mRes.ok) setMensalistas(await mRes.json())
    if (jRes.ok) setTodosJogadores(await jRes.json())
    if (pagRes.ok) {
      const pagData: { jogador_id: string; mes: number; ano: number; pago: boolean }[] = await pagRes.json()
      const map = new Map<string, boolean>()
      pagData.forEach(p => map.set(`${p.jogador_id}-${p.mes}-${p.ano}`, p.pago))
      setPagamentosStatus(map)
    }
    setLoading(false)
  }, [id, filtroInicio, filtroFim])

  // Initial load
  useEffect(() => { load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize filter once temporada is loaded
  useEffect(() => {
    if (temporada && !filtroInicializado.current) {
      filtroInicializado.current = true
      setFiltroInicio(temporada.data_inicio)
      setFiltroFim(temporada.data_fim)
    }
  }, [temporada])

  // Re-fetch when filter changes (after initialization)
  useEffect(() => {
    if (!filtroInicializado.current) return
    if (!filtroInicio && !filtroFim) return
    load(filtroInicio, filtroFim)
  }, [filtroInicio, filtroFim]) // eslint-disable-line react-hooks/exhaustive-deps

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

  function limparFiltro() {
    if (!temporada) return
    setFiltroInicio(temporada.data_inicio)
    setFiltroFim(temporada.data_fim)
  }

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

  const mensalistasFiltrados = filtroMes === null
    ? mensalistasOrdenados
    : mensalistasOrdenados.filter(m => {
        const mesesTemporada = getMesesTemporada(temporada.data_inicio, temporada.data_fim)
        return (m.meses ?? mesesTemporada).includes(filtroMes)
      })

  const abas: { id: Aba; label: string }[] = [
    { id: 'classificacao', label: 'Classificação' },
    { id: 'artilheiros', label: 'Artilheiros' },
    { id: 'partidas', label: 'Partidas' },
    { id: 'mensalistas', label: 'Mensalistas' },
  ]

  const filtroAtivo = temporada && (filtroInicio !== temporada.data_inicio || filtroFim !== temporada.data_fim)

  const posicoes = new Map(classificacao.map((e, idx) => [e.jogador_id, idx + 1]))

  const classificacaoFiltrada = buscaJogador.trim()
    ? classificacao.filter(e => e.nome.toLowerCase().includes(buscaJogador.toLowerCase()))
    : classificacao

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div
        className="rounded-xl px-5 py-4 flex items-center justify-between gap-4"
        style={{ background: 'linear-gradient(135deg, #006b3d, #00894e)' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/temporadas" className="text-white/70 hover:text-white transition-colors shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m7-7-7 7 7 7" />
            </svg>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-white text-xl sm:text-2xl font-bold truncate">{temporada.nome}</h1>
              {temporada.ativa && (
                <span className="text-xs text-white border border-white/50 px-2 py-0.5 rounded-full font-medium shrink-0">
                  Ativa
                </span>
              )}
            </div>
            <p className="text-white/70 text-sm mt-0.5">
              {fmtDate(temporada.data_inicio)} — {fmtDate(temporada.data_fim)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setDiretoraOpen(true)}
            className="text-white/80 hover:text-white border border-white/30 hover:border-white/60 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="hidden sm:inline">Diretoria</span>
          </button>
          <Link
            href={`/temporadas/${id}/regras`}
            className="text-white/80 hover:text-white border border-white/30 hover:border-white/60 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="hidden sm:inline">Regras</span>
          </Link>
          <button
            onClick={() => setModalOpen(true)}
            className="text-white/80 hover:text-white border border-white/30 hover:border-white/60 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="hidden sm:inline">Editar</span>
          </button>
        </div>
      </div>

      {/* Filtro por intervalo de data */}
      <div className="bg-white border border-[#e0e0e0] rounded-xl px-4 py-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2 text-gray-500 shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            <span className="text-sm font-medium text-gray-700">Filtrar período</span>
          </div>
          <div className="flex flex-wrap items-end gap-3 flex-1">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">De</label>
              <input
                type="date"
                value={filtroInicio}
                min={temporada.data_inicio}
                max={filtroFim || temporada.data_fim}
                onChange={e => setFiltroInicio(e.target.value)}
                className="bg-white border border-[#e0e0e0] rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:border-green-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Até</label>
              <input
                type="date"
                value={filtroFim}
                min={filtroInicio || temporada.data_inicio}
                max={temporada.data_fim}
                onChange={e => setFiltroFim(e.target.value)}
                className="bg-white border border-[#e0e0e0] rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:border-green-500"
              />
            </div>
            {filtroAtivo && (
              <button
                onClick={limparFiltro}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 border border-[#e0e0e0] hover:border-red-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeWidth={2} strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Restaurar
              </button>
            )}
          </div>
          {filtroAtivo && (
            <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-full shrink-0">
              Filtro ativo
            </span>
          )}
        </div>
      </div>

      {/* Tab navigation */}
      <div className="bg-white border border-[#e0e0e0] rounded-xl overflow-hidden">
        <div className="flex overflow-x-auto border-b border-[#e0e0e0]">
          {abas.map(aba => (
            <button
              key={aba.id}
              onClick={() => setAbaAtiva(aba.id)}
              className={`px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                abaAtiva === aba.id
                  ? 'border-green-600 text-green-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {aba.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {/* Classificação */}
          {abaAtiva === 'classificacao' && (
            <div>
              <div className="px-4 pt-3 pb-2">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Pesquisar jogador..."
                    value={buscaJogador}
                    onChange={e => setBuscaJogador(e.target.value)}
                    className="w-full bg-gray-50 border border-[#e0e0e0] rounded-lg pl-9 pr-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500"
                  />
                  {buscaJogador && (
                    <button
                      onClick={() => setBuscaJogador('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeWidth={2} strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              <div className="p-2 pt-0">
                <ClassificacaoTable
                  entries={classificacaoFiltrada}
                  temporadaId={id}
                  posicoes={posicoes}
                  onSelectJogador={(jid) => { setJogadorDetalheNome(null); setJogadorDetalheId(jid) }}
                />
              </div>
            </div>
          )}

          {/* Artilheiros */}
          {abaAtiva === 'artilheiros' && (
            <div>
              <div className="px-4 pt-3 pb-2">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Pesquisar jogador..."
                    value={buscaJogador}
                    onChange={e => setBuscaJogador(e.target.value)}
                    className="w-full bg-gray-50 border border-[#e0e0e0] rounded-lg pl-9 pr-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500"
                  />
                  {buscaJogador && (
                    <button
                      onClick={() => setBuscaJogador('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeWidth={2} strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              <div className="p-2 pt-0">
                <ArtilheirosTable entries={classificacaoFiltrada} />
              </div>
            </div>
          )}

          {/* Partidas */}
          {abaAtiva === 'partidas' && (
            <>
              <div className="px-5 py-3 border-b border-[#e0e0e0] flex items-center justify-between">
                <span className="text-gray-500 text-sm">{partidas.length} partida(s)</span>
              </div>
              <PartidasList partidas={partidas} />
            </>
          )}

          {/* Mensalistas */}
          {abaAtiva === 'mensalistas' && (() => {
            const mesesTemporada = getMesesTemporada(temporada.data_inicio, temporada.data_fim)
            const mesesComAno = getMesesTemporadaComAno(temporada.data_inicio, temporada.data_fim)
            const mesParaAno = mesesComAno.reduce((acc, { mes, ano }) => { acc[mes] = ano; return acc }, {} as Record<number, number>)
            return (
              <>
                <div className="px-5 py-3 border-b border-[#e0e0e0]">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-sm">({mensalistas.length})</span>
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
                  {mensalistasOrdenados.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {mesesTemporada.map(mes => {
                        const total = mensalistasOrdenados.filter(m => (m.meses ?? mesesTemporada).includes(mes)).length
                        const ativo = filtroMes === mes
                        return (
                          <button
                            key={mes}
                            type="button"
                            onClick={() => setFiltroMes(ativo ? null : mes)}
                            className={`flex items-center gap-1 rounded-lg px-2 py-1 border transition-colors ${
                              ativo
                                ? 'bg-green-500 border-green-600 text-white'
                                : 'bg-gray-50 border-gray-200 hover:bg-green-50 hover:border-green-300'
                            }`}
                          >
                            <span className={`text-xs font-medium ${ativo ? 'text-white' : 'text-gray-500'}`}>{MESES_NOMES[mes - 1]}</span>
                            <span className={`text-xs font-bold ${ativo ? 'text-white' : 'text-green-700'}`}>{total}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {mensalistasOrdenados.length === 0 ? (
                  <div className="py-10 text-center text-gray-500 text-sm">
                    Nenhum mensalista nesta temporada.
                  </div>
                ) : mensalistasFiltrados.length === 0 ? (
                  <div className="py-10 text-center text-gray-500 text-sm">
                    Nenhum mensalista em {MESES_NOMES[(filtroMes ?? 1) - 1]}.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {mensalistasFiltrados.map(m => {
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
                              const ano = mesParaAno[mes]
                              const statusKey = `${m.jogador_id}-${mes}-${ano}`
                              const pago = pagamentosStatus.get(statusKey)
                              return (
                                <div key={mes} className="flex flex-col items-center gap-0.5">
                                  <button
                                    onClick={() => handleToggleMes(m.jogador_id, mes, m.meses, mesesTemporada)}
                                    className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-colors ${
                                      ativo
                                        ? 'bg-green-100 text-green-700 border-green-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                                        : 'bg-transparent text-gray-500 border-gray-200 hover:bg-green-50 hover:text-green-600 hover:border-green-200'
                                    }`}
                                  >
                                    {MESES_NOMES[mes - 1]}
                                  </button>
                                  {ativo && (
                                    pago === true ? (
                                      <span title="Pago">
                                        <svg className="w-3 h-3 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                          <path strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                      </span>
                                    ) : (
                                      <span title="Pendente">
                                        <svg className="w-3 h-3 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                          <circle cx="12" cy="12" r="9" strokeWidth={2.5} />
                                          <path strokeWidth={2.5} strokeLinecap="round" d="M12 8v4m0 3.5h.01" />
                                        </svg>
                                      </span>
                                    )
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )
          })()}
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
                  className="w-full bg-white border border-[#e0e0e0] rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:border-green-500"
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

      <Modal
        open={!!jogadorDetalheId}
        onClose={() => { setJogadorDetalheId(null); setJogadorDetalheNome(null) }}
        title={jogadorDetalheNome ?? ''}
        size="xl"
      >
        {jogadorDetalheId && (
          <JogadorDetalheModal
            temporadaId={id}
            jogadorId={jogadorDetalheId}
            onNomeLoaded={(nome) => setJogadorDetalheNome(nome)}
            filtroInicio={filtroInicio || undefined}
            filtroFim={filtroFim || undefined}
          />
        )}
      </Modal>

      <DiretoraModal
        open={diretoraOpen}
        onClose={() => setDiretoraOpen(false)}
        temporadaId={id}
        todosJogadores={todosJogadores}
      />
    </div>
  )
}
