'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'

type Mode = 'login' | 'forgot'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    // Supabase redireciona convites para /login — reencaminhar para /aceitar-convite
    if (typeof window !== 'undefined' && window.location.hash.includes('type=invite')) {
      window.location.href = '/aceitar-convite' + window.location.hash
      return
    }

    createClient().auth.getUser().then(({ data: { user } }) => {
      const role = (user?.app_metadata as Record<string, string> | undefined)?.role
      if (role === 'admin') window.location.href = '/partidas'
      else if (role === 'jogador') window.location.href = '/portal'
    })
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await createClient().auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); return }
      window.location.href = '/partidas'
    } finally {
      setLoading(false)
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await createClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) { setError(error.message); return }
      setSuccess('E-mail enviado! Verifique sua caixa de entrada para redefinir a senha.')
    } finally {
      setLoading(false)
    }
  }

  function switchMode(next: Mode) {
    setError('')
    setSuccess('')
    setMode(next)
  }

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/Barcelombra_transparente.png" alt="Barcelombra Fútbol" className="w-24 h-24 object-contain mb-0 mx-auto" />
          <h1 className="text-gray-800 text-2xl font-bold">Barcelombra Fútbol</h1>
          <p className="text-gray-500 text-sm mt-1">
            {mode === 'login' ? 'Entre com sua conta' : 'Redefinir senha'}
          </p>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-white border border-[#e0e0e0] rounded-lg px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 transition-colors"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-600">Senha</label>
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-xs text-green-600 hover:text-green-700 hover:underline"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full bg-white border border-[#e0e0e0] rounded-lg px-4 py-3 pr-12 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgot} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-white border border-[#e0e0e0] rounded-lg px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 transition-colors"
                placeholder="seu@email.com"
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                {error}
              </p>
            )}

            {success && (
              <p className="text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                {success}
              </p>
            )}

            {!success && (
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                {loading ? 'Enviando...' : 'Enviar e-mail de redefinição'}
              </button>
            )}

            <button
              type="button"
              onClick={() => switchMode('login')}
              className="w-full text-sm text-gray-500 hover:text-gray-700 hover:underline text-center"
            >
              Voltar ao login
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
