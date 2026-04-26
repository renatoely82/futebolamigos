'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useToast } from '@/components/ui/Toast'
import type { AcessoEntry } from '@/app/api/admin/acessos/route'
import type { Jogador } from '@/lib/supabase'

export default function AcessosPage() {
  const { toast } = useToast()
  const [acessos, setAcessos] = useState<AcessoEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [resending, setResending] = useState<string | null>(null)
  const [confirmRevoke, setConfirmRevoke] = useState<AcessoEntry | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [jogadores, setJogadores] = useState<Jogador[]>([])
  const [selectedJogadorId, setSelectedJogadorId] = useState('')
  const [inviting, setInviting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/acessos')
    if (res.ok) setAcessos(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function openInvite() {
    const res = await fetch('/api/jogadores')
    if (res.ok) setJogadores(await res.json())
    setSelectedJogadorId('')
    setInviteOpen(true)
  }

  async function handleInvite() {
    if (!selectedJogadorId) return
    setInviting(true)
    const res = await fetch('/api/admin/convidar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jogador_id: selectedJogadorId }),
    })
    const data = await res.json()
    toast(res.ok ? (data.message ?? 'Convite enviado!') : (data.error ?? 'Erro ao enviar convite.'))
    setInviting(false)
    if (res.ok) { setInviteOpen(false); load() }
  }

  async function handleResend(entry: AcessoEntry) {
    if (!entry.jogador_id) return
    setResending(entry.user_id)
    const res = await fetch('/api/admin/convidar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jogador_id: entry.jogador_id, reenviar: true }),
    })
    const data = await res.json()
    toast(res.ok ? (data.message ?? 'Convite reenviado!') : (data.error ?? 'Erro ao reenviar.'))
    setResending(null)
  }

  async function handleRevoke(entry: AcessoEntry) {
    setRevoking(entry.user_id)
    const res = await fetch(`/api/admin/acessos?user_id=${entry.user_id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) toast(data.error ?? 'Erro ao revogar.')
    else { toast('Acesso revogado.'); load() }
    setRevoking(null)
    setConfirmRevoke(null)
  }

  const jogadoresComAcesso = new Set(acessos.map(a => a.jogador_id).filter(Boolean))
  const jogadoresSemAcesso = jogadores.filter(j => !jogadoresComAcesso.has(j.id) && j.email)

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-gray-800 text-2xl font-bold">Gestão de Acessos</h1>
          <p className="text-gray-500 text-sm mt-0.5">Utilizadores com acesso à aplicação</p>
        </div>
        <button
          onClick={openInvite}
          className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeWidth={2} strokeLinecap="round" d="M12 4v16m8-8H4" />
          </svg>
          Convidar jogador
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white border border-[#e0e0e0] rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-48 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-32" />
            </div>
          ))}
        </div>
      ) : acessos.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500">Nenhum acesso configurado.</p>
          <p className="text-gray-400 text-sm mt-1">Usa o botão "Convidar jogador" para dar acesso ao portal.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {acessos.map(entry => (
            <div key={entry.user_id} className="bg-white border border-[#e0e0e0] rounded-xl p-4 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    entry.role === 'admin'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {entry.role === 'admin' ? 'Admin' : 'Jogador'}
                  </span>
                  {entry.jogador_nome && (
                    <span className="text-gray-800 font-medium text-sm">{entry.jogador_nome}</span>
                  )}
                </div>
                <p className="text-gray-500 text-xs mt-1 truncate">{entry.email}</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  Desde {format(parseISO(entry.criado_em), "d 'de' MMM yyyy", { locale: ptBR })}
                </p>
              </div>
              {entry.role !== 'admin' && (
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => handleResend(entry)}
                    disabled={resending === entry.user_id}
                    className="text-xs font-medium px-3 py-1.5 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Reenviar convite por email"
                  >
                    {resending === entry.user_id ? 'A enviar...' : 'Reenviar'}
                  </button>
                  <button
                    onClick={() => setConfirmRevoke(entry)}
                    disabled={!!revoking}
                    className="text-xs font-medium px-3 py-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Revogar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal convidar */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h2 className="text-gray-800 font-bold text-lg mb-1">Convidar jogador</h2>
            <p className="text-gray-500 text-sm mb-4">Seleciona um jogador para enviar o convite por email.</p>

            {jogadoresSemAcesso.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">
                Todos os jogadores com email já têm acesso.
              </p>
            ) : (
              <select
                value={selectedJogadorId}
                onChange={e => setSelectedJogadorId(e.target.value)}
                className="w-full bg-white border border-[#e0e0e0] rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:border-green-500 mb-4"
              >
                <option value="">Selecionar jogador...</option>
                {jogadoresSemAcesso.map(j => (
                  <option key={j.id} value={j.id}>{j.nome} — {j.email}</option>
                ))}
              </select>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleInvite}
                disabled={!selectedJogadorId || inviting || jogadoresSemAcesso.length === 0}
                className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
              >
                {inviting ? 'A enviar...' : 'Enviar convite'}
              </button>
              <button
                onClick={() => setInviteOpen(false)}
                disabled={inviting}
                className="flex-1 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 font-semibold py-2.5 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm revogar */}
      {confirmRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h2 className="text-gray-800 font-bold text-lg mb-2">Revogar acesso</h2>
            <p className="text-gray-600 text-sm mb-6">
              Tem certeza que deseja revogar o acesso de{' '}
              <strong>{confirmRevoke.jogador_nome ?? confirmRevoke.email}</strong>?
              O jogador não conseguirá mais iniciar sessão.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleRevoke(confirmRevoke)}
                disabled={!!revoking}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
              >
                {revoking ? 'A revogar...' : 'Revogar'}
              </button>
              <button
                onClick={() => setConfirmRevoke(null)}
                disabled={!!revoking}
                className="flex-1 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 font-semibold py-2.5 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
