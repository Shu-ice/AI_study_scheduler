import './globals.css'
import { Inter } from 'next/font/google'
import SessionProvider from '@/components/providers/SessionProvider'
import LoginButton from '@/components/auth/LoginButton'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: '週間バーティカル計画表',
  description: 'AIチャット機能を搭載した週間縦型スケジュール管理アプリ',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <SessionProvider>
          <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                  <h1 className="text-xl font-semibold text-gray-900">
                    週間バーティカル計画表
                  </h1>
                  <LoginButton />
                </div>
              </div>
            </header>
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
              {children}
            </main>
          </div>
        </SessionProvider>
      </body>
    </html>
  )
} 