'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { PortalData, PortalPartida } from '@/app/api/public/portal/[id]/route'
import type { Partida } from '@/lib/supabase'
import { POSICAO_ABREV } from '@/lib/supabase'
import ClassificacaoTable from '@/components/temporadas/ClassificacaoTable'
import ArtilheirosTable from '@/components/temporadas/ArtilheirosTable'
import ConfrontosTab from '@/components/temporadas/ConfrontosTab'
import PartidasList from '@/components/temporadas/PartidasList'

type Aba = 'classificacao' | 'artilheiros' | 'confrontos' | 'partidas' | 'pagamentos'

const ABAS: { id: Aba; label: string }[] = [
  { id: 'classificacao', label: 'Classificação' },
  { id: 'artilheiros', label: 'Artilheiros' },
  { id: 'confrontos', label: 'Confrontos' },
  { id: 'partidas', label: 'Partidas' },
  { id: 'pagamentos', label: 'Pagamentos' },
]

// PortalPartida → Partida cast para PartidasList
function toPartida(p: PortalPartida): Partida {
  return {
    ...p,
    status: p.status as Partida['status'],
    hora: p.hora ?? '10:50',
    observacoes: null,
    numero_jogadores: null,
    votacao_enquete_id: null,
    temporada_id: null,
    criado_em: '',
    atualizado_em: '',
  }
}

export default function PortalJogador() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [data, setData] = useState<PortalData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [aba, setAba] = useState<Aba>('classificacao')

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
  const partidas = data.partidas.map(toPartida)

  return (
    <div className="min-h-screen bg-[#f4f6f9] pb-10">

      {/* Header verde */}
      <div className="bg-green-600 text-white px-4 pt-10 pb-5">
        <div className="max-w-2xl mx-auto">
          <p className="text-green-200 text-xs font-medium mb-1">Barcelombra Fútbol</p>
          {data.temporada && (
            <h1 className="text-white text-xl font-bold leading-tight">{data.temporada.nome}</h1>
          )}
          <div className="flex items-center gap-2 mt-2">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
              {data.jogador.nome.charAt(0).toUpperCase()}
            </div>
            <span className="text-green-100 text-sm font-medium">{data.jogador.nome}</span>
            <span className="text-green-300 text-xs">· {POSICAO_ABREV[data.jogador.posicao_principal as keyof typeof POSICAO_ABREV] ?? data.jogador.posicao_principal}</span>
          </div>
        </div>
      </div>

      {/* Próxima partida / votação — banner compacto */}
      {(data.proxima_partida || data.votacao) && (
        <div className="max-w-2xl mx-auto px-4 mt-3">
          {data.proxima_partida && (
            <div className="bg-white rounded-2xl border border-[#e0e0e0] p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Próxima partida</p>
                <p className="text-gray-800 font-semibold text-sm mt-0.5">
                  {format(parseISO(data.proxima_partida.data), "EEE, d 'de' MMM", { locale: ptBR })}
                  {data.proxima_partida.local && <span className="text-gray-400 font-normal"> · {data.proxima_partida.local}</span>}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {data.votacao && (
                  <a
                    href={`/enquete/${data.votacao.enquete_id}?token=${data.votacao.token}`}
                    className="text-xs font-semibold px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors"
                  >
                    Votar times
                  </a>
                )}
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  data.proxima_partida.convocado ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {data.proxima_partida.convocado ? 'Confirmado' : 'Não convocado'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Abas */}
      <div className="max-w-2xl mx-auto mt-4">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-0 px-4 border-b border-gray-200 min-w-max">
            {ABAS.map(a => {
              const showBadge = a.id === 'pagamentos' && pendentes.length > 0
              return (
                <button
                  key={a.id}
                  onClick={() => setAba(a.id)}
                  className={`relative px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    aba === a.id
                      ? 'border-green-600 text-green-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {a.label}
                  {showBadge && (
                    <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-xs font-bold bg-red-500 text-white rounded-full">
                      {pendentes.length}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Conteúdo das abas */}
        <div className="px-4 mt-4">

          {aba === 'classificacao' && (
            <ClassificacaoTable
              entries={data.classificacao}
              temporadaId=""
              onSelectJogador={() => {}}
            />
          )}

          {aba === 'artilheiros' && (
            <div className="bg-white rounded-2xl border border-[#e0e0e0] overflow-hidden">
              <ArtilheirosTable entries={data.classificacao} />
            </div>
          )}

          {aba === 'confrontos' && (
            <div className="bg-white rounded-2xl border border-[#e0e0e0] overflow-hidden">
              <ConfrontosTab data={data.confrontos} />
            </div>
          )}

          {aba === 'partidas' && (
            <PartidasList partidas={partidas} hideDetailLink />
          )}

          {aba === 'pagamentos' && (
            <div className="bg-white rounded-2xl border border-[#e0e0e0] p-4">
              {data.pagamentos.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">Sem registros de pagamento.</p>
              ) : (
                <>
                  {pendentes.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">Pendentes</p>
                      <div className="space-y-2">
                        {pendentes.map((p, i) => (
                          <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${p.tipo === 'mensalista' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
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

                  {data.pagamentos.filter(p => p.pago).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">Pagos</p>
                      <div className="space-y-2">
                        {data.pagamentos.filter(p => p.pago).map((p, i) => (
                          <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${p.tipo === 'mensalista' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
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

                  {pendentes.length === 0 && (
                    <p className="text-green-600 text-sm font-medium text-center py-2">Tudo em dia! ✓</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <p className="text-center text-gray-400 text-xs mt-8">Barcelombra Fútbol · Portal do Jogador</p>
    </div>
  )
}
