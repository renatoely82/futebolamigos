'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type Opcao = { id: string; texto: string; ordem: number }
type Token = { jogador_id: string; token: string; usado: boolean; jogadores: { nome: string } | null }
type Resultado = { id: string; texto: string; votos: number; votantes: string[] }
type Enquete = {
  id: string; titulo: string; descricao: string | null; ativa: boolean;
  mostrar_resultados: boolean; criado_em: string;
  enquete_opcoes: Opcao[]
  enquete_tokens: Token[]
}
type ResultadoData = { contagem: Resultado[]; totalVotos: number; totalInscritos: number }

export default function EnqueteAdminPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [enquete, setEnquete] = useState<Enquete | null>(null)
  const [resultados, setResultados] = useState<ResultadoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [togglingAtiva, setTogglingAtiva] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const load = useCallback(async () => {
    const [eRes, rRes] = await Promise.all([
      fetch(`/api/enquetes`),
      fetch(`/api/enquetes/${id}/resultados`),
    ])
    if (eRes.ok) {
      const all = await eRes.json()
      setEnquete(all.find((e: Enquete) => e.id === id) ?? null)
    }
    if (rRes.ok) setResultados(await rRes.json())
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function toggleAtiva() {
    if (!enquete) return
    setTogglingAtiva(true)
    await fetch(`/api/enquetes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativa: !enquete.ativa, mostrar_resultados: enquete.mostrar_resultados }),
    })
    setEnquete(e => e ? { ...e, ativa: !e.ativa } : e)
    setTogglingAtiva(false)
  }

  async function handleDelete() {
    if (!confirm('Deletar esta enquete? Os votos serão perdidos.')) return
    setDeleting(true)
    await fetch(`/api/enquetes/${id}`, { method: 'DELETE' })
    router.push('/enquetes')
  }

  function copyLink(token: string) {
    const url = `${baseUrl}/enquete/${id}?token=${token}`
    navigator.clipboard.writeText(url)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  function shareWhatsApp(nome: string, token: string) {
    const url = `${baseUrl}/enquete/${id}?token=${token}`
    const msg = `⚽ *Futebol Amigos* — Vote na enquete!\n\n*${enquete?.titulo}*\n\n${url}`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  if (loading) return <div className="p-6 text-gray-500">Carregando...</div>
  if (!enquete) return <div className="p-6 text-gray-500">Enquete não encontrada.</div>

  const maxVotos = Math.max(...(resultados?.contagem.map(r => r.votos) ?? [0]), 1)

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="flex items-start gap-3 mb-6">
        <Link href="/enquetes" className="text-gray-400 hover:text-gray-700 transition-colors mt-1">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m7-7-7 7 7 7" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-gray-800 text-xl font-bold">{enquete.titulo}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${enquete.ativa ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
              {enquete.ativa ? 'Aberta' : 'Encerrada'}
            </span>
          </div>
          {enquete.descricao && <p className="text-gray-500 text-sm mt-1">{enquete.descricao}</p>}
          <p className="text-gray-400 text-xs mt-1">
            Criada em {format(parseISO(enquete.criado_em), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={toggleAtiva}
            disabled={togglingAtiva}
            className="text-sm px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50 text-gray-600"
          >
            {enquete.ativa ? 'Encerrar' : 'Reabrir'}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm px-3 py-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 transition-colors disabled:opacity-50"
          >
            Deletar
          </button>
        </div>
      </div>

      {/* Results */}
      {resultados && (
        <div className="bg-white border border-[#e0e0e0] rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700">Resultados</h2>
            <span className="text-sm text-gray-500">{resultados.totalVotos} de {resultados.totalInscritos} votos</span>
          </div>
          <div className="space-y-3">
            {resultados.contagem.map(op => (
              <div key={op.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 font-medium">{op.texto}</span>
                  <span className="text-gray-500">{op.votos} {op.votos === 1 ? 'voto' : 'votos'}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-400 rounded-full transition-all"
                    style={{ width: `${resultados.totalVotos ? (op.votos / maxVotos) * 100 : 0}%` }}
                  />
                </div>
                {op.votantes.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">{op.votantes.join(', ')}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Links por jogador */}
      <div className="bg-white border border-[#e0e0e0] rounded-xl p-4">
        <h2 className="font-semibold text-gray-700 mb-3">Links de votação</h2>
        <div className="space-y-2">
          {enquete.enquete_tokens
            .sort((a, b) => (a.jogadores?.nome ?? '').localeCompare(b.jogadores?.nome ?? ''))
            .map(t => (
              <div key={t.token} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{t.jogadores?.nome ?? 'Jogador'}</p>
                  <p className={`text-xs ${t.usado ? 'text-green-600' : 'text-gray-400'}`}>
                    {t.usado ? 'Já votou' : 'Pendente'}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => copyLink(t.token)}
                    title="Copiar link"
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    {copied === t.token ? (
                      <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => shareWhatsApp(t.jogadores?.nome ?? '', t.token)}
                    title="Enviar pelo WhatsApp"
                    className="p-2 rounded-lg text-[#25D366] hover:bg-[#25D366]/10 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
