'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { PortalData } from '@/app/api/public/portal/[id]/route'

const RESULTADO_COLOR = { V: 'bg-green-500', E: 'bg-yellow-400', D: 'bg-red-500' }

export default function PortalJogador() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [data, setData] = useState<PortalData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) { setError('Link inválido.'); setLoading(false); return }
    fetch(`/api/public/portal/${id}?token=${token}`)
      .then(async r => {
        if (!r.ok) { setError('Link inválido ou expirado.'); return }
        setData(await r.json())
      })
      .catch(() => setError('Erro ao carregar. Tente novamente.'))
      .finally(() => setLoading(false))
  }, [id, token])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f6f9] flex items-center justify-center">
        <div className="text-gray-400 text-sm">Carregando...</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#f4f6f9] flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-xs w-full">
          <p className="text-red-600 font-semibold">Link inválido</p>
          <p className="text-red-500 text-sm mt-1">{error || 'Não foi possível carregar os dados.'}</p>
        </div>
      </div>
    )
  }

  const pendentes = data.pagamentos.filter(p => !p.pago)
  const pagos = data.pagamentos.filter(p => p.pago)

  return (
    <div className="min-h-screen bg-[#f4f6f9] pb-10">
      {/* Header */}
      <div className="bg-green-600 text-white px-4 pt-10 pb-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
              {data.jogador.nome.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-green-100 text-xs font-medium">Barcelombra Fútbol</p>
              <h1 className="text-white text-xl font-bold leading-tight">{data.jogador.nome}</h1>
              <p className="text-green-200 text-xs">{data.jogador.posicao_principal}</p>
            </div>
          </div>
          {data.temporada && (
            <p className="text-green-200 text-xs mt-3">{data.temporada.nome}</p>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-4 space-y-4">

        {/* Próxima partida */}
        {data.proxima_partida ? (
          <div className="bg-white rounded-2xl border border-[#e0e0e0] p-4">
            <h2 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">Próxima Partida</h2>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-gray-800 font-semibold text-base">
                  {format(parseISO(data.proxima_partida.data), "EEEE, d 'de' MMMM", { locale: ptBR })}
                </p>
                {data.proxima_partida.local && (
                  <p className="text-gray-500 text-sm mt-0.5">{data.proxima_partida.local}</p>
                )}
              </div>
              <span className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full ${
                data.proxima_partida.convocado
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {data.proxima_partida.convocado ? 'Confirmado' : 'Não convocado'}
              </span>
            </div>

            {/* Votação */}
            {data.votacao && (
              <a
                href={`/enquete/${data.votacao.enquete_id}?token=${data.votacao.token}`}
                className="mt-3 flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Votar nos times
              </a>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#e0e0e0] p-4">
            <h2 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Próxima Partida</h2>
            <p className="text-gray-400 text-sm">Nenhuma partida agendada.</p>
          </div>
        )}

        {/* Classificação */}
        {data.classificacao ? (
          <div className="bg-white rounded-2xl border border-[#e0e0e0] p-4">
            <h2 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">Minha Classificação</h2>

            <div className="flex items-center gap-4 mb-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-800">{data.classificacao.posicao}º</p>
                <p className="text-xs text-gray-400">Posição</p>
              </div>
              <div className="flex-1 grid grid-cols-4 gap-2">
                {[
                  { label: 'Pts', value: data.classificacao.pontos, color: 'text-green-600' },
                  { label: 'J', value: data.classificacao.jogos, color: 'text-gray-800' },
                  { label: 'V', value: data.classificacao.vitorias, color: 'text-green-600' },
                  { label: 'E', value: data.classificacao.empates, color: 'text-yellow-600' },
                ].map(s => (
                  <div key={s.label} className="text-center bg-gray-50 rounded-xl py-2">
                    <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-400">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                {data.classificacao.aproveitamento}% aproveitamento · {data.classificacao.gols} gol{data.classificacao.gols !== 1 ? 's' : ''}
              </div>
              {data.classificacao.ultimos5.length > 0 && (
                <div className="flex gap-1">
                  {data.classificacao.ultimos5.map((r, i) => (
                    <span
                      key={i}
                      className={`w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center ${RESULTADO_COLOR[r]}`}
                    >
                      {r}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : data.temporada ? (
          <div className="bg-white rounded-2xl border border-[#e0e0e0] p-4">
            <h2 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Classificação</h2>
            <p className="text-gray-400 text-sm">Ainda sem jogos registrados.</p>
          </div>
        ) : null}

        {/* Pagamentos */}
        {data.pagamentos.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#e0e0e0] p-4">
            <h2 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">Meus Pagamentos</h2>

            {pendentes.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-red-500 mb-2">Pendentes ({pendentes.length})</p>
                <div className="space-y-2">
                  {pendentes.map((p, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <span className={`text-xs px-2 py-0.5 rounded-full mr-2 ${p.tipo === 'mensalista' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                          {p.tipo === 'mensalista' ? 'Mensalidade' : 'Diarista'}
                        </span>
                        <span className="text-sm text-gray-700">{p.descricao}</span>
                      </div>
                      <span className="text-xs font-semibold text-red-500">Pendente</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pagos.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-green-600 mb-2">Pagos ({pagos.length})</p>
                <div className="space-y-2">
                  {pagos.map((p, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <span className={`text-xs px-2 py-0.5 rounded-full mr-2 ${p.tipo === 'mensalista' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                          {p.tipo === 'mensalista' ? 'Mensalidade' : 'Diarista'}
                        </span>
                        <span className="text-sm text-gray-700">{p.descricao}</span>
                      </div>
                      <span className="text-xs font-semibold text-green-600">✓ Pago</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pendentes.length === 0 && pagos.length > 0 && (
              <p className="text-green-600 text-sm font-medium mt-2">Tudo em dia! ✓</p>
            )}
          </div>
        )}

        <p className="text-center text-gray-400 text-xs pb-2">Barcelombra Fútbol · Portal do Jogador</p>
      </div>
    </div>
  )
}
