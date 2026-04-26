'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import type { RelatorioFinanceiro } from '@/app/api/temporadas/[id]/relatorio-financeiro/route'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function ProgressBar({ value, max, color = 'bg-green-500' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`${color} h-full rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function RelatorioFinanceiroPage() {
  const { id } = useParams<{ id: string }>()
  const [relatorio, setRelatorio] = useState<RelatorioFinanceiro | null>(null)
  const [loading, setLoading] = useState(true)
  const [temporadaNome, setTemporadaNome] = useState('')

  useEffect(() => {
    Promise.all([
      fetch(`/api/temporadas/${id}/relatorio-financeiro`).then(r => r.json()),
      fetch(`/api/temporadas/${id}`).then(r => r.json()),
    ]).then(([rel, temp]) => {
      setRelatorio(rel)
      setTemporadaNome(temp?.nome ?? '')
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-48" />
        <div className="h-7 bg-gray-200 rounded w-64 mt-2" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-xl h-24" />
          ))}
        </div>
        <div className="h-48 bg-gray-100 rounded-xl" />
        <div className="h-64 bg-gray-100 rounded-xl" />
      </div>
    )
  }

  if (!relatorio) {
    return (
      <div className="p-6 text-center py-20">
        <p className="text-gray-500">Erro ao carregar relatório.</p>
        <Link href={`/temporadas/${id}`} className="mt-4 inline-block text-green-600 text-sm">Voltar</Link>
      </div>
    )
  }

  const { mensalistas, diaristas, porForma, porMes, pendentes } = relatorio

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div>
        <Breadcrumbs items={[
          { label: 'Temporadas', href: '/temporadas' },
          { label: temporadaNome, href: `/temporadas/${id}` },
          { label: 'Relatório Financeiro' },
        ]} />
        <h1 className="text-gray-800 text-2xl font-bold mt-1">Relatório Financeiro</h1>
        {temporadaNome && <p className="text-gray-500 text-sm mt-0.5">{temporadaNome}</p>}
      </div>

      {/* Top 4 summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-4">
          <p className="text-xs text-green-600 font-medium uppercase tracking-wide">Arrecadado</p>
          <p className="text-2xl font-bold text-green-700 mt-1">€{fmt(relatorio.totalRecebido)}</p>
        </div>
        <div className="bg-white border border-[#e0e0e0] rounded-xl px-4 py-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Esperado</p>
          <p className="text-2xl font-bold text-gray-700 mt-1">€{fmt(relatorio.totalEsperado)}</p>
        </div>
        <div className={`rounded-xl px-4 py-4 border ${relatorio.totalPendente > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
          <p className={`text-xs font-medium uppercase tracking-wide ${relatorio.totalPendente > 0 ? 'text-red-500' : 'text-gray-400'}`}>Pendente</p>
          <p className={`text-2xl font-bold mt-1 ${relatorio.totalPendente > 0 ? 'text-red-600' : 'text-gray-400'}`}>
            €{fmt(relatorio.totalPendente)}
          </p>
        </div>
        <div className="bg-white border border-[#e0e0e0] rounded-xl px-4 py-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Taxa de Pagamento</p>
          <p className="text-2xl font-bold text-gray-700 mt-1">{relatorio.taxaPagamento}%</p>
          <ProgressBar value={relatorio.totalRecebido} max={relatorio.totalEsperado} />
        </div>
      </div>

      {/* Mensalistas vs Diaristas */}
      <div className="grid sm:grid-cols-2 gap-3">
        {/* Mensalistas */}
        <div className="bg-white border border-[#e0e0e0] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <span className="text-sm font-semibold text-gray-700">Mensalistas</span>
          </div>
          <div className="px-4 py-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Arrecadado</span>
              <span className="font-semibold text-green-700">€{fmt(mensalistas.recebido)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Esperado</span>
              <span className="font-medium text-gray-700">€{fmt(mensalistas.esperado)}</span>
            </div>
            <ProgressBar value={mensalistas.recebido} max={mensalistas.esperado} />
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Pendente</span>
              <span className={`font-medium ${mensalistas.pendente > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                €{fmt(mensalistas.pendente)}
              </span>
            </div>
            <div className="pt-1 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                {mensalistas.nPagos} de {mensalistas.nTotal} cotas pagas
              </p>
            </div>
          </div>
        </div>

        {/* Diaristas */}
        <div className="bg-white border border-[#e0e0e0] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <span className="text-sm font-semibold text-gray-700">Diaristas</span>
          </div>
          <div className="px-4 py-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Arrecadado</span>
              <span className="font-semibold text-green-700">€{fmt(diaristas.recebido)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Esperado</span>
              <span className="font-medium text-gray-700">€{fmt(diaristas.esperado)}</span>
            </div>
            <ProgressBar value={diaristas.recebido} max={diaristas.esperado} />
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Pendente</span>
              <span className={`font-medium ${diaristas.pendente > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                €{fmt(diaristas.pendente)}
              </span>
            </div>
            <div className="pt-1 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                {diaristas.nPagos} de {diaristas.nTotal} pagos · {diaristas.nIsentos} isento{diaristas.nIsentos !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Forma de pagamento */}
      {(porForma.CASH + porForma.BIZUM + porForma.PIX + porForma.sem_forma) > 0 && (
        <div className="bg-white border border-[#e0e0e0] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <span className="text-sm font-semibold text-gray-700">Forma de Pagamento</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100">
            {([
              { label: 'Dinheiro', key: 'CASH', icon: '💵' },
              { label: 'Bizum', key: 'BIZUM', icon: '📱' },
              { label: 'Pix', key: 'PIX', icon: '⚡' },
              { label: 'Não registrado', key: 'sem_forma', icon: '—' },
            ] as const).map(({ label, key, icon }) => (
              <div key={key} className="px-4 py-4 text-center">
                <p className="text-lg mb-0.5">{icon}</p>
                <p className="text-xs text-gray-400 font-medium">{label}</p>
                <p className="text-base font-bold text-gray-700 mt-1">€{fmt(porForma[key])}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Month-by-month table */}
      {porMes.length > 0 && (
        <div className="bg-white border border-[#e0e0e0] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <span className="text-sm font-semibold text-gray-700">Por Mês</span>
          </div>

          {/* Desktop */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  <th className="text-left px-4 py-2.5">Mês</th>
                  <th className="text-right px-3 py-2.5">Mensalistas</th>
                  <th className="text-right px-3 py-2.5">Diaristas</th>
                  <th className="text-right px-4 py-2.5">Total</th>
                  <th className="px-4 py-2.5 w-28"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {porMes.map(m => (
                  <tr key={`${m.ano}-${m.mes}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-700">{m.label}</td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-green-600 font-medium">€{fmt(m.mensalistasRecebido)}</span>
                      {m.mensalistasEsperado > 0 && (
                        <span className="text-gray-400 text-xs ml-1">/ €{fmt(m.mensalistasEsperado)}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-green-600 font-medium">€{fmt(m.diaristasRecebido)}</span>
                      {m.diaristasEsperado > 0 && (
                        <span className="text-gray-400 text-xs ml-1">/ €{fmt(m.diaristasEsperado)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-800">€{fmt(m.totalRecebido)}</td>
                    <td className="px-4 py-3">
                      <ProgressBar value={m.totalRecebido} max={m.totalEsperado} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold text-sm">
                  <td className="px-4 py-3 text-gray-700">Total</td>
                  <td className="px-3 py-3 text-right text-green-600">€{fmt(mensalistas.recebido)}</td>
                  <td className="px-3 py-3 text-right text-green-600">€{fmt(diaristas.recebido)}</td>
                  <td className="px-4 py-3 text-right text-gray-800">€{fmt(relatorio.totalRecebido)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-gray-100">
            {porMes.map(m => {
              const pct = m.totalEsperado > 0 ? Math.round((m.totalRecebido / m.totalEsperado) * 100) : 0
              return (
                <div key={`${m.ano}-${m.mes}`} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-700 text-sm">{m.label}</span>
                    <span className="text-xs text-gray-400">{pct}%</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                    <span>Mensalistas: <span className="text-gray-700 font-medium">€{fmt(m.mensalistasRecebido)}</span></span>
                    <span>Diaristas: <span className="text-gray-700 font-medium">€{fmt(m.diaristasRecebido)}</span></span>
                  </div>
                  <ProgressBar value={m.totalRecebido} max={m.totalEsperado} />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Pendentes por jogador */}
      {pendentes.length > 0 && (
        <div className="bg-white border border-[#e0e0e0] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Pendentes por Jogador</span>
            <span className="text-xs text-gray-400">{pendentes.length} jogador{pendentes.length !== 1 ? 'es' : ''}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {pendentes.map(p => (
              <div key={p.jogador_id} className="flex items-center justify-between px-4 py-3 gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{p.nome}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {p.pendenteMensalista > 0 && (
                      <span className="text-xs text-gray-400">
                        Mensalista: <span className="text-gray-600">€{fmt(p.pendenteMensalista)}</span>
                      </span>
                    )}
                    {p.pendenteDiarista > 0 && (
                      <span className="text-xs text-gray-400">
                        Diarista: <span className="text-gray-600">€{fmt(p.pendenteDiarista)}</span>
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-sm font-bold text-red-500 shrink-0">€{fmt(p.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendentes.length === 0 && relatorio.totalEsperado > 0 && (
        <div className="text-center py-8">
          <p className="text-2xl mb-2">✅</p>
          <p className="text-gray-500 text-sm font-medium">Sem pendências! Todos os pagamentos em dia.</p>
        </div>
      )}
    </div>
  )
}
