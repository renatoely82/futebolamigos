'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Temporada } from '@/lib/supabase'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import { useToast } from '@/components/ui/Toast'

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

export default function NovaPartidaPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [temporadas, setTemporadas] = useState<Temporada[]>([])
  const [showCalendar, setShowCalendar] = useState(false)
  const [form, setForm] = useState({
    data: new Date().toISOString().split('T')[0],
    hora: '10:50',
    local: '',
    numero_jogadores: '',
    nome_time_a: 'Amarelo',
    nome_time_b: 'Azul',
    observacoes: '',
    temporada_id: '',
    incluir_mensalistas: true,
  })

  useEffect(() => {
    fetch('/api/temporadas').then(r => r.json()).then((list: Temporada[]) => {
      setTemporadas(list)
      const ativa = list.find(t => t.ativa)
      if (ativa) setForm(f => ({ ...f, temporada_id: ativa.id }))
    })
  }, [])

  const numJogadores = parseInt(form.numero_jogadores)
  const showOddWarning = !isNaN(numJogadores) && numJogadores > 0 && numJogadores % 2 !== 0

  const today = new Date().toISOString().split('T')[0]
  const isDataPassada = form.data < today
  const [jaRealizada, setJaRealizada] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/partidas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          numero_jogadores: form.numero_jogadores ? parseInt(form.numero_jogadores) : null,
          nome_time_a: form.nome_time_a || 'Amarelo',
          nome_time_b: form.nome_time_b || 'Azul',
          temporada_id: form.temporada_id || null,
          incluir_mensalistas: form.incluir_mensalistas,
          status: jaRealizada ? 'realizada' : 'agendada',
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro ao criar partida.'); return }
      toast('Partida criada.')
      router.push(`/partidas/${data.id}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-xl">
      <div className="mb-6 space-y-1">
        <Breadcrumbs items={[
          { label: 'Partidas', href: '/partidas' },
          { label: 'Nova Partida' },
        ]} />
        <h1 className="text-gray-800 text-2xl font-bold">Nova Partida</h1>
      </div>

      <div className="bg-white border border-[#e0e0e0] rounded-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Data *</label>
            <button
              type="button"
              onClick={() => setShowCalendar(v => !v)}
              className="w-full bg-white border border-[#e0e0e0] rounded-lg px-3 py-2.5 text-left text-gray-800 focus:outline-none focus:border-green-500 flex items-center justify-between"
            >
              <span>
                {form.data
                  ? new Date(form.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                  : 'Selecionar data'}
              </span>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${showCalendar ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </button>
            {showCalendar && (
              <div className="mt-2">
                <CalendarioInline
                  value={form.data}
                  onChange={v => { setForm(f => ({ ...f, data: v })); setShowCalendar(false); setJaRealizada(false) }}
                />
              </div>
            )}
            {isDataPassada && (
              <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 space-y-2">
                <p className="text-yellow-700 text-sm">
                  Esta data já passou. A partida será criada como <strong>agendada</strong> — lembra-te de registar o resultado depois.
                </p>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={jaRealizada}
                    onChange={e => setJaRealizada(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 accent-green-600"
                  />
                  <span className="text-sm text-yellow-800 font-medium">Esta partida já foi realizada</span>
                </label>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Hora *</label>
            <input
              type="time"
              required
              value={form.hora}
              onChange={e => setForm(f => ({ ...f, hora: e.target.value }))}
              className="w-full bg-white border border-[#e0e0e0] rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Local</label>
            <input
              type="text"
              value={form.local}
              onChange={e => setForm(f => ({ ...f, local: e.target.value }))}
              className="w-full bg-white border border-[#e0e0e0] rounded-lg px-3 py-2.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500"
              placeholder="Ex: Quadra do clube"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Número de Jogadores</label>
            <input
              type="number"
              min="2"
              max="100"
              value={form.numero_jogadores}
              onChange={e => setForm(f => ({ ...f, numero_jogadores: e.target.value }))}
              className="w-full bg-white border border-[#e0e0e0] rounded-lg px-3 py-2.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500"
              placeholder="Ex: 14"
            />
            {showOddWarning && (
              <p className="text-yellow-600 text-xs mt-1">
                Número ímpar — não é possível dividir igualmente nos dois times.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Nome do Time A</label>
              <input
                type="text"
                value={form.nome_time_a}
                onChange={e => setForm(f => ({ ...f, nome_time_a: e.target.value }))}
                className="w-full bg-white border border-[#e0e0e0] rounded-lg px-3 py-2.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500"
                placeholder="Amarelo"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Nome do Time B</label>
              <input
                type="text"
                value={form.nome_time_b}
                onChange={e => setForm(f => ({ ...f, nome_time_b: e.target.value }))}
                className="w-full bg-white border border-[#e0e0e0] rounded-lg px-3 py-2.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500"
                placeholder="Azul"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Observações</label>
            <textarea
              value={form.observacoes}
              onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
              rows={3}
              className="w-full bg-white border border-[#e0e0e0] rounded-lg px-3 py-2.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 resize-none"
              placeholder="Informações extras..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Temporada</label>
            {temporadas.length === 0 ? (
              <p className="text-gray-500 text-sm py-2">
                Nenhuma temporada cadastrada.{' '}
                <Link href="/temporadas/nova" className="text-green-600 hover:text-green-700">Criar temporada</Link>
              </p>
            ) : (
              <select
                value={form.temporada_id}
                onChange={e => setForm(f => ({ ...f, temporada_id: e.target.value }))}
                className="w-full bg-white border border-[#e0e0e0] rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:border-green-500"
              >
                <option value="">Sem temporada</option>
                {temporadas.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nome}{t.ativa ? ' (ativa)' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <button
            type="button"
            onClick={() => setForm(f => ({ ...f, incluir_mensalistas: !f.incluir_mensalistas }))}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${
              form.incluir_mensalistas
                ? 'bg-green-50 border-green-200'
                : 'bg-white border-[#e0e0e0]'
            }`}
          >
            <div className="flex items-center gap-3">
              <svg className={`w-5 h-5 flex-shrink-0 ${form.incluir_mensalistas ? 'text-green-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              <span className={`text-sm font-medium ${form.incluir_mensalistas ? 'text-green-600' : 'text-gray-500'}`}>
                Incluir mensalistas automaticamente
              </span>
            </div>
            <div className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${form.incluir_mensalistas ? 'bg-green-500' : 'bg-gray-200'}`}>
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.incluir_mensalistas ? 'left-5' : 'left-1'}`} />
            </div>
          </button>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
            >
              {loading ? 'Criando...' : 'Criar Partida'}
            </button>
            <Link
              href="/partidas"
              className="flex-1 text-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-lg transition-colors"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
