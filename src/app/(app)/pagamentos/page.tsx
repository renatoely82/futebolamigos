'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, parseISO, eachMonthOfInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Temporada, FormaPagamento } from '@/lib/supabase'

type Tab = 'mensalistas' | 'diaristas'

interface JogadorInfo {
  id: string
  nome: string
}

interface PagamentoEntry {
  jogador_id: string
  jogador: JogadorInfo | null
  pagamento_id: string | null
  pago: boolean
  data_pagamento: string | null
  observacoes: string | null
  valor_pago: number | null
  forma_pagamento: FormaPagamento | null
}

interface DiaristaEntry {
  jogador_id: string
  jogador: JogadorInfo | null
  pagamento_id: string | null
  pago: boolean
  valor_pago: number | null
  forma_pagamento: FormaPagamento | null
  data_pagamento: string | null
  observacoes: string | null
}

interface PartidaComDiaristas {
  partida: { id: string; data: string; local: string | null; status: string }
  diaristas: DiaristaEntry[]
}

interface MesOpcao {
  mes: number
  ano: number
  label: string
}

const FORMAS: { value: FormaPagamento; label: string; color: string }[] = [
  { value: 'CASH', label: 'CASH', color: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200' },
  { value: 'BIZUM', label: 'BIZUM', color: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200' },
  { value: 'PIX', label: 'PIX', color: 'bg-teal-100 text-teal-700 border-teal-200 hover:bg-teal-200' },
  { value: 'LESÃO', label: 'LESÃO', color: 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200' },
  { value: 'SAMBA', label: 'SAMBA', color: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200' },
]

function getFormaStyle(forma: FormaPagamento | null): string {
  const found = FORMAS.find(f => f.value === forma)
  return found?.color ?? ''
}

function getStatusInfo(entry: PagamentoEntry, valorEsperado: number | null): {
  label: string
  classes: string
} {
  if (entry.forma_pagamento === 'LESÃO' || entry.forma_pagamento === 'SAMBA') {
    return { label: entry.forma_pagamento, classes: 'bg-gray-100 text-gray-500 border-gray-200' }
  }
  if (entry.pago || (entry.valor_pago !== null && valorEsperado !== null && entry.valor_pago >= valorEsperado)) {
    return { label: 'Pago', classes: 'bg-green-100 text-green-700 border-green-200' }
  }
  if (entry.valor_pago !== null && entry.valor_pago > 0) {
    return { label: 'Parcial', classes: 'bg-yellow-100 text-yellow-700 border-yellow-200' }
  }
  return { label: 'Pendente', classes: 'bg-red-50 text-red-500 border-red-200' }
}

function getMesesDaTemporada(temporada: Temporada): MesOpcao[] {
  const inicio = parseISO(temporada.data_inicio)
  const fim = parseISO(temporada.data_fim)
  const meses = eachMonthOfInterval({ start: inicio, end: fim })
  return meses.map(d => ({
    mes: d.getMonth() + 1,
    ano: d.getFullYear(),
    label: format(d, 'MMMM yyyy', { locale: ptBR }),
  }))
}

export default function PagamentosPage() {
  const [tab, setTab] = useState<Tab>('mensalistas')
  const [temporadas, setTemporadas] = useState<Temporada[]>([])
  const [temporadaId, setTemporadaId] = useState('')
  const [mesSelecionado, setMesSelecionado] = useState<MesOpcao | null>(null)
  const [meses, setMeses] = useState<MesOpcao[]>([])
  const [pagamentos, setPagamentos] = useState<PagamentoEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<Set<string>>(new Set())
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ valor: string; forma: FormaPagamento | null; obs: string }>({
    valor: '',
    forma: null,
    obs: '',
  })
  // valor_mensalidade edit
  const [editandoMensalidade, setEditandoMensalidade] = useState(false)
  const [mensalidadeInput, setMensalidadeInput] = useState('')
  const [salvandoMensalidade, setSalvandoMensalidade] = useState(false)
  // valor_diarista edit
  const [editandoDiarista, setEditandoDiarista] = useState(false)
  const [diaristaInput, setDiaristaInput] = useState('')
  const [salvandoDiarista, setSalvandoDiarista] = useState(false)
  // Diaristas tab state
  const [diaristasPorPartida, setDiaristasPorPartida] = useState<PartidaComDiaristas[]>([])
  const [loadingDiaristas, setLoadingDiaristas] = useState(false)
  const [editandoDiaristaId, setEditandoDiaristaId] = useState<string | null>(null) // "partidaId:jogadorId"
  const [editDiaristaForm, setEditDiaristaForm] = useState<{ valor: string; forma: FormaPagamento | null; obs: string }>({ valor: '', forma: null, obs: '' })
  const [savingDiaristaKey, setSavingDiaristaKey] = useState<Set<string>>(new Set())
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/temporadas')
      .then(r => r.json())
      .then((data: Temporada[]) => {
        setTemporadas(data)
        const ativa = data.find(t => t.ativa)
        if (ativa) setTemporadaId(ativa.id)
      })
  }, [])

  useEffect(() => {
    if (!temporadaId) {
      setMeses([])
      setMesSelecionado(null)
      return
    }
    const t = temporadas.find(t => t.id === temporadaId)
    if (!t) return
    const lista = getMesesDaTemporada(t)
    setMeses(lista)
    const now = new Date()
    const current = lista.find(m => m.mes === now.getMonth() + 1 && m.ano === now.getFullYear())
    setMesSelecionado(current ?? lista[lista.length - 1] ?? null)
  }, [temporadaId, temporadas])

  const loadPagamentos = useCallback(async () => {
    if (!temporadaId || !mesSelecionado) {
      setPagamentos([])
      return
    }
    setLoading(true)
    const res = await fetch(
      `/api/pagamentos?temporada_id=${temporadaId}&mes=${mesSelecionado.mes}&ano=${mesSelecionado.ano}`
    )
    if (res.ok) setPagamentos(await res.json())
    setLoading(false)
  }, [temporadaId, mesSelecionado])

  useEffect(() => { loadPagamentos() }, [loadPagamentos])

  const temporadaSelecionada = temporadas.find(t => t.id === temporadaId)
  const valorEsperado = temporadaSelecionada?.valor_mensalidade ?? null
  const valorDiaristaEsperado = temporadaSelecionada?.valor_diarista ?? null

  async function salvarPagamento(entry: PagamentoEntry) {
    const key = entry.jogador_id
    setSaving(prev => new Set(prev).add(key))

    const valorNum = editForm.valor ? Number(editForm.valor) : null
    const isento = editForm.forma === 'LESÃO' || editForm.forma === 'SAMBA'
    const pago = isento ? false : (valorNum !== null && valorEsperado !== null ? valorNum >= valorEsperado : valorNum !== null && valorNum > 0)

    const body = {
      temporada_id: temporadaId,
      jogador_id: entry.jogador_id,
      mes: mesSelecionado!.mes,
      ano: mesSelecionado!.ano,
      pago,
      data_pagamento: pago ? new Date().toISOString().split('T')[0] : (entry.data_pagamento ?? null),
      observacoes: editForm.obs || null,
      valor_pago: isento ? null : valorNum,
      forma_pagamento: editForm.forma,
    }

    let res: Response
    if (entry.pagamento_id) {
      res = await fetch(`/api/pagamentos/${entry.pagamento_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } else {
      res = await fetch('/api/pagamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    }

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setErro(json.error ?? `Erro ${res.status} ao salvar pagamento`)
    } else {
      setErro(null)
    }

    setSaving(prev => { const s = new Set(prev); s.delete(key); return s })
    setEditandoId(null)
    loadPagamentos()
  }

  const loadDiaristas = useCallback(async () => {
    if (!temporadaId || !mesSelecionado) { setDiaristasPorPartida([]); return }
    setLoadingDiaristas(true)
    const res = await fetch(
      `/api/temporadas/${temporadaId}/pagamentos-diaristas?mes=${mesSelecionado.mes}&ano=${mesSelecionado.ano}`
    )
    if (res.ok) setDiaristasPorPartida(await res.json())
    setLoadingDiaristas(false)
  }, [temporadaId, mesSelecionado])

  useEffect(() => { if (tab === 'diaristas') loadDiaristas() }, [tab, loadDiaristas])

  async function salvarMensalidade() {
    if (!temporadaId) return
    setSalvandoMensalidade(true)
    const valor = mensalidadeInput ? Number(mensalidadeInput) : null
    await fetch(`/api/temporadas/${temporadaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ valor_mensalidade: valor }),
    })
    setTemporadas(prev =>
      prev.map(t => t.id === temporadaId ? { ...t, valor_mensalidade: valor } : t)
    )
    setSalvandoMensalidade(false)
    setEditandoMensalidade(false)
  }

  async function salvarValorDiarista() {
    if (!temporadaId) return
    setSalvandoDiarista(true)
    const valor = diaristaInput ? Number(diaristaInput) : null
    await fetch(`/api/temporadas/${temporadaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ valor_diarista: valor }),
    })
    setTemporadas(prev =>
      prev.map(t => t.id === temporadaId ? { ...t, valor_diarista: valor } : t)
    )
    setSalvandoDiarista(false)
    setEditandoDiarista(false)
  }

  async function salvarPagamentoDiarista(partidaId: string, entry: DiaristaEntry) {
    const key = `${partidaId}:${entry.jogador_id}`
    setSavingDiaristaKey(prev => new Set(prev).add(key))
    const valorNum = editDiaristaForm.valor ? Number(editDiaristaForm.valor) : null
    const isento = editDiaristaForm.forma === 'LESÃO' || editDiaristaForm.forma === 'SAMBA'
    const pago = isento ? false : (valorNum !== null && valorNum > 0)
    await fetch(`/api/partidas/${partidaId}/pagamentos-diaristas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jogador_id: entry.jogador_id,
        pago,
        valor_pago: isento ? null : valorNum,
        forma_pagamento: editDiaristaForm.forma,
        data_pagamento: pago ? new Date().toISOString() : null,
        observacoes: editDiaristaForm.obs || null,
      }),
    })
    setSavingDiaristaKey(prev => { const s = new Set(prev); s.delete(key); return s })
    setEditandoDiaristaId(null)
    loadDiaristas()
  }

  function abrirEdicao(entry: PagamentoEntry) {
    setEditandoId(entry.jogador_id)
    setEditForm({
      valor: entry.valor_pago !== null ? String(entry.valor_pago) : (valorEsperado !== null ? String(valorEsperado) : ''),
      forma: entry.forma_pagamento,
      obs: entry.observacoes ?? '',
    })
  }

  function fecharEdicao() {
    setEditandoId(null)
    setEditForm({ valor: '', forma: null, obs: '' })
  }

  // Financial summary calculations
  const isento = (e: PagamentoEntry) => e.forma_pagamento === 'LESÃO' || e.forma_pagamento === 'SAMBA'
  const totalRecebido = pagamentos.reduce((sum, e) => sum + (isento(e) ? 0 : (e.valor_pago ?? 0)), 0)
  const totalEsperado = valorEsperado !== null
    ? pagamentos.filter(e => !isento(e)).length * valorEsperado
    : null
  const saldo = totalEsperado !== null ? totalRecebido - totalEsperado : null
  const totalCash = pagamentos.filter(e => e.forma_pagamento === 'CASH').reduce((s, e) => s + (e.valor_pago ?? 0), 0)
  const totalBizum = pagamentos.filter(e => e.forma_pagamento === 'BIZUM').reduce((s, e) => s + (e.valor_pago ?? 0), 0)
  const totalPix = pagamentos.filter(e => e.forma_pagamento === 'PIX').reduce((s, e) => s + (e.valor_pago ?? 0), 0)
  const pagosCount = pagamentos.filter(e => {
    if (isento(e)) return false
    if (e.pago) return true
    if (e.valor_pago !== null && valorEsperado !== null) return e.valor_pago >= valorEsperado
    return false
  }).length
  const totalAtivos = pagamentos.filter(e => !isento(e)).length

  const formatVal = (v: number) => v % 1 === 0 ? String(v) : v.toFixed(2)

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-gray-800 text-2xl font-bold">Pagamentos</h1>
        <p className="text-gray-500 text-sm mt-1">Controlo de mensalistas e diaristas por temporada</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-full sm:w-fit">
        {(['mensalistas', 'diaristas'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Error banner */}
      {erro && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start justify-between gap-3">
          <p className="text-red-600 text-sm">{erro}</p>
          <button onClick={() => setErro(null)} className="text-red-400 hover:text-red-600 shrink-0 text-lg leading-none">×</button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Temporada</label>
            <select
              value={temporadaId}
              onChange={e => setTemporadaId(e.target.value)}
              className="w-full bg-white border border-[#d1d9e0] rounded-lg px-3 py-2 text-gray-800 text-sm focus:outline-none focus:border-green-500 transition-colors"
            >
              <option value="">Selecione uma temporada...</option>
              {temporadas.map(t => (
                <option key={t.id} value={t.id}>
                  {t.nome}{t.ativa ? ' (Ativa)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Mês</label>
            <select
              value={mesSelecionado ? `${mesSelecionado.mes}-${mesSelecionado.ano}` : ''}
              onChange={e => {
                const [mes, ano] = e.target.value.split('-').map(Number)
                setMesSelecionado(meses.find(m => m.mes === mes && m.ano === ano) ?? null)
              }}
              disabled={meses.length === 0}
              className="w-full bg-white border border-[#d1d9e0] rounded-lg px-3 py-2 text-gray-800 text-sm focus:outline-none focus:border-green-500 transition-colors disabled:opacity-40"
            >
              {meses.length === 0 && <option value="">—</option>}
              {meses.map(m => (
                <option key={`${m.mes}-${m.ano}`} value={`${m.mes}-${m.ano}`}>
                  {m.label.charAt(0).toUpperCase() + m.label.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Valor config per tab */}
        {temporadaId && tab === 'mensalistas' && (
          <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
            <span className="text-xs text-gray-500">Mensalidade:</span>
            {editandoMensalidade ? (
              <>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={mensalidadeInput}
                  onChange={e => setMensalidadeInput(e.target.value)}
                  placeholder="ex: 21"
                  className="w-20 bg-white border border-[#d1d9e0] rounded-lg px-2 py-1 text-gray-800 text-sm focus:outline-none focus:border-green-500"
                  autoFocus
                />
                <button
                  onClick={salvarMensalidade}
                  disabled={salvandoMensalidade}
                  className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors"
                >
                  {salvandoMensalidade ? '...' : 'Guardar'}
                </button>
                <button
                  onClick={() => setEditandoMensalidade(false)}
                  className="text-gray-400 hover:text-gray-600 text-xs px-2 py-1"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <span className="text-sm font-semibold text-gray-700">
                  {valorEsperado !== null ? `${formatVal(valorEsperado)} €` : '—'}
                </span>
                <button
                  onClick={() => {
                    setMensalidadeInput(valorEsperado !== null ? String(valorEsperado) : '')
                    setEditandoMensalidade(true)
                  }}
                  className="text-xs text-gray-400 hover:text-green-600 underline underline-offset-2"
                >
                  editar
                </button>
              </>
            )}
          </div>
        )}
        {temporadaId && tab === 'diaristas' && (
          <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
            <span className="text-xs text-gray-500">Valor diarista:</span>
            {editandoDiarista ? (
              <>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={diaristaInput}
                  onChange={e => setDiaristaInput(e.target.value)}
                  placeholder="ex: 10"
                  className="w-20 bg-white border border-[#d1d9e0] rounded-lg px-2 py-1 text-gray-800 text-sm focus:outline-none focus:border-green-500"
                  autoFocus
                />
                <button
                  onClick={salvarValorDiarista}
                  disabled={salvandoDiarista}
                  className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors"
                >
                  {salvandoDiarista ? '...' : 'Guardar'}
                </button>
                <button
                  onClick={() => setEditandoDiarista(false)}
                  className="text-gray-400 hover:text-gray-600 text-xs px-2 py-1"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <span className="text-sm font-semibold text-gray-700">
                  {valorDiaristaEsperado !== null ? `${formatVal(valorDiaristaEsperado)} €` : '—'}
                </span>
                <button
                  onClick={() => {
                    setDiaristaInput(valorDiaristaEsperado !== null ? String(valorDiaristaEsperado) : '')
                    setEditandoDiarista(true)
                  }}
                  className="text-xs text-gray-400 hover:text-green-600 underline underline-offset-2"
                >
                  editar
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Results — Mensalistas */}
      {tab === 'mensalistas' && (!temporadaId || !mesSelecionado ? (
        <div className="bg-white border border-[#e2e8f0] rounded-xl py-16 text-center text-gray-500 text-sm">
          Selecione uma temporada e um mês para ver os pagamentos.
        </div>
      ) : loading ? (
        <div className="bg-white border border-[#e2e8f0] rounded-xl py-16 text-center text-gray-500 text-sm">
          Carregando...
        </div>
      ) : pagamentos.length === 0 ? (
        <div className="bg-white border border-[#e2e8f0] rounded-xl py-16 text-center">
          <p className="text-gray-500 text-sm">Nenhum mensalista nesta temporada.</p>
          <p className="text-gray-400 text-xs mt-1">
            Adicione mensalistas em <span className="text-gray-500">Temporadas</span>.
          </p>
        </div>
      ) : (
        <>
          {/* Financial summary */}
          <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 space-y-3">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Resumo financeiro</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-0.5">Recebido</p>
                <p className="text-lg font-bold text-green-600">{formatVal(totalRecebido)} €</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-0.5">Esperado</p>
                <p className="text-lg font-bold text-gray-700">
                  {totalEsperado !== null ? `${formatVal(totalEsperado)} €` : '—'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-0.5">Saldo</p>
                <p className={`text-lg font-bold ${saldo === null ? 'text-gray-400' : saldo >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {saldo !== null ? `${saldo >= 0 ? '+' : ''}${formatVal(saldo)} €` : '—'}
                </p>
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-gray-500">
                <span>{pagosCount}/{totalAtivos} mensalistas pagos</span>
                <span>{totalAtivos > 0 ? Math.round((pagosCount / totalAtivos) * 100) : 0}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${pagosCount === totalAtivos && totalAtivos > 0 ? 'bg-green-500' : 'bg-yellow-400'}`}
                  style={{ width: totalAtivos > 0 ? `${(pagosCount / totalAtivos) * 100}%` : '0%' }}
                />
              </div>
            </div>

            {/* Method breakdown */}
            {(totalCash > 0 || totalBizum > 0 || totalPix > 0) && (
              <div className="flex flex-wrap gap-2 pt-1">
                {totalCash > 0 && (
                  <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                    CASH: {formatVal(totalCash)} €
                  </span>
                )}
                {totalBizum > 0 && (
                  <span className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full font-medium">
                    BIZUM: {formatVal(totalBizum)} €
                  </span>
                )}
                {totalPix > 0 && (
                  <span className="text-xs bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full font-medium">
                    PIX: {formatVal(totalPix)} €
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Player list */}
          <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
            <div className="divide-y divide-gray-100">
              {pagamentos.map(entry => {
                const isSaving = saving.has(entry.jogador_id)
                const isEditing = editandoId === entry.jogador_id
                const status = getStatusInfo(entry, valorEsperado)
                const isentoEntry = isento(entry)

                return (
                  <div key={entry.jogador_id}>
                    <div className="flex items-center justify-between px-4 py-3 gap-3">
                      {/* Name + meta */}
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-800 text-sm font-medium truncate">
                          {entry.jogador?.nome ?? '—'}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {entry.forma_pagamento && !isentoEntry && (
                            <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${getFormaStyle(entry.forma_pagamento)}`}>
                              {entry.forma_pagamento}
                            </span>
                          )}
                          {entry.valor_pago !== null && !isentoEntry && (
                            <span className="text-xs text-gray-500">
                              {formatVal(entry.valor_pago)}{valorEsperado !== null ? ` / ${formatVal(valorEsperado)} €` : ' €'}
                            </span>
                          )}
                          {entry.data_pagamento && entry.pago && (
                            <span className="text-xs text-gray-400">
                              {format(parseISO(entry.data_pagamento), 'dd/MM/yy')}
                            </span>
                          )}
                          {entry.observacoes && (
                            <span className="text-xs text-gray-400 italic truncate max-w-[120px]">{entry.observacoes}</span>
                          )}
                        </div>
                      </div>

                      {/* Status + edit */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => isEditing ? fecharEdicao() : abrirEdicao(entry)}
                          disabled={isSaving}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${status.classes} ${isSaving ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                        >
                          {isSaving ? (
                            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : status.label === 'Pago' ? (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : null}
                          {status.label}
                        </button>
                      </div>
                    </div>

                    {/* Inline edit form */}
                    {isEditing && (
                      <div className="px-4 pb-4 pt-1 bg-gray-50 space-y-3">
                        {/* Forma de pagamento */}
                        <div>
                          <p className="text-xs text-gray-500 mb-1.5">Forma de pagamento</p>
                          <div className="flex flex-wrap gap-1.5">
                            {FORMAS.map(f => (
                              <button
                                key={f.value}
                                onClick={() => setEditForm(prev => ({
                                  ...prev,
                                  forma: prev.forma === f.value ? null : f.value,
                                }))}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                                  editForm.forma === f.value
                                    ? f.color + ' ring-2 ring-offset-1 ring-current'
                                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                }`}
                              >
                                {f.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Valor + obs (only if not isento) */}
                        {editForm.forma !== 'LESÃO' && editForm.forma !== 'SAMBA' && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Valor pago (€)</p>
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={editForm.valor}
                                onChange={e => setEditForm(prev => ({ ...prev, valor: e.target.value }))}
                                placeholder={valorEsperado !== null ? String(valorEsperado) : '0'}
                                className="w-full bg-white border border-[#d1d9e0] rounded-lg px-3 py-1.5 text-gray-800 text-sm focus:outline-none focus:border-green-500"
                              />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Observação</p>
                              <input
                                type="text"
                                value={editForm.obs}
                                onChange={e => setEditForm(prev => ({ ...prev, obs: e.target.value }))}
                                placeholder="opcional..."
                                className="w-full bg-white border border-[#d1d9e0] rounded-lg px-3 py-1.5 text-gray-800 text-sm focus:outline-none focus:border-green-500"
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <button
                            onClick={() => salvarPagamento(entry)}
                            disabled={isSaving}
                            className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
                          >
                            Guardar
                          </button>
                          <button
                            onClick={fecharEdicao}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {pagosCount === totalAtivos && totalAtivos > 0 && (
              <div className="px-5 py-3 border-t border-gray-100 bg-green-50">
                <p className="text-green-600 text-sm text-center font-medium">
                  Todos os mensalistas pagaram este mês!
                </p>
              </div>
            )}
          </div>
        </>
      ))}

      {/* Results — Diaristas */}
      {tab === 'diaristas' && (
        !temporadaId || !mesSelecionado ? (
          <div className="bg-white border border-[#e2e8f0] rounded-xl py-16 text-center text-gray-500 text-sm">
            Selecione uma temporada e um mês para ver os pagamentos de diaristas.
          </div>
        ) : loadingDiaristas ? (
          <div className="bg-white border border-[#e2e8f0] rounded-xl py-16 text-center text-gray-500 text-sm">
            Carregando...
          </div>
        ) : diaristasPorPartida.length === 0 ? (
          <div className="bg-white border border-[#e2e8f0] rounded-xl py-16 text-center">
            <p className="text-gray-500 text-sm">Nenhuma partida com diaristas neste mês.</p>
            <p className="text-gray-400 text-xs mt-1">Goleiros são excluídos automaticamente.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {diaristasPorPartida.map(({ partida, diaristas }) => {
              const pagosNaPartida = diaristas.filter(d =>
                d.pago || d.forma_pagamento === 'LESÃO' || d.forma_pagamento === 'SAMBA'
              ).length
              const totalRecebidoPartida = diaristas.reduce((s, d) => s + (d.valor_pago ?? 0), 0)

              return (
                <div key={partida.id} className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
                  {/* Partida header */}
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-gray-800 text-sm font-semibold">
                        {format(parseISO(partida.data), "d 'de' MMMM", { locale: ptBR })}
                        {partida.local && <span className="text-gray-400 font-normal"> · {partida.local}</span>}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {pagosNaPartida}/{diaristas.length} resolvidos
                        {totalRecebidoPartida > 0 && ` · ${formatVal(totalRecebidoPartida)} € recebidos`}
                      </p>
                    </div>
                    <a href={`/partidas/${partida.id}`} className="text-xs text-green-600 hover:text-green-700 shrink-0">
                      Ver partida →
                    </a>
                  </div>

                  {/* Diaristas list */}
                  <div className="divide-y divide-gray-100">
                    {diaristas.map(entry => {
                      const key = `${partida.id}:${entry.jogador_id}`
                      const isSaving = savingDiaristaKey.has(key)
                      const isEditing = editandoDiaristaId === key
                      const isento = entry.forma_pagamento === 'LESÃO' || entry.forma_pagamento === 'SAMBA'
                      const diaristaStatus = (() => {
                        if (isento) return { label: entry.forma_pagamento as string, classes: 'bg-gray-100 text-gray-500 border-gray-200' }
                        if (entry.pago || (entry.valor_pago !== null && valorDiaristaEsperado !== null && entry.valor_pago >= valorDiaristaEsperado)) {
                          return { label: 'Pago', classes: 'bg-green-100 text-green-700 border-green-200' }
                        }
                        if (entry.valor_pago !== null && entry.valor_pago > 0) {
                          return { label: 'Parcial', classes: 'bg-yellow-100 text-yellow-700 border-yellow-200' }
                        }
                        return { label: 'Pendente', classes: 'bg-red-50 text-red-500 border-red-200' }
                      })()

                      return (
                        <div key={entry.jogador_id}>
                          <div className="flex items-center justify-between px-4 py-3 gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-gray-800 text-sm font-medium truncate">{entry.jogador?.nome ?? '—'}</p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {entry.forma_pagamento && !isento && (
                                  <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${getFormaStyle(entry.forma_pagamento)}`}>
                                    {entry.forma_pagamento}
                                  </span>
                                )}
                                {entry.valor_pago !== null && !isento && (
                                  <span className="text-xs text-gray-500">
                                    {formatVal(entry.valor_pago)}{valorDiaristaEsperado !== null ? ` / ${formatVal(valorDiaristaEsperado)} €` : ' €'}
                                  </span>
                                )}
                                {entry.observacoes && (
                                  <span className="text-xs text-gray-400 italic truncate max-w-[120px]">{entry.observacoes}</span>
                                )}
                              </div>
                            </div>
                            <div className="shrink-0">
                              <button
                                onClick={() => {
                                  if (isEditing) { setEditandoDiaristaId(null); return }
                                  setEditandoDiaristaId(key)
                                  setEditDiaristaForm({
                                    valor: entry.valor_pago !== null ? String(entry.valor_pago) : (valorDiaristaEsperado !== null ? String(valorDiaristaEsperado) : ''),
                                    forma: entry.forma_pagamento,
                                    obs: entry.observacoes ?? '',
                                  })
                                }}
                                disabled={isSaving}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${diaristaStatus.classes} ${isSaving ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                              >
                                {isSaving ? (
                                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                  </svg>
                                ) : diaristaStatus.label === 'Pago' ? (
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : null}
                                {diaristaStatus.label}
                              </button>
                            </div>
                          </div>

                          {isEditing && (
                            <div className="px-4 pb-4 pt-1 bg-gray-50 space-y-3">
                              <div>
                                <p className="text-xs text-gray-500 mb-1.5">Forma de pagamento</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {FORMAS.map(f => (
                                    <button
                                      key={f.value}
                                      onClick={() => setEditDiaristaForm(prev => ({ ...prev, forma: prev.forma === f.value ? null : f.value }))}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                                        editDiaristaForm.forma === f.value
                                          ? f.color + ' ring-2 ring-offset-1 ring-current'
                                          : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                      }`}
                                    >
                                      {f.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              {editDiaristaForm.forma !== 'LESÃO' && editDiaristaForm.forma !== 'SAMBA' && (
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Valor pago (€)</p>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.5"
                                      value={editDiaristaForm.valor}
                                      onChange={e => setEditDiaristaForm(prev => ({ ...prev, valor: e.target.value }))}
                                      placeholder={valorDiaristaEsperado !== null ? String(valorDiaristaEsperado) : '0'}
                                      className="w-full bg-white border border-[#d1d9e0] rounded-lg px-3 py-1.5 text-gray-800 text-sm focus:outline-none focus:border-green-500"
                                    />
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Observação</p>
                                    <input
                                      type="text"
                                      value={editDiaristaForm.obs}
                                      onChange={e => setEditDiaristaForm(prev => ({ ...prev, obs: e.target.value }))}
                                      placeholder="opcional..."
                                      className="w-full bg-white border border-[#d1d9e0] rounded-lg px-3 py-1.5 text-gray-800 text-sm focus:outline-none focus:border-green-500"
                                    />
                                  </div>
                                </div>
                              )}
                              <div className="flex gap-2">
                                <button
                                  onClick={() => salvarPagamentoDiarista(partida.id, entry)}
                                  disabled={isSaving}
                                  className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
                                >
                                  Guardar
                                </button>
                                <button
                                  onClick={() => setEditandoDiaristaId(null)}
                                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
