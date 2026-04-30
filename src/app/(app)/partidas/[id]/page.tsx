'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Partida, Jogador, PartidaJogadorComDetalhes, Temporada, FormaPagamento, SubstituicaoComDetalhes } from '@/lib/supabase'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import { useToast } from '@/components/ui/Toast'
import { SkeletonLine, SkeletonBox } from '@/components/ui/Skeleton'
import JogadoresPartida from '@/components/partidas/JogadoresPartida'
import ResultadoPartida from '@/components/partidas/ResultadoPartida'
import SubstituicoesPartida from '@/components/partidas/SubstituicoesPartida'
import Modal from '@/components/ui/Modal'
import { StatusBadge, PositionBadge } from '@/components/ui/Badge'
import { sortByPosition } from '@/lib/team-balancer'
import { getTeamColor, getTeamEmoji } from '@/lib/team-colors'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

function CalendarioInline({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const today = new Date()
  const selected = value ? new Date(value + 'T12:00:00') : null
  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? today.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? today.getMonth())

  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }
  function selectDay(day: number) {
    const d = new Date(viewYear, viewMonth, day)
    const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    onChange(iso)
  }

  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({length: daysInMonth}, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="bg-white border border-[#e0e0e0] rounded-xl p-4 select-none">
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <span className="text-gray-800 font-semibold text-sm">{MESES[viewMonth]} {viewYear}</span>
        <button type="button" onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DIAS_SEMANA.map(d => (
          <div key={d} className="text-center text-xs text-gray-500 font-medium py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const isSelected = selected && selected.getFullYear() === viewYear && selected.getMonth() === viewMonth && selected.getDate() === day
          const isToday = today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day
          return (
            <button
              key={i}
              type="button"
              onClick={() => selectDay(day)}
              className={`text-sm rounded-lg py-2 w-full transition-colors font-medium
                ${isSelected ? 'bg-green-500 text-white' : isToday ? 'bg-green-50 text-green-600' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'}`}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface DiaristaEntry {
  jogador_id: string
  jogador: { id: string; nome: string; posicao_principal: string } | null
  pagamento_id: string | null
  pago: boolean
  valor_pago: number | null
  forma_pagamento: FormaPagamento | null
  data_pagamento: string | null
  observacoes: string | null
  isento: boolean
}

const FORMAS_DIARISTA: { value: FormaPagamento; label: string; color: string }[] = [
  { value: 'CASH', label: 'CASH', color: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200' },
  { value: 'BIZUM', label: 'BIZUM', color: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200' },
  { value: 'PIX', label: 'PIX', color: 'bg-teal-100 text-teal-700 border-teal-200 hover:bg-teal-200' },
]

export default function PartidaDetailPage() {
  const { toast } = useToast()
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
  const [editingData, setEditingData] = useState(false)
  const [dataSaving, setDataSaving] = useState(false)
  const [editingHora, setEditingHora] = useState(false)
  const [horaSaving, setHoraSaving] = useState(false)
  const [horaEdit, setHoraEdit] = useState('')
  // Diaristas payment state
  const [diaristas, setDiaristas] = useState<DiaristaEntry[]>([])
  const [editandoDiaristaId, setEditandoDiaristaId] = useState<string | null>(null)
  const [editDiaristaForm, setEditDiaristaForm] = useState<{ valor: string; forma: FormaPagamento | null; obs: string; isento: boolean }>({ valor: '', forma: null, obs: '', isento: false })
  const [savingDiarista, setSavingDiarista] = useState<Set<string>>(new Set())
  const [substituicoes, setSubstituicoes] = useState<SubstituicaoComDetalhes[]>([])
  const [sendingPush, setSendingPush] = useState(false)
  const [pushFeedback, setPushFeedback] = useState('')
  const [showConvocarModal, setShowConvocarModal] = useState(false)
  const [convocarMsg, setConvocarMsg] = useState('')
  const [showMensagemMenu, setShowMensagemMenu] = useState(false)

  const loadDiaristas = useCallback(async () => {
    const res = await fetch(`/api/partidas/${id}/pagamentos-diaristas`)
    if (res.ok) setDiaristas(await res.json())
  }, [id])

  const loadPartida = useCallback(async () => {
    const [pRes, pjRes, apRes, tRes, subRes] = await Promise.all([
      fetch(`/api/partidas/${id}`),
      fetch(`/api/partidas/${id}/jogadores`),
      fetch('/api/jogadores'),
      fetch('/api/temporadas'),
      fetch(`/api/partidas/${id}/substituicoes`),
    ])
    if (pRes.ok) setPartida(await pRes.json())
    if (pjRes.ok) setPlayers(await pjRes.json())
    if (apRes.ok) setAllPlayers(await apRes.json())
    if (tRes.ok) setTemporadas(await tRes.json())
    if (subRes.ok) setSubstituicoes(await subRes.json())
    setLoading(false)
    loadDiaristas()
  }, [id, loadDiaristas])

  useEffect(() => { loadPartida() }, [loadPartida])

  useEffect(() => {
    if (!showMensagemMenu) return
    function handleClickOutside() { setShowMensagemMenu(false) }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showMensagemMenu])

  async function handleStatusChange(newStatus: string) {
    setStatusSaving(true)
    await fetch(`/api/partidas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    setPartida(p => p ? { ...p, status: newStatus as Partida['status'] } : p)
    setStatusSaving(false)
    toast(`Status alterado para ${newStatus}.`)
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

  async function handleDataChange(novaData: string) {
    setDataSaving(true)
    await fetch(`/api/partidas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: novaData }),
    })
    setPartida(p => p ? { ...p, data: novaData } : p)
    setDataSaving(false)
    setEditingData(false)
    toast('Data atualizada.')
  }

  async function handleHoraChange() {
    if (!horaEdit) return
    setHoraSaving(true)
    await fetch(`/api/partidas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hora: horaEdit }),
    })
    setPartida(p => p ? { ...p, hora: horaEdit } : p)
    setHoraSaving(false)
    setEditingHora(false)
    toast('Hora atualizada.')
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

  async function handleNotificar() {
    if (!partida) return
    setSendingPush(true)
    setPushFeedback('')
    const dateStr = format(parseISO(partida.data), "d 'de' MMMM", { locale: ptBR })
    const res = await fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titulo: '⚽ Lista aberta!',
        corpo: `A lista para a partida de ${dateStr} está aberta. Confirme sua presença!`,
        url: `/partidas/${id}`,
      }),
    })
    const data = await res.json()
    toast(data.sent > 0 ? `Notificação enviada para ${data.sent} jogador(es)` : 'Nenhum jogador inscrito para notificações', data.sent > 0 ? 'success' : 'info')
    setSendingPush(false)
  }

  // WhatsApp share
  function buildConvocarMsg(): string {
    if (!partida) return ''
    const dateStr = format(parseISO(partida.data), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
    const localStr = partida.local ?? ''

    const goleiros = players.filter(p => p.jogador.posicao_principal === 'Goleiro')
    const mensalistas = players.filter(p => p.jogador.posicao_principal !== 'Goleiro' && !p.adicionado_manualmente)
      .sort((a, b) => a.jogador.nome.localeCompare(b.jogador.nome, 'pt-BR'))
    const suplentes = players.filter(p => p.jogador.posicao_principal !== 'Goleiro' && p.adicionado_manualmente)

    const golLine = (i: number) => `${i + 1}- ${goleiros[i]?.jogador.nome ?? ''}`
    const mensLines = mensalistas.length > 0
      ? mensalistas.map((p, i) => `${i + 1}- ${p.jogador.nome}`).join('\n')
      : '1-\n2-\n3-'
    const supLines = Array.from({ length: 5 }, (_, i) =>
      `${i + 1}- ${suplentes[i]?.jogador.nome ?? ''}`
    ).join('\n')

    return `Lista Barcelombra\n${dateStr}\n10h50min ${localStr}\n\nGoleiros:\n${golLine(0)}\n${golLine(1)}\n\nMensalistas:\n${mensLines}\n\nSuplentes: (7 euros)\n${supLines}`
  }

  function handleConvocar() {
    if (!partida) return
    setConvocarMsg(buildConvocarMsg())
    setShowMensagemMenu(false)
    setShowConvocarModal(true)
  }

  function buildTimesMsg(): string {
    if (!partida?.times_escolhidos) return ''
    const timeAPlayers = partida.times_escolhidos.time_a
      .map(pid => players.find(p => p.jogador_id === pid)?.jogador.nome)
      .filter(Boolean) as string[]
    const timeBPlayers = partida.times_escolhidos.time_b
      .map(pid => players.find(p => p.jogador_id === pid)?.jogador.nome)
      .filter(Boolean) as string[]
    const timeALines = timeAPlayers.map((n, i) => `${i + 1}- ${n}`).join('\n')
    const timeBLines = timeBPlayers.map((n, i) => `${i + 1}- ${n}`).join('\n')
    const nomeA = partida.nome_time_a ?? 'Time A'
    const nomeB = partida.nome_time_b ?? 'Time B'
    const emojiA = getTeamEmoji(nomeA)
    const emojiB = getTeamEmoji(nomeB)
    const labelA = emojiA ? `${emojiA} ${nomeA}` : nomeA
    const labelB = emojiB ? `${emojiB} ${nomeB}` : nomeB
    return `${labelA}:\n${timeALines}\n\n${labelB}:\n${timeBLines}`
  }

  function handleTimes() {
    if (!partida?.times_escolhidos) return
    setConvocarMsg(buildTimesMsg())
    setShowMensagemMenu(false)
    setShowConvocarModal(true)
  }

  const temporadaAtual = temporadas.find(t => t.id === partida?.temporada_id) ?? null
  const valorDiaristaDefault = temporadaAtual?.valor_diarista ?? null

  async function salvarPagamentoDiarista(entry: DiaristaEntry) {
    const key = entry.jogador_id
    setSavingDiarista(prev => new Set(prev).add(key))
    let valorNum: number | null
    let pago: boolean
    if (editDiaristaForm.isento) {
      valorNum = 0
      pago = true
    } else {
      valorNum = editDiaristaForm.valor ? Number(editDiaristaForm.valor) : null
      pago = valorNum !== null && valorNum > 0
    }
    await fetch(`/api/partidas/${id}/pagamentos-diaristas`, {
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
    setSavingDiarista(prev => { const s = new Set(prev); s.delete(key); return s })
    setEditandoDiaristaId(null)
    loadDiaristas()
  }

  function abrirEdicaoDiarista(entry: DiaristaEntry) {
    setEditandoDiaristaId(entry.jogador_id)
    setEditDiaristaForm({
      valor: entry.valor_pago !== null ? String(entry.valor_pago) : (valorDiaristaDefault !== null ? String(valorDiaristaDefault) : ''),
      forma: entry.forma_pagamento,
      obs: entry.observacoes ?? '',
      isento: entry.isento,
    })
  }

  function getDiaristaStatus(entry: DiaristaEntry) {
    if (entry.isento && entry.pago) {
      return { label: 'Isento', classes: 'bg-gray-100 text-gray-500 border-gray-200' }
    }
    if (entry.pago || (entry.valor_pago !== null && valorDiaristaDefault !== null && entry.valor_pago >= valorDiaristaDefault)) {
      return { label: 'Pago', classes: 'bg-green-100 text-green-700 border-green-200' }
    }
    if (entry.valor_pago !== null && entry.valor_pago > 0) {
      return { label: 'Parcial', classes: 'bg-yellow-100 text-yellow-700 border-yellow-200' }
    }
    return { label: 'Pendente', classes: 'bg-red-50 text-red-500 border-red-200' }
  }

  if (loading) return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <SkeletonLine className="h-3 w-32 mb-3" />
        <SkeletonLine className="h-7 w-64 mb-2" />
        <div className="flex items-center gap-2">
          <SkeletonLine className="h-5 w-20 rounded-full" />
          <SkeletonLine className="h-4 w-28" />
        </div>
        <div className="flex gap-2 mt-3">
          <SkeletonLine className="h-8 w-20 rounded-lg" />
          <SkeletonLine className="h-8 w-24 rounded-lg" />
          <SkeletonLine className="h-8 w-24 rounded-lg" />
          <SkeletonLine className="h-8 w-24 rounded-lg ml-auto" />
        </div>
      </div>
      {/* Status card */}
      <SkeletonBox className="h-14" />
      {/* Temporada card */}
      <SkeletonBox className="h-14" />
      {/* Players */}
      <div className="bg-white border border-[#e0e0e0] rounded-xl p-6 space-y-3">
        <SkeletonLine className="h-5 w-36 mb-4" />
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonLine key={i} className="h-10 rounded-lg" />
        ))}
      </div>
    </div>
  )
  if (!partida) return <div className="p-6 text-gray-500">Partida não encontrada.</div>

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <Breadcrumbs items={[
          { label: 'Partidas', href: '/partidas' },
          { label: format(parseISO(partida.data), "d 'de' MMMM", { locale: ptBR }) },
        ]} />
        {/* Title row */}
        <div className="flex items-start gap-3 mt-1">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-gray-800 text-xl sm:text-2xl font-bold leading-snug">
                {format(parseISO(partida.data), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </h1>
              <button
                onClick={() => setEditingData(e => !e)}
                className="text-gray-400 hover:text-green-600 transition-colors shrink-0"
                title="Alterar data"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                    d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
                </svg>
              </button>
            </div>
            {editingData && (
              <div className="mt-3">
                {dataSaving ? (
                  <p className="text-sm text-gray-400">Salvando...</p>
                ) : (
                  <>
                    <CalendarioInline value={partida.data} onChange={handleDataChange} />
                    <button
                      onClick={() => setEditingData(false)}
                      className="mt-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      Cancelar
                    </button>
                  </>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <StatusBadge status={partida.status} />
              <div className="flex items-center gap-1">
                <p className="text-gray-500 text-sm">{partida.hora}</p>
                <button
                  onClick={() => { setHoraEdit(partida.hora); setEditingHora(e => !e) }}
                  className="text-gray-400 hover:text-green-600 transition-colors"
                  title="Alterar hora"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                      d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
                  </svg>
                </button>
              </div>
              {partida.local && <p className="text-gray-500 text-sm">· {partida.local}</p>}
            </div>
            {editingHora && (
              <div className="mt-2 flex items-center gap-2">
                {horaSaving ? (
                  <p className="text-sm text-gray-400">Salvando...</p>
                ) : (
                  <>
                    <input
                      type="time"
                      value={horaEdit}
                      onChange={e => setHoraEdit(e.target.value)}
                      className="bg-white border border-[#e0e0e0] rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:border-green-500"
                    />
                    <button
                      onClick={handleHoraChange}
                      className="text-sm text-white bg-green-500 hover:bg-green-600 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => setEditingHora(false)}
                      className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      Cancelar
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions row */}
        <div className="flex items-center gap-2 pl-8">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-1.5 bg-red-100 hover:bg-red-200 text-red-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            title="Excluir partida"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span className="hidden sm:inline">Excluir</span>
          </button>
          <button
            onClick={handleNotificar}
            disabled={sendingPush}
            className="flex items-center gap-1.5 bg-blue-100 hover:bg-blue-200 text-blue-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            title="Notificar jogadores"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="hidden sm:inline">{sendingPush ? '...' : 'Notificar'}</span>
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMensagemMenu(m => !m)}
              className="flex items-center gap-1.5 bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              title="Mensagem via WhatsApp"
            >
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              <span className="hidden sm:inline">Mensagem</span>
              <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showMensagemMenu && (
              <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-[#e0e0e0] rounded-xl shadow-lg overflow-hidden min-w-[130px]">
                <button
                  onClick={handleConvocar}
                  disabled={partida?.status === 'realizada'}
                  className="w-full text-left px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 hover:bg-gray-50 disabled:hover:bg-white"
                >
                  Convocar
                </button>
                <button
                  onClick={handleTimes}
                  disabled={!partida?.times_escolhidos || partida?.status === 'realizada'}
                  className="w-full text-left px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 hover:bg-gray-50 disabled:hover:bg-white"
                >
                  Times
                </button>
              </div>
            )}
          </div>
          <Link
            href={`/partidas/${id}/times`}
            className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors ml-auto sm:ml-0"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Ver Times
          </Link>
        </div>
      </div>

      {/* Push feedback — now handled by toast */}
      {false && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-blue-700 text-sm">
        </div>
      )}

      {/* Status selector */}
      <div className="bg-white border border-[#e0e0e0] rounded-xl p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-gray-500 text-sm">Status:</span>
          {(['agendada', 'realizada', 'cancelada'] as const).map(s => (
            <button
              key={s}
              disabled={statusSaving}
              onClick={() => handleStatusChange(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                partida.status === s
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Temporada */}
      <div className="bg-white border border-[#e0e0e0] rounded-xl p-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-gray-500 text-sm shrink-0">Temporada:</span>
          {editingTemporada ? (
            <div className="flex items-center gap-2 flex-1">
              <select
                autoFocus
                disabled={temporadaSaving}
                defaultValue={partida.temporada_id ?? ''}
                onChange={e => handleTemporadaChange(e.target.value)}
                className="flex-1 bg-white border border-[#e0e0e0] text-gray-800 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-green-500 disabled:opacity-50"
              >
                <option value="">Sem temporada</option>
                {temporadas.map(t => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
              <button
                onClick={() => setEditingTemporada(false)}
                className="text-gray-400 hover:text-gray-600 text-sm transition-colors"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <>
              {partida.temporada_id ? (
                <a
                  href={`/temporadas/${partida.temporada_id}`}
                  className="text-green-600 hover:text-green-700 text-sm font-medium underline"
                >
                  {temporadas.find(t => t.id === partida.temporada_id)?.nome ?? '—'}
                </a>
              ) : (
                <span className="text-gray-400 text-sm italic">Não vinculada</span>
              )}
              <button
                onClick={() => setEditingTemporada(true)}
                className="ml-auto text-gray-500 hover:text-green-600 text-sm transition-colors"
              >
                {partida.temporada_id ? 'Alterar' : 'Vincular'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Times definidos */}
      {partida.times_escolhidos && (() => {
        const subByAusente = new Map(substituicoes.map(s => [s.jogador_ausente_id, s]))

        function renderTimePlayers(ids: string[]) {
          return sortByPosition(
            ids
              .map(pid => {
                const pj = players.find(p => p.jogador_id === pid)
                if (!pj) return undefined
                return pj.posicao_convocacao ? { ...pj.jogador, posicao_principal: pj.posicao_convocacao } : pj.jogador
              })
              .filter(Boolean) as import('@/lib/supabase').Jogador[]
          ).map(jogador => {
            const sub = subByAusente.get(jogador.id)
            return (
              <div key={jogador.id}>
                {sub ? (
                  <div className="flex items-center gap-2">
                    <PositionBadge posicao={sub.jogador_substituto.posicao_principal} />
                    <span className="text-gray-800 text-sm">{sub.jogador_substituto.nome}</span>
                    <span className="text-gray-400 text-xs line-through ml-0.5">{jogador.nome}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <PositionBadge posicao={jogador.posicao_principal} />
                    <span className="text-gray-800 text-sm">{jogador.nome}</span>
                  </div>
                )}
              </div>
            )
          })
        }

        return (
          <div className="bg-white border border-green-500/30 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-gray-800 font-semibold">Times Definidos</h2>
              {partida.status !== 'realizada' && (
                <Link
                  href={`/partidas/${id}/times`}
                  className="text-green-600 text-sm hover:text-green-700 transition-colors"
                >
                  Alterar →
                </Link>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <h3 className={`font-semibold text-sm mb-2 ${getTeamColor(partida.nome_time_a, 'text-green-600')}`}>{partida.nome_time_a}</h3>
                <div className="space-y-1.5">{renderTimePlayers(partida.times_escolhidos!.time_a)}</div>
              </div>
              <div>
                <h3 className={`font-semibold text-sm mb-2 ${getTeamColor(partida.nome_time_b, 'text-blue-600')}`}>{partida.nome_time_b}</h3>
                <div className="space-y-1.5">{renderTimePlayers(partida.times_escolhidos!.time_b)}</div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Substituições */}
      {partida.times_escolhidos && (
        <SubstituicoesPartida
          partida={partida}
          players={players}
          allPlayers={allPlayers}
          onUpdate={loadPartida}
        />
      )}

      {/* Resultado */}
      {partida.status === 'realizada' && (
        <ResultadoPartida
          partida={partida}
          players={players}
          substituicoes={substituicoes}
          onUpdate={loadPartida}
        />
      )}

      {/* Players management + Diaristas (side by side when realizada) */}
      {partida.status === 'realizada' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Convocados */}
          <div className="bg-white border border-[#e0e0e0] rounded-xl p-6">
            <JogadoresPartida
              partidaId={id}
              confirmedPlayers={players}
              allPlayers={allPlayers}
              onUpdate={() => { loadPartida(); loadDiaristas() }}
              readonly
            />
          </div>

          {/* Diaristas payment */}
          <div className="bg-white border border-[#e0e0e0] rounded-xl overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
              <h2 className="text-gray-800 font-semibold text-sm">Pagamentos — Diaristas</h2>
              <p className="text-gray-400 text-xs mt-0.5">
                {diaristas.length === 0
                  ? 'Nenhum diarista nesta partida'
                  : `${diaristas.filter(d => d.pago).length}/${diaristas.length} resolvidos${valorDiaristaDefault !== null ? ` · Valor padrão: ${valorDiaristaDefault} €` : ''}${diaristas.filter(d => d.isento && d.pago).length > 0 ? ` · ${diaristas.filter(d => d.isento && d.pago).length} isento(s)` : ''}`
                }
              </p>
            </div>
            {diaristas.length === 0 ? (
              <p className="px-6 py-4 text-gray-400 text-sm">Nenhum diarista.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {diaristas.map(entry => {
                  const isSaving = savingDiarista.has(entry.jogador_id)
                  const isEditing = editandoDiaristaId === entry.jogador_id
                  const status = getDiaristaStatus(entry)

                  return (
                    <div key={entry.jogador_id}>
                      <div className="flex items-center justify-between px-4 py-3 gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-800 text-sm font-medium truncate">
                            {entry.jogador?.nome ?? '—'}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {entry.forma_pagamento && (
                              <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${FORMAS_DIARISTA.find(f => f.value === entry.forma_pagamento)?.color ?? ''}`}>
                                {entry.forma_pagamento}
                              </span>
                            )}
                            {entry.valor_pago !== null && (
                              <span className="text-xs text-gray-500">
                                {entry.valor_pago}{valorDiaristaDefault !== null ? ` / ${valorDiaristaDefault} €` : ' €'}
                              </span>
                            )}
                            {entry.observacoes && (
                              <span className="text-xs text-gray-400 italic truncate max-w-[120px]">{entry.observacoes}</span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0">
                          <button
                            onClick={() => isEditing ? setEditandoDiaristaId(null) : abrirEdicaoDiarista(entry)}
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
                                  {FORMAS_DIARISTA.map(f => (
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
                                    placeholder={valorDiaristaDefault !== null ? String(valorDiaristaDefault) : '0'}
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
                              onClick={() => salvarPagamentoDiarista(entry)}
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
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[#e0e0e0] rounded-xl p-6">
          <JogadoresPartida
            partidaId={id}
            confirmedPlayers={players}
            allPlayers={allPlayers}
            onUpdate={() => { loadPartida(); loadDiaristas() }}
            readonly={false}
          />
        </div>
      )}

      <Modal
        open={showConvocarModal}
        onClose={() => setShowConvocarModal(false)}
        title="Mensagem via WhatsApp"
        size="xl"
      >
        <textarea
          value={convocarMsg}
          onChange={e => setConvocarMsg(e.target.value)}
          rows={18}
          className="w-full bg-gray-50 border border-[#e0e0e0] rounded-lg px-3 py-3 text-gray-800 text-sm font-mono focus:outline-none focus:border-green-500 resize-none mb-4"
        />
        <div className="flex gap-3">
          <button
            onClick={() => {
              window.open(`https://wa.me/?text=${encodeURIComponent(convocarMsg)}`, '_blank')
              setShowConvocarModal(false)
            }}
            className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd59] text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Enviar WhatsApp
          </button>
          <button
            onClick={() => setShowConvocarModal(false)}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-lg transition-colors"
          >
            Cancelar
          </button>
        </div>
      </Modal>

      <Modal
        open={showDeleteModal}
        onClose={() => { if (!deleting) setShowDeleteModal(false) }}
        title="Excluir Partida"
      >
        <p className="text-gray-600 text-sm mb-6">
          Tem certeza que deseja excluir a partida de{' '}
          <strong className="text-gray-800">
            {format(parseISO(partida.data), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </strong>?
          Esta ação não pode ser desfeita.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {deleting ? 'Excluindo...' : 'Excluir Partida'}
          </button>
          <button
            onClick={() => setShowDeleteModal(false)}
            disabled={deleting}
            className="flex-1 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 font-semibold py-2.5 rounded-lg transition-colors"
          >
            Cancelar
          </button>
        </div>
      </Modal>
    </div>
  )
}
