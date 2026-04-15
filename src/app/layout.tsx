import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AuthProvider from '@/components/AuthProvider'
import PwaRegistrar from '@/components/PwaRegistrar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Futebol Amigos',
  description: 'Gerencie seu futebol de domingo',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <head>
        <meta name="theme-color" content="#22c55e" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="FutebolAmigos" />
      </head>
      <body className={`${inter.className} h-full`}>
        <AuthProvider>{children}</AuthProvider>
        <PwaRegistrar />
      </body>
    </html>
  )
}
