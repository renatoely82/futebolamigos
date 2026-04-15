'use client'

import { useState, useEffect } from 'react'

type Jogador = { id: string; nome: string }

type Status = 'idle' | 'loading' | 'success' | 'error' | 'unsupported' | 'denied'

export default function InscricaoPage() {
  const [jogadores, setJogadores] = useState<Jogador[]>([])
  const [jogadorId, setJogadorId] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const [jaInscrito, setJaInscrito] = useState(false)

  useEffect(() => {
    fetch('/api/public/jogadores')
      .then(r => r.json())
      .then(setJogadores)
      .catch(() => setMessage('Erro ao carregar jogadores.'))

    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setStatus('unsupported')
    } else if (Notification.permission === 'denied') {
      setStatus('denied')
    }

    // Check if already subscribed
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          if (sub) setJaInscrito(true)
        })
      })
    }
  }, [])

  async function handleSubscribe() {
    if (!jogadorId) {
      setMessage('Selecione seu nome primeiro.')
      return
    }

    setStatus('loading')
    setMessage('')

    try {
      const registration = await navigator.serviceWorker.ready

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus('denied')
        setMessage('Você recusou as notificações. Para ativar, vá nas configurações do navegador.')
        return
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      })

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jogador_id: jogadorId, subscription }),
      })

      if (!res.ok) throw new Error('Falha ao salvar inscrição')

      setStatus('success')
      setJaInscrito(true)
      setMessage('Pronto! Você receberá notificações quando a lista abrir ou houver avisos de pagamento.')
    } catch {
      setStatus('error')
      setMessage('Algo deu errado. Tente novamente.')
    }
  }

  async function handleUnsubscribe() {
    setStatus('loading')
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) await subscription.unsubscribe()

      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jogador_id: jogadorId }),
      })

      setJaInscrito(false)
      setStatus('idle')
      setMessage('Notificações desativadas.')
    } catch {
      setStatus('error')
      setMessage('Erro ao desativar. Tente novamente.')
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-2xl mb-4">
            <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <h1 className="text-gray-800 text-2xl font-bold">Futebol Amigos</h1>
          <p className="text-gray-500 text-sm mt-1">Ativar notificações</p>
        </div>

        {status === 'unsupported' ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-yellow-800 text-sm text-center">
            Seu navegador não suporta notificações push. Tente instalar o app ou usar o Chrome/Edge.
          </div>
        ) : status === 'denied' ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm text-center">
            Notificações bloqueadas. Vá em Configurações do navegador → Privacidade → Notificações e permita este site.
          </div>
        ) : status === 'success' ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-700 text-sm text-center">
            <svg className="w-8 h-8 text-green-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {message}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <p className="text-gray-600 text-sm">
              Selecione seu nome para receber avisos quando a lista de uma partida abrir ou quando houver lembrete de pagamento.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Seu nome</label>
              <select
                value={jogadorId}
                onChange={e => setJogadorId(e.target.value)}
                className="w-full bg-white border border-[#e0e0e0] rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:border-green-500 transition-colors"
              >
                <option value="">Selecione...</option>
                {jogadores.map(j => (
                  <option key={j.id} value={j.id}>{j.nome}</option>
                ))}
              </select>
            </div>

            {message && (
              <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2">{message}</p>
            )}

            {jaInscrito ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 rounded-lg px-4 py-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Notificações ativas neste dispositivo
                </div>
                <button
                  onClick={handleUnsubscribe}
                  disabled={status === 'loading'}
                  className="w-full border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 font-medium py-3 rounded-lg transition-colors text-sm"
                >
                  Desativar notificações
                </button>
              </div>
            ) : (
              <button
                onClick={handleSubscribe}
                disabled={status === 'loading' || !jogadorId}
                className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                {status === 'loading' ? 'Ativando...' : 'Ativar notificações'}
              </button>
            )}
          </div>
        )}

        <p className="text-center text-gray-400 text-xs mt-6">
          Você pode desativar a qualquer momento pelas configurações do navegador.
        </p>
      </div>
    </div>
  )
}

