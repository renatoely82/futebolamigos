'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, parseISO, eachMonthOfInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Temporada, FormaPagamento, TemporadaValoresMes, Despesa, CategoriaDespesa } from '@/lib/supabase'
import { CATEGORIAS_DESPESA } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'

type Tab = 'mensalistas' | 'diaristas' | 'despesas'

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
  credito: number | null
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
  isento: boolean
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
]

function getFormaStyle(forma: FormaPagamento | null): string {
  const found = FORMAS.find(f => f.value === forma)
  return found?.color ?? ''
}

function getStatusInfo(entry: PagamentoEntry, valorEsperado: number | null): {
  label: string
  classes: string
} {
  const totalAbatido = (entry.valor_pago ?? 0) + (entry.credito ?? 0)
  if (entry.pago || (valorEsperado !== null && totalAbatido >= valorEsperado)) {
    return { label: 'Pago', classes: 'bg-green-100 text-green-700 border-green-200' }
  }
  if (totalAbatido > 0) {
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
  const { toast } = useToast()
  const [tab, setTab] = useState<Tab>('mensalistas')
  const [temporadas, setTemporadas] = useState<Temporada[]>([])
  const [temporadaId, setTemporadaId] = useState('')
  const [mesSelecionado, setMesSelecionado] = useState<MesOpcao | null>(null)
  const [meses, setMeses] = useState<MesOpcao[]>([])
  const [pagamentos, setPagamentos] = useState<PagamentoEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<Set<string>>(new Set())
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ valor: string; credito: string; forma: FormaPagamento | null; obs: string }>({
    valor: '',
    credito: '',
    forma: null,
    obs: '',
  })
  // valores por mês
  const [valoresMes, setValoresMes] = useState<TemporadaValoresMes | null>(null)
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
  const [editDiaristaForm, setEditDiaristaForm] = useState<{ valor: string; forma: FormaPagamento | null; obs: string; isento: boolean }>({ valor: '', forma: null, obs: '', isento: false })
  const [savingDiaristaKey, setSavingDiaristaKey] = useState<Set<string>>(new Set())
  const [partidaFiltroId, setPartidaFiltroId] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  // Despesas state
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [loadingDespesas, setLoadingDespesas] = useState(false)
  const [showNovaDespesa, setShowNovaDespesa] = useState(false)
  const [savingDespesa, setSavingDespesa] = useState(false)
  const [deletingDespesaId, setDeletingDespesaId] = useState<string | null>(null)
  const [novaDespesa, setNovaDespesa] = useState({
    data: new Date().toISOString().split('T')[0],
    descricao: '',
    categoria: 'aluguel' as CategoriaDespesa,
    valor: '',
    forma_pagamento: null as FormaPagamento | null,
    observacoes: '',
  })

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

  // Fetch month-specific valores when temporada+mes changes
  useEffect(() => {
    if (!temporadaId || !mesSelecionado) {
      setValoresMes(null)
      return
    }
    fetch(`/api/temporadas/${temporadaId}/valores-mes?mes=${mesSelecionado.mes}&ano=${mesSelecionado.ano}`)
      .then(r => r.json())
      .then((data: TemporadaValoresMes | null) => setValoresMes(data))
      .catch(() => setValoresMes(null))
  }, [temporadaId, mesSelecionado])

  const temporadaSelecionada = temporadas.find(t => t.id === temporadaId)
  // Month-specific valor takes priority, fallback to season default
  const valorEsperado = valoresMes?.valor_mensalidade ?? temporadaSelecionada?.valor_mensalidade ?? null
  const valorDiaristaEsperado = valoresMes?.valor_diarista ?? temporadaSelecionada?.valor_diarista ?? null

  async function salvarPagamento(entry: PagamentoEntry) {
    const key = entry.jogador_id
    setSaving(prev => new Set(prev).add(key))

    const valorNum = editForm.valor ? Number(editForm.valor) : null
    const creditoNum = editForm.credito ? Number(editForm.credito) : null
    const totalPago = (valorNum ?? 0) + (creditoNum ?? 0)
    const pago = valorEsperado !== null ? totalPago >= valorEsperado : totalPago > 0

    const body = {
      temporada_id: temporadaId,
      jogador_id: entry.jogador_id,
      mes: mesSelecionado!.mes,
      ano: mesSelecionado!.ano,
      pago,
      data_pagamento: pago ? new Date().toISOString().split('T')[0] : (entry.data_pagamento ?? null),
      observacoes: editForm.obs || null,
      valor_pago: valorNum,
      credito: creditoNum,
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
      toast('Erro ao salvar pagamento.', 'error')
    } else {
      setErro(null)
      toast('Pagamento salvo.')
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

  useEffect(() => { loadDiaristas() }, [loadDiaristas])

  // Reset partida filter only when season/month changes or user switches to mensalistas
  useEffect(() => { setPartidaFiltroId('') }, [temporadaId, mesSelecionado])
  useEffect(() => { if (tab === 'mensalistas') setPartidaFiltroId('') }, [tab])

  // Load despesas when temporada changes
  const loadDespesas = useCallback(async () => {
    if (!temporadaId) { setDespesas([]); return }
    setLoadingDespesas(true)
    const res = await fetch(`/api/despesas?temporada_id=${temporadaId}`)
    if (res.ok) setDespesas(await res.json())
    setLoadingDespesas(false)
  }, [temporadaId])

  useEffect(() => { loadDespesas() }, [loadDespesas])

  async function salvarDespesa() {
    if (!novaDespesa.descricao.trim() || !novaDespesa.valor || !temporadaId) return
    setSavingDespesa(true)
    const res = await fetch('/api/despesas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...novaDespesa, temporada_id: temporadaId, valor: Number(novaDespesa.valor) }),
    })
    if (res.ok) {
      toast('Despesa registrada.')
      setShowNovaDespesa(false)
      setNovaDespesa({ data: new Date().toISOString().split('T')[0], descricao: '', categoria: 'aluguel', valor: '', forma_pagamento: null, observacoes: '' })
      loadDespesas()
    } else {
      toast('Erro ao registrar despesa.', 'error')
    }
    setSavingDespesa(false)
  }

  async function deletarDespesa(id: string) {
    setDeletingDespesaId(id)
    const res = await fetch(`/api/despesas/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast('Despesa removida.')
      loadDespesas()
    } else {
      toast('Erro ao remover despesa.', 'error')
    }
    setDeletingDespesaId(null)
  }

  async function salvarMensalidade() {
    if (!temporadaId || !mesSelecionado) return
    setSalvandoMensalidade(true)
    const valor = mensalidadeInput ? Number(mensalidadeInput) : null
    const res = await fetch(
      `/api/temporadas/${temporadaId}/valores-mes?mes=${mesSelecionado.mes}&ano=${mesSelecionado.ano}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valor_mensalidade: valor }),
      }
    )
    if (res.ok) setValoresMes(await res.json())
    setSalvandoMensalidade(false)
    setEditandoMensalidade(false)
  }

  async function salvarValorDiarista() {
    if (!temporadaId || !mesSelecionado) return
    setSalvandoDiarista(true)
    const valor = diaristaInput ? Number(diaristaInput) : null
    const res = await fetch(
      `/api/temporadas/${temporadaId}/valores-mes?mes=${mesSelecionado.mes}&ano=${mesSelecionado.ano}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valor_diarista: valor }),
      }
    )
    if (res.ok) setValoresMes(await res.json())
    setSalvandoDiarista(false)
    setEditandoDiarista(false)
  }

  async function salvarPagamentoDiarista(partidaId: string, entry: DiaristaEntry) {
    const key = `${partidaId}:${entry.jogador_id}`
    setSavingDiaristaKey(prev => new Set(prev).add(key))
    let valorNum: number | null
    let pago: boolean
    if (editDiaristaForm.isento) {
      valorNum = 0
      pago = true
    } else {
      valorNum = editDiaristaForm.valor ? Number(editDiaristaForm.valor) : null
      pago = valorNum !== null && valorNum > 0
    }
    await fetch(`/api/partidas/${partidaId}/pagamentos-diaristas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jogador_id: entry.jogador_id,
        pago,
        valor_pago: valorNum,
        forma_pagamento: editDiaristaForm.isento ? null : editDiaristaForm.forma,
        data_pagamento: pago ? new Date().toISOString() : null,
        observacoes: editDiaristaForm.obs || null,
        isento: editDiaristaForm.isento,
      }),
    })
    setSavingDiaristaKey(prev => { const s = new Set(prev); s.delete(key); return s })
    setEditandoDiaristaId(null)
    toast('Pagamento salvo.')
    loadDiaristas()
  }

  function abrirEdicao(entry: PagamentoEntry) {
    setEditandoId(entry.jogador_id)
    setEditForm({
      valor: entry.valor_pago !== null ? String(entry.valor_pago) : (valorEsperado !== null ? String(valorEsperado) : ''),
      credito: entry.credito !== null ? String(entry.credito) : '',
      forma: entry.forma_pagamento,
      obs: entry.observacoes ?? '',
    })
  }

  function fecharEdicao() {
    setEditandoId(null)
    setEditForm({ valor: '', credito: '', forma: null, obs: '' })
  }

  // Financial summary calculations
  const totalRecebido = pagamentos.reduce((sum, e) => sum + (e.valor_pago ?? 0), 0)
  const totalEsperado = valorEsperado !== null ? pagamentos.length * valorEsperado : null
  const saldo = totalEsperado !== null ? totalRecebido - totalEsperado : null
  const totalCash = pagamentos.filter(e => e.forma_pagamento === 'CASH').reduce((s, e) => s + (e.valor_pago ?? 0), 0)
  const totalBizum = pagamentos.filter(e => e.forma_pagamento === 'BIZUM').reduce((s, e) => s + (e.valor_pago ?? 0), 0)
  const totalPix = pagamentos.filter(e => e.forma_pagamento === 'PIX').reduce((s, e) => s + (e.valor_pago ?? 0), 0)
  const pagosCount = pagamentos.filter(e => {
    if (e.pago) return true
    const total = (e.valor_pago ?? 0) + (e.credito ?? 0)
    return valorEsperado !== null ? total >= valorEsperado : false
  }).length
  const totalAtivos = pagamentos.length

  // Diaristas summary calculations
  const allDiaristas = diaristasPorPartida.flatMap(p => p.diaristas)
  const totalDiaristaRecebido = allDiaristas.reduce((sum, e) => sum + (e.valor_pago ?? 0), 0)
  const diaristasPageCount = allDiaristas.filter(e => e.pago).length
  const totalDiaristas = allDiaristas.length
  const totalDiaristaIsentos = allDiaristas.filter(e => e.isento).length
  const totalDiaristaEsperado = valorDiaristaEsperado !== null ? (totalDiaristas - totalDiaristaIsentos) * valorDiaristaEsperado : null
  const totalDiaristaCash = allDiaristas.filter(e => e.forma_pagamento === 'CASH').reduce((s, e) => s + (e.valor_pago ?? 0), 0)
  const totalDiaristaBizum = allDiaristas.filter(e => e.forma_pagamento === 'BIZUM').reduce((s, e) => s + (e.valor_pago ?? 0), 0)
  const totalDiaristaPix = allDiaristas.filter(e => e.forma_pagamento === 'PIX').reduce((s, e) => s + (e.valor_pago ?? 0), 0)
  // Combined totals
  const totalCombinadoRecebido = totalRecebido + totalDiaristaRecebido
  const totalCombinadoEsperado = totalEsperado !== null || totalDiaristaEsperado !== null
    ? (totalEsperado ?? 0) + (totalDiaristaEsperado ?? 0)
    : null

  // Despesas calculations
  const totalDespesas = despesas.reduce((sum, d) => sum + d.valor, 0)
  const saldoCaixa = totalCombinadoRecebido - totalDespesas

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
        {(['mensalistas', 'diaristas', 'despesas'] as Tab[]).map(t => (
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
      <div className="bg-white border border-[#e0e0e0] rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Temporada</label>
            <select
              value={temporadaId}
              onChange={e => setTemporadaId(e.target.value)}
              className="w-full bg-white border border-[#e0e0e0] rounded-lg px-3 py-2 text-gray-800 text-sm focus:outline-none focus:border-green-500 transition-colors"
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
              className="w-full bg-white border border-[#e0e0e0] rounded-lg px-3 py-2 text-gray-800 text-sm focus:outline-none focus:border-green-500 transition-colors disabled:opacity-40"
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

        {/* Monthly summary */}
        {temporadaId && mesSelecionado && (
          <div className="border-t border-gray-100 pt-3 space-y-2.5">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Resumo do mês</p>
            <div className="grid grid-cols-2 gap-2">
              {/* Mensalistas */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 font-medium mb-1.5">Mensalistas</p>
                <p className="text-base font-bold text-gray-800">{formatVal(totalRecebido)} €</p>
                <div className="mt-1 space-y-1">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{pagosCount}/{totalAtivos} pagos</span>
                    {totalEsperado !== null && <span>esp. {formatVal(totalEsperado)} €</span>}
                  </div>
                  {totalAtivos > 0 && (
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${pagosCount === totalAtivos ? 'bg-green-500' : 'bg-yellow-400'}`}
                        style={{ width: `${(pagosCount / totalAtivos) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
              {/* Diaristas */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 font-medium mb-1.5">Diaristas</p>
                <p className="text-base font-bold text-gray-800">{formatVal(totalDiaristaRecebido)} €</p>
                <div className="mt-1 space-y-1">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{diaristasPageCount}/{totalDiaristas} pagos</span>
                    {totalDiaristaEsperado !== null && <span>esp. {formatVal(totalDiaristaEsperado)} €</span>}
                  </div>
                  {totalDiaristas > 0 && (
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${diaristasPageCount === totalDiaristas ? 'bg-green-500' : 'bg-yellow-400'}`}
                        style={{ width: `${(diaristasPageCount / totalDiaristas) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Combined total */}
            <div className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2.5">
              <span className="text-xs text-green-700 font-medium">Total recebido</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-bold text-green-700">{formatVal(totalCombinadoRecebido)} €</span>
                {totalCombinadoEsperado !== null && (
                  <span className="text-xs text-green-600">/ {formatVal(totalCombinadoEsperado)} €</span>
                )}
              </div>
            </div>
            {/* Saldo do caixa */}
            {totalDespesas > 0 && (
              <div className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${saldoCaixa >= 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
                <div>
                  <span className={`text-xs font-medium ${saldoCaixa >= 0 ? 'text-blue-700' : 'text-red-600'}`}>Saldo do caixa</span>
                  <span className="text-xs text-gray-400 ml-1.5">({formatVal(totalDespesas)} € despesas)</span>
                </div>
                <span className={`text-sm font-bold ${saldoCaixa >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                  {saldoCaixa >= 0 ? '+' : ''}{formatVal(saldoCaixa)} €
                </span>
              </div>
            )}
            {/* Method breakdown combined */}
            {(totalCash + totalDiaristaCash > 0 || totalBizum + totalDiaristaBizum > 0 || totalPix + totalDiaristaPix > 0) && (
              <div className="flex flex-wrap gap-1.5">
                {totalCash + totalDiaristaCash > 0 && (
                  <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                    CASH: {formatVal(totalCash + totalDiaristaCash)} €
                  </span>
                )}
                {totalBizum + totalDiaristaBizum > 0 && (
                  <span className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full font-medium">
                    BIZUM: {formatVal(totalBizum + totalDiaristaBizum)} €
                  </span>
                )}
                {totalPix + totalDiaristaPix > 0 && (
                  <span className="text-xs bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full font-medium">
                    PIX: {formatVal(totalPix + totalDiaristaPix)} €
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Valor config per tab */}
        {temporadaId && mesSelecionado && tab === 'mensalistas' && (
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
                  className="w-20 bg-white border border-[#e0e0e0] rounded-lg px-2 py-1 text-gray-800 text-sm focus:outline-none focus:border-green-500"
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
                {valoresMes?.valor_mensalidade == null && valorEsperado !== null && (
                  <span className="text-xs text-gray-400 italic">(padrão temporada)</span>
                )}
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
        {temporadaId && mesSelecionado && tab === 'diaristas' && (
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
                  className="w-20 bg-white border border-[#e0e0e0] rounded-lg px-2 py-1 text-gray-800 text-sm focus:outline-none focus:border-green-500"
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
                {valoresMes?.valor_diarista == null && valorDiaristaEsperado !== null && (
                  <span className="text-xs text-gray-400 italic">(padrão temporada)</span>
                )}
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
        <div className="bg-white border border-[#e0e0e0] rounded-xl py-16 text-center text-gray-500 text-sm">
          Selecione uma temporada e um mês para ver os pagamentos.
        </div>
      ) : loading ? (
        <div className="bg-white border border-[#e0e0e0] rounded-xl py-16 text-center text-gray-500 text-sm">
          Carregando...
        </div>
      ) : pagamentos.length === 0 ? (
        <div className="bg-white border border-[#e0e0e0] rounded-xl py-16 text-center">
          <p className="text-gray-500 text-sm">Nenhum mensalista nesta temporada.</p>
          <p className="text-gray-400 text-xs mt-1">
            Adicione mensalistas em <span className="text-gray-500">Temporadas</span>.
          </p>
        </div>
      ) : (
        <>
          {/* Financial summary */}
          <div className="bg-white border border-[#e0e0e0] rounded-xl p-4 space-y-3">
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
          <div className="bg-white border border-[#e0e0e0] rounded-xl overflow-hidden">
            <div className="divide-y divide-gray-100">
              {pagamentos.map(entry => {
                const isSaving = saving.has(entry.jogador_id)
                const isEditing = editandoId === entry.jogador_id
                const status = getStatusInfo(entry, valorEsperado)
                const totalAbatido = (entry.valor_pago ?? 0) + (entry.credito ?? 0)
                const pendente = valorEsperado !== null ? valorEsperado - totalAbatido : null

                return (
                  <div key={entry.jogador_id}>
                    <div className="flex items-center justify-between px-4 py-3 gap-3">
                      {/* Name + meta */}
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-800 text-sm font-medium truncate">
                          {entry.jogador?.nome ?? '—'}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {entry.forma_pagamento && (
                            <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${getFormaStyle(entry.forma_pagamento)}`}>
                              {entry.forma_pagamento}
                            </span>
                          )}
                          {entry.credito !== null && entry.credito > 0 && (
                            <span className="text-xs text-indigo-600 font-medium">
                              crédito {formatVal(entry.credito)} €
                            </span>
                          )}
                          {entry.valor_pago !== null && (
                            <span className="text-xs text-gray-500">
                              {formatVal(entry.valor_pago)}{valorEsperado !== null ? ` / ${formatVal(valorEsperado)} €` : ' €'}
                            </span>
                          )}
                          {pendente !== null && pendente > 0 && (
                            <span className="text-xs font-semibold text-red-500">
                              pendente {formatVal(pendente)} €
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

                        {/* Crédito + Valor + Obs */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Crédito (€)</p>
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={editForm.credito}
                              onChange={e => setEditForm(prev => ({ ...prev, credito: e.target.value }))}
                              placeholder="0"
                              className="w-full bg-white border border-[#e0e0e0] rounded-lg px-3 py-1.5 text-gray-800 text-sm focus:outline-none focus:border-indigo-400"
                            />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Valor pago (€)</p>
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={editForm.valor}
                              onChange={e => setEditForm(prev => ({ ...prev, valor: e.target.value }))}
                              placeholder={valorEsperado !== null ? String(valorEsperado) : '0'}
                              className="w-full bg-white border border-[#e0e0e0] rounded-lg px-3 py-1.5 text-gray-800 text-sm focus:outline-none focus:border-green-500"
                            />
                          </div>
                          <div className="col-span-2 sm:col-span-1">
                            <p className="text-xs text-gray-500 mb-1">Observação</p>
                            <input
                              type="text"
                              value={editForm.obs}
                              onChange={e => setEditForm(prev => ({ ...prev, obs: e.target.value }))}
                              placeholder="opcional..."
                              className="w-full bg-white border border-[#e0e0e0] rounded-lg px-3 py-1.5 text-gray-800 text-sm focus:outline-none focus:border-green-500"
                            />
                          </div>
                        </div>

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
          <div className="bg-white border border-[#e0e0e0] rounded-xl py-16 text-center text-gray-500 text-sm">
            Selecione uma temporada e um mês para ver os pagamentos de diaristas.
          </div>
        ) : loadingDiaristas ? (
          <div className="bg-white border border-[#e0e0e0] rounded-xl py-16 text-center text-gray-500 text-sm">
            Carregando...
          </div>
        ) : diaristasPorPartida.length === 0 ? (
          <div className="bg-white border border-[#e0e0e0] rounded-xl py-16 text-center">
            <p className="text-gray-500 text-sm">Nenhuma partida com diaristas neste mês.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Filtro de partida */}
            {diaristasPorPartida.length > 1 && (
              <div className="bg-white border border-[#e0e0e0] rounded-xl px-4 py-3">
                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Filtrar partida</label>
                <select
                  value={partidaFiltroId}
                  onChange={e => setPartidaFiltroId(e.target.value)}
                  className="w-full bg-white border border-[#e0e0e0] rounded-lg px-3 py-2 text-gray-800 text-sm focus:outline-none focus:border-green-500 transition-colors"
                >
                  <option value="">Todas as partidas</option>
                  {diaristasPorPartida.map(({ partida, diaristas }) => {
                    const isPartidaPaga = diaristas.length > 0 && diaristas.every(d =>
                      d.pago || (d.valor_pago !== null && valorDiaristaEsperado !== null && d.valor_pago >= valorDiaristaEsperado)
                    )
                    return (
                      <option key={partida.id} value={partida.id}>
                        {format(parseISO(partida.data), "d 'de' MMMM", { locale: ptBR })}
                        {partida.local ? ` · ${partida.local}` : ''}
                        {' · '}
                        {isPartidaPaga ? '✓ Paga' : '⏳ Pendente'}
                      </option>
                    )
                  })}
                </select>
              </div>
            )}
            {(partidaFiltroId ? diaristasPorPartida.filter(p => p.partida.id === partidaFiltroId) : diaristasPorPartida).map(({ partida, diaristas }) => {
              const pagosNaPartida = diaristas.filter(d => d.pago).length
              const totalRecebidoPartida = diaristas.reduce((s, d) => s + (d.valor_pago ?? 0), 0)

              return (
                <div key={partida.id} className="bg-white border border-[#e0e0e0] rounded-xl overflow-hidden">
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
                      const diaristaStatus = (() => {
                        if (entry.isento && entry.pago) {
                          return { label: 'Isento', classes: 'bg-gray-100 text-gray-500 border-gray-200' }
                        }
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
                                {entry.forma_pagamento && (
                                  <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${getFormaStyle(entry.forma_pagamento)}`}>
                                    {entry.forma_pagamento}
                                  </span>
                                )}
                                {entry.valor_pago !== null && (
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
                                    isento: entry.isento,
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
                              {/* Isento checkbox */}
                              <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
                                <input
                                  type="checkbox"
                                  checked={editDiaristaForm.isento}
                                  onChange={e => setEditDiaristaForm(prev => ({ ...prev, isento: e.target.checked }))}
                                  className="w-4 h-4 rounded border-gray-300 accent-green-600"
                                />
                                <span className="text-xs text-gray-700 font-medium">Isento do pagamento</span>
                              </label>

                              {/* Payment fields — hidden when isento */}
                              {!editDiaristaForm.isento && (
                                <>
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
                                        className="w-full bg-white border border-[#e0e0e0] rounded-lg px-3 py-1.5 text-gray-800 text-sm focus:outline-none focus:border-green-500"
                                      />
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500 mb-1">Observação</p>
                                      <input
                                        type="text"
                                        value={editDiaristaForm.obs}
                                        onChange={e => setEditDiaristaForm(prev => ({ ...prev, obs: e.target.value }))}
                                        placeholder="opcional..."
                                        className="w-full bg-white border border-[#e0e0e0] rounded-lg px-3 py-1.5 text-gray-800 text-sm focus:outline-none focus:border-green-500"
                                      />
                                    </div>
                                  </div>
                                </>
                              )}

                              {/* Obs alone when isento */}
                              {editDiaristaForm.isento && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Observação</p>
                                  <input
                                    type="text"
                                    value={editDiaristaForm.obs}
                                    onChange={e => setEditDiaristaForm(prev => ({ ...prev, obs: e.target.value }))}
                                    placeholder="opcional..."
                                    className="w-full bg-white border border-[#e0e0e0] rounded-lg px-3 py-1.5 text-gray-800 text-sm focus:outline-none focus:border-green-500"
                                  />
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
      {/* Results — Despesas */}
      {tab === 'despesas' && (
        !temporadaId ? (
          <div className="bg-white border border-[#e0e0e0] rounded-xl py-16 text-center text-gray-500 text-sm">
            Selecione uma temporada para ver as despesas.
          </div>
        ) : (
          <div className="space-y-3">
            {/* Saldo do caixa card */}
            <div className="bg-white border border-[#e0e0e0] rounded-xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3">Saldo do caixa — {temporadaSelecionada?.nome}</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Entradas</p>
                  <p className="text-lg font-bold text-green-600">{formatVal(totalCombinadoRecebido)} €</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Saídas</p>
                  <p className="text-lg font-bold text-red-500">{formatVal(totalDespesas)} €</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Saldo</p>
                  <p className={`text-lg font-bold ${saldoCaixa >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                    {saldoCaixa >= 0 ? '+' : ''}{formatVal(saldoCaixa)} €
                  </p>
                </div>
              </div>
            </div>

            {/* Nova despesa button / form */}
            {!showNovaDespesa ? (
              <button
                onClick={() => setShowNovaDespesa(true)}
                className="w-full flex items-center justify-center gap-2 bg-white border border-dashed border-gray-300 hover:border-green-400 hover:bg-green-50 rounded-xl py-3 text-sm text-gray-500 hover:text-green-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeWidth={2.5} strokeLinecap="round" d="M12 5v14M5 12h14" />
                </svg>
                Registrar despesa
              </button>
            ) : (
              <div className="bg-white border border-[#e0e0e0] rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-700">Nova despesa</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Data</label>
                    <input
                      type="date"
                      value={novaDespesa.data}
                      onChange={e => setNovaDespesa(p => ({ ...p, data: e.target.value }))}
                      className="w-full bg-white border border-[#e0e0e0] rounded-lg px-3 py-2 text-gray-800 text-sm focus:outline-none focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Valor (€)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={novaDespesa.valor}
                      onChange={e => setNovaDespesa(p => ({ ...p, valor: e.target.value }))}
                      placeholder="0"
                      className="w-full bg-white border border-[#e0e0e0] rounded-lg px-3 py-2 text-gray-800 text-sm focus:outline-none focus:border-green-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Descrição</label>
                  <input
                    type="text"
                    value={novaDespesa.descricao}
                    onChange={e => setNovaDespesa(p => ({ ...p, descricao: e.target.value }))}
                    placeholder="ex: Aluguel campo 27/04"
                    className="w-full bg-white border border-[#e0e0e0] rounded-lg px-3 py-2 text-gray-800 text-sm focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Categoria</label>
                  <select
                    value={novaDespesa.categoria}
                    onChange={e => setNovaDespesa(p => ({ ...p, categoria: e.target.value as CategoriaDespesa }))}
                    className="w-full bg-white border border-[#e0e0e0] rounded-lg px-3 py-2 text-gray-800 text-sm focus:outline-none focus:border-green-500"
                  >
                    {CATEGORIAS_DESPESA.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Forma de pagamento</label>
                  <div className="flex gap-1.5">
                    {FORMAS.map(f => (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => setNovaDespesa(p => ({ ...p, forma_pagamento: p.forma_pagamento === f.value ? null : f.value }))}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                          novaDespesa.forma_pagamento === f.value
                            ? f.color + ' ring-2 ring-offset-1 ring-current'
                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Observação</label>
                  <input
                    type="text"
                    value={novaDespesa.observacoes}
                    onChange={e => setNovaDespesa(p => ({ ...p, observacoes: e.target.value }))}
                    placeholder="opcional..."
                    className="w-full bg-white border border-[#e0e0e0] rounded-lg px-3 py-2 text-gray-800 text-sm focus:outline-none focus:border-green-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={salvarDespesa}
                    disabled={savingDespesa || !novaDespesa.descricao.trim() || !novaDespesa.valor}
                    className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                  >
                    {savingDespesa ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button
                    onClick={() => setShowNovaDespesa(false)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Despesas list */}
            {loadingDespesas ? (
              <div className="bg-white border border-[#e0e0e0] rounded-xl py-10 text-center text-gray-400 text-sm">Carregando...</div>
            ) : despesas.length === 0 ? (
              <div className="bg-white border border-[#e0e0e0] rounded-xl py-10 text-center text-gray-400 text-sm">
                Nenhuma despesa registrada nesta temporada.
              </div>
            ) : (
              <div className="bg-white border border-[#e0e0e0] rounded-xl overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {despesas.map(d => {
                    const catLabel = CATEGORIAS_DESPESA.find(c => c.value === d.categoria)?.label ?? d.categoria
                    return (
                      <div key={d.id} className="flex items-center justify-between px-4 py-3 gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-gray-800 text-sm font-medium truncate">{d.descricao}</p>
                            {d.forma_pagamento && (
                              <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${getFormaStyle(d.forma_pagamento)}`}>
                                {d.forma_pagamento}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs text-gray-400">
                              {format(parseISO(d.data), "d 'de' MMMM yyyy", { locale: ptBR })}
                            </span>
                            <span className="text-xs text-gray-400">·</span>
                            <span className="text-xs text-gray-400">{catLabel}</span>
                            {d.observacoes && (
                              <>
                                <span className="text-xs text-gray-400">·</span>
                                <span className="text-xs text-gray-400 italic truncate max-w-[140px]">{d.observacoes}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm font-bold text-red-500">−{formatVal(d.valor)} €</span>
                          <button
                            onClick={() => deletarDespesa(d.id)}
                            disabled={deletingDespesaId === d.id}
                            className="text-gray-300 hover:text-red-400 transition-colors p-1 rounded disabled:opacity-40"
                            title="Remover despesa"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      )}
    </div>
  )
}
