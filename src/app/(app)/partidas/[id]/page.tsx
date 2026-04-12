'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import type { Partida, Jogador, PartidaJogadorComDetalhes } from '@/lib/supabase'
import JogadoresPartida from '@/components/partidas/JogadoresPartida'
import { StatusBadge } from '@/components/ui/Badge'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function PartidaDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [partida, setPartida] = useState<Partida | null>(null)
  const [players, setPlayers] = useState<PartidaJogadorComDetalhes[]>([])
  const [allPlayers, setAllPlayers] = useState<Jogador[]>([])
  const [loading, setLoading] = useState(true)
  const [statusSaving, setStatusSaving] = useState(false)

  const loadPartida = useCallback(async () => {
    const [pRes, pjRes, apRes] = await Promise.all([
      fetch(`/api/partidas/${id}`),
      fetch(`/api/partidas/${id}/jogadores`),
      fetch('/api/jogadores'),
    ])
    if (pRes.ok) setPartida(await pRes.json())
    if (pjRes.ok) setPlayers(await pjRes.json())
    if (apRes.ok) setAllPlayers(await apRes.json())
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

      {/* Players management */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
        <JogadoresPartida
          partidaId={id}
          confirmedPlayers={players}
          allPlayers={allPlayers}
          onUpdate={loadPartida}
        />
      </div>
    </div>
  )
}
