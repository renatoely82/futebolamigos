'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, parseISO, eachMonthOfInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Temporada } from '@/lib/supabase'

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
}

interface MesOpcao {
  mes: number
  ano: number
  label: string
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
  const [temporadas, setTemporadas] = useState<Temporada[]>([])
  const [temporadaId, setTemporadaId] = useState('')
  const [mesSelecionado, setMesSelecionado] = useState<MesOpcao | null>(null)
  const [meses, setMeses] = useState<MesOpcao[]>([])
  const [pagamentos, setPagamentos] = useState<PagamentoEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [toggling, setToggling] = useState<Set<string>>(new Set())
  const [notasAberta, setNotasAberta] = useState<string | null>(null)
  const [notaTexto, setNotaTexto] = useState('')
  const [salvandoNota, setSalvandoNota] = useState(false)

  // Load temporadas on mount
  useEffect(() => {
    fetch('/api/temporadas')
      .then(r => r.json())
      .then((data: Temporada[]) => {
        setTemporadas(data)
        // Pre-select active season if exists
        const ativa = data.find(t => t.ativa)
        if (ativa) setTemporadaId(ativa.id)
      })
  }, [])

  // When temporada changes, update months list
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
    // Pre-select current month if in range, otherwise last month
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

  async function togglePagamento(entry: PagamentoEntry) {
    const key = entry.jogador_id
    setToggling(prev => new Set(prev).add(key))

    const novoPago = !entry.pago

    if (entry.pagamento_id) {
      await fetch(`/api/pagamentos/${entry.pagamento_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pago: novoPago,
          data_pagamento: novoPago ? new Date().toISOString().split('T')[0] : null,
          observacoes: entry.observacoes,
        }),
      })
    } else {
      await fetch('/api/pagamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          temporada_id: temporadaId,
          jogador_id: entry.jogador_id,
          mes: mesSelecionado!.mes,
          ano: mesSelecionado!.ano,
          pago: novoPago,
          data_pagamento: novoPago ? new Date().toISOString().split('T')[0] : null,
          observacoes: entry.observacoes,
        }),
      })
    }

    setToggling(prev => { const s = new Set(prev); s.delete(key); return s })
    loadPagamentos()
  }

  async function salvarNota(entry: PagamentoEntry) {
    setSalvandoNota(true)
    if (entry.pagamento_id) {
      await fetch(`/api/pagamentos/${entry.pagamento_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pago: entry.pago,
          data_pagamento: entry.data_pagamento,
          observacoes: notaTexto || null,
        }),
      })
    } else {
      await fetch('/api/pagamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          temporada_id: temporadaId,
          jogador_id: entry.jogador_id,
          mes: mesSelecionado!.mes,
          ano: mesSelecionado!.ano,
          pago: false,
          data_pagamento: null,
          observacoes: notaTexto || null,
        }),
      })
    }
    setSalvandoNota(false)
    setNotasAberta(null)
    setNotaTexto('')
    loadPagamentos()
  }

  const pagos = pagamentos.filter(p => p.pago).length
  const total = pagamentos.length

  const temporadaSelecionada = temporadas.find(t => t.id === temporadaId)

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-gray-800 text-2xl font-bold">Pagamentos</h1>
        <p className="text-gray-500 text-sm mt-1">Controlo mensal dos mensalistas por temporada</p>
      </div>

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
      </div>

      {/* Results */}
      {!temporadaId || !mesSelecionado ? (
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
        <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
          {/* Summary header */}
          <div className="px-5 py-4 border-b border-[#e9ecf1] flex items-center justify-between">
            <div>
              <p className="text-gray-800 font-semibold text-sm">
                {mesSelecionado.label.charAt(0).toUpperCase() + mesSelecionado.label.slice(1)}
                {temporadaSelecionada && (
                  <span className="text-gray-500 font-normal ml-2">— {temporadaSelecionada.nome}</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${pagos === total ? 'text-green-600' : pagos > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
                {pagos}/{total}
              </span>
              <span className="text-gray-500 text-xs">pagos</span>
              {/* Progress bar */}
              <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${pagos === total ? 'bg-green-500' : 'bg-yellow-500'}`}
                  style={{ width: total > 0 ? `${(pagos / total) * 100}%` : '0%' }}
                />
              </div>
            </div>
          </div>

          {/* Player list */}
          <div className="divide-y divide-gray-100">
            {pagamentos.map(entry => {
              const isToggling = toggling.has(entry.jogador_id)
              const isNotaOpen = notasAberta === entry.jogador_id

              return (
                <div key={entry.jogador_id}>
                  <div className="flex items-center justify-between px-5 py-3.5 gap-3">
                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-800 text-sm font-medium truncate">
                        {entry.jogador?.nome ?? '—'}
                      </p>
                      {entry.pago && entry.data_pagamento && (
                        <p className="text-gray-500 text-xs mt-0.5">
                          Pago em {format(parseISO(entry.data_pagamento), 'dd/MM/yyyy')}
                        </p>
                      )}
                      {entry.observacoes && (
                        <p className="text-gray-400 text-xs mt-0.5 truncate italic">{entry.observacoes}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Note button */}
                      <button
                        onClick={() => {
                          if (isNotaOpen) {
                            setNotasAberta(null)
                            setNotaTexto('')
                          } else {
                            setNotasAberta(entry.jogador_id)
                            setNotaTexto(entry.observacoes ?? '')
                          }
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          entry.observacoes
                            ? 'text-yellow-600 hover:bg-yellow-50'
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                        }`}
                        title="Nota"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>

                      {/* Toggle paid button */}
                      <button
                        onClick={() => togglePagamento(entry)}
                        disabled={isToggling}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                          entry.pago
                            ? 'bg-green-100 text-green-700 border border-green-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                            : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-green-50 hover:text-green-600 hover:border-green-200'
                        } ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {isToggling ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : entry.pago ? (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            Pago
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
                              <path strokeWidth={1.5} strokeLinecap="round" d="M12 8v4m0 4h.01" />
                            </svg>
                            Pendente
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Inline note editor */}
                  {isNotaOpen && (
                    <div className="px-5 pb-4 pt-0 bg-gray-50">
                      <textarea
                        value={notaTexto}
                        onChange={e => setNotaTexto(e.target.value)}
                        placeholder="Observação sobre este pagamento..."
                        rows={2}
                        className="w-full bg-white border border-[#d1d9e0] rounded-lg px-3 py-2 text-gray-800 text-sm placeholder-gray-400 focus:outline-none focus:border-green-500 resize-none transition-colors"
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => salvarNota(entry)}
                          disabled={salvandoNota}
                          className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
                        >
                          {salvandoNota ? 'Salvando...' : 'Guardar'}
                        </button>
                        <button
                          onClick={() => { setNotasAberta(null); setNotaTexto('') }}
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

          {/* Footer summary */}
          {pagos === total && total > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-green-50">
              <p className="text-green-600 text-sm text-center font-medium">
                Todos os mensalistas pagaram este mês!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
