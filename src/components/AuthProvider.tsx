'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
        router.push('/login')
      }
    })

    // Handle invalid refresh token on mount
    supabase.auth.getSession().catch(() => {
      supabase.auth.signOut()
      router.push('/login')
    })

    return () => subscription.unsubscribe()
  }, [router])

  return <>{children}</>
}
