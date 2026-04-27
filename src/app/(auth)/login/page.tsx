'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'

// Captura o hash antes do Supabase o limpar (executa sincronamente no cliente)
const _initialHash = typeof window !== 'undefined' ? window.location.hash : ''

const SPECIAL_CHARS = '@!#$%^&*()_-+=.?'
type Requirement = { label: string; met: boolean }
function getRequirements(p: string): Requirement[] {
  return [
    { label: 'Mínimo 8 caracteres', met: p.length >= 8 },
    { label: 'Letra maiúscula (A-Z)', met: /[A-Z]/.test(p) },
    { label: 'Letra minúscula (a-z)', met: /[a-z]/.test(p) },
    { label: 'Número (0-9)', met: /\d/.test(p) },
    { label: `Caractere especial (${SPECIAL_CHARS})`, met: /[@!#$%^&*()\-_+=.?]/.test(p) },
  ]
}

type Mode = 'login' | 'forgot'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Invite flow state
  const [isInvite, setIsInvite] = useState(false)
  const [inviteReady, setInviteReady] = useState(false)
  const [invitePassword, setInvitePassword] = useState('')
  const [inviteConfirm, setInviteConfirm] = useState('')
  const [inviteShowPassword, setInviteShowPassword] = useState(false)
  const [inviteShowConfirm, setInviteShowConfirm] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState(false)

  useEffect(() => {
    // Fluxo de convite — Supabase redireciona para /login com type=invite no hash
    if (_initialHash.includes('type=invite')) {
      setIsInvite(true)
      setInviteReady(true) // mostra o formulário imediatamente — a sessão já foi estabelecida pelo Supabase ao processar o hash
      return
    }

    // Fluxo normal — redirecionar se já autenticado
    createClient().auth.getUser().then(({ data: { user } }) => {
      const role = (user?.app_metadata as Record<string, string> | undefined)?.role
      if (role === 'admin') window.location.href = '/partidas'
      else if (role === 'jogador') window.location.href = '/portal'
    })
  }, [])

  // --- Invite form ---
  const inviteRequirements = getRequirements(invitePassword)
  const inviteAllMet = inviteRequirements.every(r => r.met)
  const inviteMatch = invitePassword === inviteConfirm

  async function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault()
    setInviteError('')
    if (!inviteAllMet) { setInviteError('A senha não atende a todos os requisitos.'); return }
    if (!inviteMatch) { setInviteError('As senhas não coincidem.'); return }
    setInviteLoading(true)
    try {
      const supabase = createClient()

      // Garante que a sessão está estabelecida a partir dos tokens do hash
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        const params = new URLSearchParams(_initialHash.replace(/^#/, ''))
        const access_token = params.get('access_token') ?? ''
        const refresh_token = params.get('refresh_token') ?? ''
        if (!access_token || !refresh_token) {
          setInviteError('Sessão expirada. Pede um novo convite ao administrador.')
          return
        }
        const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token })
        if (sessionError) { setInviteError(sessionError.message); return }
      }

      const { error } = await supabase.auth.updateUser({ password: invitePassword })
      if (error) { setInviteError(error.message); return }
      setInviteSuccess(true)
      setTimeout(() => { window.location.href = '/portal' }, 2000)
    } finally {
      setInviteLoading(false)
    }
  }

  if (isInvite) {
    return (
      <div className="min-h-screen bg-[#f4f6f9] flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <img src="/Barcelombra_transparente.png" alt="Barcelombra Fútbol" className="w-24 h-24 object-contain mb-0 mx-auto" />
            <h1 className="text-gray-800 text-2xl font-bold">Barcelombra Fútbol</h1>
            <p className="text-gray-500 text-sm mt-1">Bem-vindo! Cria a tua senha para entrar.</p>
          </div>

          {inviteSuccess ? (
            <div className="text-center space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-4">
                <p className="text-green-700 font-medium">Senha criada com sucesso!</p>
                <p className="text-green-600 text-sm mt-1">A entrar no portal...</p>
              </div>
              <a href="/portal" className="block text-sm text-gray-500 hover:underline">Entrar agora</a>
            </div>
          ) : (
            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Criar senha</label>
                <div className="relative">
                  <input
                    type={inviteShowPassword ? 'text' : 'password'}
                    value={invitePassword}
                    onChange={e => setInvitePassword(e.target.value)}
                    required
                    className="w-full bg-white border border-[#e0e0e0] rounded-lg px-4 py-3 pr-12 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 transition-colors"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setInviteShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                    <EyeIcon open={inviteShowPassword} />
                  </button>
                </div>
              </div>

              {invitePassword.length > 0 && (
                <ul className="space-y-1 bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">
                  {inviteRequirements.map(req => (
                    <li key={req.label} className={`flex items-center gap-2 text-xs ${req.met ? 'text-green-600' : 'text-gray-400'}`}>
                      <span>{req.met ? '✓' : '○'}</span>{req.label}
                    </li>
                  ))}
                </ul>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Confirmar senha</label>
                <div className="relative">
                  <input
                    type={inviteShowConfirm ? 'text' : 'password'}
                    value={inviteConfirm}
                    onChange={e => setInviteConfirm(e.target.value)}
                    required
                    className={`w-full bg-white border rounded-lg px-4 py-3 pr-12 text-gray-800 placeholder-gray-400 focus:outline-none transition-colors ${
                      inviteConfirm.length > 0
                        ? inviteMatch ? 'border-green-400 focus:border-green-500' : 'border-red-300 focus:border-red-400'
                        : 'border-[#e0e0e0] focus:border-green-500'
                    }`}
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setInviteShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                    <EyeIcon open={inviteShowConfirm} />
                  </button>
                </div>
                {inviteConfirm.length > 0 && !inviteMatch && (
                  <p className="text-xs text-red-500 mt-1">As senhas não coincidem.</p>
                )}
              </div>

              {inviteError && (
                <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2">{inviteError}</p>
              )}

              <button type="submit" disabled={inviteLoading || !inviteAllMet || !inviteMatch}
                className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors">
                {inviteLoading ? 'A criar...' : 'Criar senha e entrar'}
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  // --- Login normal ---
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

  function switchMode(next: Mode) { setError(''); setSuccess(''); setMode(next) }

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
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
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full bg-white border border-[#e0e0e0] rounded-lg px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 transition-colors"
                placeholder="seu@email.com" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-600">Senha</label>
                <button type="button" onClick={() => switchMode('forgot')}
                  className="text-xs text-green-600 hover:text-green-700 hover:underline">
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} required
                  className="w-full bg-white border border-[#e0e0e0] rounded-lg px-4 py-3 pr-12 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 transition-colors"
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>
            {error && <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors">
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgot} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full bg-white border border-[#e0e0e0] rounded-lg px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 transition-colors"
                placeholder="seu@email.com" />
            </div>
            {error && <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}
            {success && <p className="text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg px-4 py-2">{success}</p>}
            {!success && (
              <button type="submit" disabled={loading}
                className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors">
                {loading ? 'Enviando...' : 'Enviar e-mail de redefinição'}
              </button>
            )}
            <button type="button" onClick={() => switchMode('login')}
              className="w-full text-sm text-gray-500 hover:text-gray-700 hover:underline text-center">
              Voltar ao login
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
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
  )
}
