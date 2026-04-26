'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { PortalData, PortalPartida } from '@/app/api/public/portal/[id]/route'
import ClassificacaoTable from '@/components/temporadas/ClassificacaoTable'
import ArtilheirosTable from '@/components/temporadas/ArtilheirosTable'
import ConfrontosTab from '@/components/temporadas/ConfrontosTab'
import PortalPartidasTab from '@/components/portal/PortalPartidasTab'
import PortalJogadorModal from '@/components/portal/PortalJogadorModal'

type Aba = 'classificacao' | 'artilheiros' | 'confrontos' | 'partidas' | 'pagamentos'

const ABAS: { id: Aba; label: string }[] = [
  { id: 'classificacao', label: 'Classificação' },
  { id: 'artilheiros', label: 'Artilheiros' },
  { id: 'confrontos', label: 'Confrontos' },
  { id: 'partidas', label: 'Partidas' },
  { id: 'pagamentos', label: 'Pagamentos' },
]


export default function PortalPage() {
  const router = useRouter()
  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [aba, setAba] = useState<Aba>('classificacao')
  const [selectedJogadorId, setSelectedJogadorId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/me/portal')
      .then(async r => {
        if (r.status === 401 || r.status === 403) { router.push('/login'); return }
        if (!r.ok) return
        setData(await r.json())
      })
      .finally(() => setLoading(false))
  }, [router])

  async function handleLogout() {
    await createClient().auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f6f9] flex items-center justify-center">
        <div className="text-gray-400 text-sm">Carregando...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#f4f6f9] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-500 text-sm">Erro ao carregar dados.</p>
          <button onClick={handleLogout} className="mt-4 text-sm text-green-600 hover:underline">
            Sair
          </button>
        </div>
      </div>
    )
  }

  const pendentes = data.pagamentos.filter(p => !p.pago)

  return (
    <div className="min-h-screen bg-[#f4f6f9] pb-10">

      {/* Header verde */}
      <div className="bg-green-600 text-white px-4 pt-10 pb-5">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-200 text-xs font-medium mb-1">Barcelombra Fútbol</p>
              {data.temporada && (
                <h1 className="text-white text-xl font-bold leading-tight">{data.temporada.nome}</h1>
              )}
              <div className="flex items-center gap-2 mt-2">
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                  {data.jogador.nome.charAt(0).toUpperCase()}
                </div>
                <span className="text-green-100 text-sm font-medium">{data.jogador.nome}</span>
                <span className="text-green-300 text-xs">· {data.jogador.posicao_principal}</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-green-200 hover:text-white transition-colors"
              title="Sair"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Banner próxima partida / votação */}
      {data.proxima_partida && (
        <div className="max-w-5xl mx-auto px-4 mt-3">
          <div className="bg-white rounded-2xl border border-[#e0e0e0] p-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Próxima partida</p>
              <p className="text-gray-800 font-semibold text-sm mt-0.5">
                {format(parseISO(data.proxima_partida.data), "EEE, d 'de' MMM", { locale: ptBR })}
                {data.proxima_partida.local && (
                  <span className="text-gray-400 font-normal"> · {data.proxima_partida.local}</span>
                )}
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
        </div>
      )}

      {/* Abas */}
      <div className="max-w-5xl mx-auto mt-4">
        <div className="overflow-x-auto">
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

        <div className="px-4 mt-4">
          {aba === 'classificacao' && (
            <ClassificacaoTable entries={data.classificacao} temporadaId="" onSelectJogador={setSelectedJogadorId} />
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
            <PortalPartidasTab partidas={data.partidas} />
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

      {selectedJogadorId && (() => {
        const entry = data.classificacao.find(e => e.jogador_id === selectedJogadorId)
        return entry ? (
          <PortalJogadorModal entry={entry} onClose={() => setSelectedJogadorId(null)} />
        ) : null
      })()}
    </div>
  )
}
