import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AuthProvider from '@/components/AuthProvider'
import PwaRegistrar from '@/components/PwaRegistrar'
import { ToastProvider } from '@/components/ui/Toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Barcelombra Fútbol',
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
        <meta name="apple-mobile-web-app-title" content="Barcelombra" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className={`${inter.className} h-full`}>
        <ToastProvider><AuthProvider>{children}</AuthProvider></ToastProvider>
        <PwaRegistrar />
      </body>
    </html>
  )
}
