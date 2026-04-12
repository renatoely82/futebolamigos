'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Partida, Jogador, PartidaJogadorComDetalhes, Temporada } from '@/lib/supabase'
import JogadoresPartida from '@/components/partidas/JogadoresPartida'
import ResultadoPartida from '@/components/partidas/ResultadoPartida'
import Modal from '@/components/ui/Modal'
import { StatusBadge, PositionBadge } from '@/components/ui/Badge'
import { sortByPosition } from '@/lib/team-balancer'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function PartidaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [partida, setPartida] = useState<Partida | null>(null)
  const [players, setPlayers] = useState<PartidaJogadorComDetalhes[]>([])
  const [allPlayers, setAllPlayers] = useState<Jogador[]>([])
  const [temporadas, setTemporadas] = useState<Temporada[]>([])
  const [loading, setLoading] = useState(true)
  const [statusSaving, setStatusSaving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editingTemporada, setEditingTemporada] = useState(false)
  const [temporadaSaving, setTemporadaSaving] = useState(false)

  const loadPartida = useCallback(async () => {
    const [pRes, pjRes, apRes, tRes] = await Promise.all([
      fetch(`/api/partidas/${id}`),
      fetch(`/api/partidas/${id}/jogadores`),
      fetch('/api/jogadores'),
      fetch('/api/temporadas'),
    ])
    if (pRes.ok) setPartida(await pRes.json())
    if (pjRes.ok) setPlayers(await pjRes.json())
    if (apRes.ok) setAllPlayers(await apRes.json())
    if (tRes.ok) setTemporadas(await tRes.json())
    setLoading(false)
  }, [id])

  useEffect(() => { loadPartida() }, [loadPartida])

  async function handleStatusChange(newStatus: string) {
    setStatusSaving(true)
    await fetch(`/api/partidas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    setPartida(p => p ? { ...p, status: newStatus as Partida['status'] } : p)
    setStatusSaving(false)
  }

  async function handleTemporadaChange(temporadaId: string) {
    setTemporadaSaving(true)
    await fetch(`/api/partidas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ temporada_id: temporadaId || null }),
    })
    setPartida(p => p ? { ...p, temporada_id: temporadaId || null } : p)
    setTemporadaSaving(false)
    setEditingTemporada(false)
  }

  async function handleDelete() {
    setDeleting(true)
    const res = await fetch(`/api/partidas/${id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/partidas')
    } else {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  // WhatsApp share
  function handleShare() {
    if (!partida) return
    const dateStr = format(parseISO(partida.data), "EEEE, d 'de' MMMM", { locale: ptBR })
    const playerList = players.map(p => `• ${p.jogador.nome}`).join('\n')
    const msg = `⚽ *Futebol Amigos*\n📅 ${dateStr}${partida.local ? `\n📍 ${partida.local}` : ''}\n\n*Convocados (${players.length}):*\n${playerList}`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  if (loading) return <div className="p-6 text-gray-500">Carregando...</div>
  if (!partida) return <div className="p-6 text-gray-500">Partida não encontrada.</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <Link href="/partidas" className="text-gray-400 hover:text-white transition-colors mt-1">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m7-7-7 7 7 7" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-white text-2xl font-bold">
              {format(parseISO(partida.data), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </h1>
            <StatusBadge status={partida.status} />
          </div>
          {partida.local && <p className="text-gray-500 text-sm mt-1">{partida.local}</p>}
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            title="Excluir partida"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Excluir
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            title="Compartilhar no WhatsApp"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Convocar
          </button>
          <Link
            href={`/partidas/${id}/times`}
            className="flex items-center gap-2 bg-lime-500 hover:bg-lime-400 text-black px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            Ver Times
          </Link>
        </div>
      </div>

      {/* Status selector */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-gray-400 text-sm">Status:</span>
          {(['agendada', 'realizada', 'cancelada'] as const).map(s => (
            <button
              key={s}
              disabled={statusSaving}
              onClick={() => handleStatusChange(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                partida.status === s
                  ? 'bg-lime-500 text-black'
                  : 'bg-[#222] text-gray-400 hover:bg-[#333] hover:text-white'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Temporada */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-sm shrink-0">Temporada:</span>
          {editingTemporada ? (
            <div className="flex items-center gap-2 flex-1">
              <select
                autoFocus
                disabled={temporadaSaving}
                defaultValue={partida.temporada_id ?? ''}
                onChange={e => handleTemporadaChange(e.target.value)}
                className="flex-1 bg-[#222] border border-[#333] text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-lime-500 disabled:opacity-50"
              >
                <option value="">Sem temporada</option>
                {temporadas.map(t => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
              <button
                onClick={() => setEditingTemporada(false)}
                className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <>
              {partida.temporada_id ? (
                <span className="text-white text-sm font-medium">
                  {temporadas.find(t => t.id === partida.temporada_id)?.nome ?? '—'}
                </span>
              ) : (
                <span className="text-gray-600 text-sm italic">Não vinculada</span>
              )}
              <button
                onClick={() => setEditingTemporada(true)}
                className="ml-auto text-gray-500 hover:text-lime-400 text-sm transition-colors"
              >
                {partida.temporada_id ? 'Alterar' : 'Vincular'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Times definidos */}
      {partida.times_escolhidos && (
        <div className="bg-[#1a1a1a] border border-lime-500/30 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Times Definidos</h2>
            {partida.status !== 'realizada' && (
              <Link
                href={`/partidas/${id}/times`}
                className="text-lime-400 text-sm hover:text-lime-300 transition-colors"
              >
                Alterar →
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-lime-400 font-semibold text-sm mb-2">{partida.nome_time_a}</h3>
              <div className="space-y-1.5">
                {sortByPosition(
                  partida.times_escolhidos.time_a
                    .map(id => players.find(p => p.jogador_id === id)?.jogador)
                    .filter(Boolean) as import('@/lib/supabase').Jogador[]
                ).map(jogador => (
                  <div key={jogador.id} className="flex items-center gap-2">
                    <PositionBadge posicao={jogador.posicao_principal} />
                    <span className="text-white text-sm">{jogador.nome}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-blue-400 font-semibold text-sm mb-2">{partida.nome_time_b}</h3>
              <div className="space-y-1.5">
                {sortByPosition(
                  partida.times_escolhidos.time_b
                    .map(id => players.find(p => p.jogador_id === id)?.jogador)
                    .filter(Boolean) as import('@/lib/supabase').Jogador[]
                ).map(jogador => (
                  <div key={jogador.id} className="flex items-center gap-2">
                    <PositionBadge posicao={jogador.posicao_principal} />
                    <span className="text-white text-sm">{jogador.nome}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resultado */}
      {partida.status === 'realizada' && (
        <ResultadoPartida
          partida={partida}
          players={players}
          onUpdate={loadPartida}
        />
      )}

      {/* Players management */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
        <JogadoresPartida
          partidaId={id}
          confirmedPlayers={players}
          allPlayers={allPlayers}
          onUpdate={loadPartida}
          readonly={partida.status === 'realizada'}
        />
      </div>

      <Modal
        open={showDeleteModal}
        onClose={() => { if (!deleting) setShowDeleteModal(false) }}
        title="Excluir Partida"
      >
        <p className="text-gray-300 text-sm mb-6">
          Tem certeza que deseja excluir a partida de{' '}
          <strong className="text-white">
            {format(parseISO(partida.data), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </strong>?
          Esta ação não pode ser desfeita.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {deleting ? 'Excluindo...' : 'Excluir Partida'}
          </button>
          <button
            onClick={() => setShowDeleteModal(false)}
            disabled={deleting}
            className="flex-1 bg-[#222] hover:bg-[#333] disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            Cancelar
          </button>
        </div>
      </Modal>
    </div>
  )
}
