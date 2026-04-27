'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'

const SPECIAL_CHARS = '@!#$%^&*()_-+=.?'

type Requirement = { label: string; met: boolean }

function getRequirements(password: string): Requirement[] {
  return [
    { label: 'Mínimo 8 caracteres', met: password.length >= 8 },
    { label: 'Letra maiúscula (A-Z)', met: /[A-Z]/.test(password) },
    { label: 'Letra minúscula (a-z)', met: /[a-z]/.test(password) },
    { label: 'Número (0-9)', met: /\d/.test(password) },
    { label: `Caractere especial (${SPECIAL_CHARS})`, met: /[@!#$%^&*()\-_+=.?]/.test(password) },
  ]
}

export default function AceitarConvitePage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  const requirements = getRequirements(password)
  const allMet = requirements.every(r => r.met)
  const passwordsMatch = password === confirm

  useEffect(() => {
    const supabase = createClient()

    // Para convites, o Supabase processa o hash e dispara SIGNED_IN
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') setSessionReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!allMet) { setError('A senha não atende a todos os requisitos.'); return }
    if (!passwordsMatch) { setError('As senhas não coincidem.'); return }

    setLoading(true)
    try {
      const { error } = await createClient().auth.updateUser({ password })
      if (error) { setError(error.message); return }
      setSuccess(true)
      setTimeout(() => { window.location.href = '/portal' }, 3000)
    } finally {
      setLoading(false)
    }
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-[#f4f6f9] flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <img src="/Barcelombra_transparente.png" alt="Barcelombra Fútbol" className="w-24 h-24 object-contain mx-auto mb-4" />
          <p className="text-gray-500 text-sm">A validar o convite...</p>
          <p className="text-gray-400 text-xs mt-2">
            Se nada acontecer,{' '}
            <a href="/login" className="text-green-600 hover:underline">vai para o login</a>{' '}
            e pede um novo convite ao administrador.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/Barcelombra_transparente.png" alt="Barcelombra Fútbol" className="w-24 h-24 object-contain mb-0 mx-auto" />
          <h1 className="text-gray-800 text-2xl font-bold">Barcelombra Fútbol</h1>
          <p className="text-gray-500 text-sm mt-1">Bem-vindo! Cria a tua senha para aceder ao portal.</p>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-4">
              <p className="text-green-700 font-medium">Senha criada com sucesso!</p>
              <p className="text-green-600 text-sm mt-1">A entrar no portal...</p>
            </div>
            <a href="/portal" className="block text-sm text-gray-500 hover:underline">
              Entrar agora
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Criar senha</label>
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
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            {password.length > 0 && (
              <ul className="space-y-1 bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">
                {requirements.map(req => (
                  <li key={req.label} className={`flex items-center gap-2 text-xs ${req.met ? 'text-green-600' : 'text-gray-400'}`}>
                    <span>{req.met ? '✓' : '○'}</span>
                    {req.label}
                  </li>
                ))}
              </ul>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Confirmar senha</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  className={`w-full bg-white border rounded-lg px-4 py-3 pr-12 text-gray-800 placeholder-gray-400 focus:outline-none transition-colors ${
                    confirm.length > 0
                      ? passwordsMatch
                        ? 'border-green-400 focus:border-green-500'
                        : 'border-red-300 focus:border-red-400'
                      : 'border-[#e0e0e0] focus:border-green-500'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
              {confirm.length > 0 && !passwordsMatch && (
                <p className="text-xs text-red-500 mt-1">As senhas não coincidem.</p>
              )}
            </div>

            {error && (
              <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !allMet || !passwordsMatch}
              className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {loading ? 'A criar...' : 'Criar senha e entrar'}
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
