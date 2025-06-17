import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
// import { PrismaAdapter } from '@next-auth/prisma-adapter' // Credentials ProviderとAdapter併用は非推奨
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  // Note: Credentials ProviderはAdapterと併用不可のため、JWTベースで運用
  // adapter: PrismaAdapter(prisma),
  
  providers: [
    // Email/Password認証
    CredentialsProvider({
      id: 'credentials',
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        console.log('🔐 認証開始:', credentials?.email)
        
        if (!credentials?.email || !credentials?.password) {
          console.log('❌ 認証失敗: 資格情報が不完全')
          return null
        }

        console.log('📧 メール:', credentials.email)
        console.log('🔑 パスワード:', credentials.password)

        // 開発用の簡易認証（テスト用アカウント）
        if (credentials.email === 'test@example.com' && credentials.password === 'password') {
          try {
            console.log('✅ テストアカウントの認証情報が正しい')
            
            // ユーザーがデータベースに存在するかチェック、なければ作成
            let user = await prisma.user.findUnique({
              where: {
                email: credentials.email
              }
            })

            console.log('👤 既存ユーザー:', user ? 'あり' : 'なし')

            if (!user) {
              console.log('🆕 新規ユーザーを作成中...')
              user = await prisma.user.create({
                data: {
                  email: credentials.email,
                  name: 'テストユーザー',
                  // SQLite互換のため、preferencesを文字列として保存
                  preferences: '{"theme":"light","language":"ja","timeFormat":"24h","weekStartDay":1}'
                }
              })
              console.log('✅ ユーザー作成完了:', user.id)
            }

            const result = {
              id: user.id,
              email: user.email,
              name: user.name,
            }
            console.log('🎉 認証成功:', result)
            return result

          } catch (error) {
            console.error('❌ データベースエラー:', error)
            return null
          }
        }

        console.log('❌ 認証失敗: 不正な資格情報')
        return null
      }
    }),

    // Google OAuth認証（APIキーが設定されている場合のみ有効）
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      })
    ] : [])
  ],
  
  // セッション設定
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30日
  },
  
  // JWT設定
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30日
  },
  
  // 重要: JWTシークレットを設定
  secret: process.env.NEXTAUTH_SECRET,
  
  // コールバック設定
  callbacks: {
    async jwt({ token, user, account }) {
      // 初回ログイン時にユーザー情報をトークンに追加
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
      }
      return token
    },
    async session({ session, token }) {
      // トークンからセッションにユーザー情報を追加
      if (token) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // 認証後のリダイレクト先を制御
      if (url.startsWith('/')) return `${baseUrl}${url}`
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    }
  },
  
  // カスタムページ
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error', // エラーページを追加
  },
  
  // デバッグモード（開発環境のみ）
  debug: process.env.NODE_ENV === 'development',
  
  // イベントハンドラー
  events: {
    async signIn({ user, account, profile }) {
      console.log('✅ ログインイベント:', { userId: user.id, email: user.email })
    },
    async signOut({ session, token }) {
      console.log('👋 ログアウトイベント:', { userId: token?.id })
    },
  },
} 