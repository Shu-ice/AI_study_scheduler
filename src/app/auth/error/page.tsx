'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const errorMessages: { [key: string]: string } = {
  Configuration: 'サーバーの設定に問題があります。管理者にお問い合わせください。',
  AccessDenied: 'アクセスが拒否されました。',
  Verification: 'メール認証が失敗しました。',
  Default: '認証中にエラーが発生しました。',
  CredentialsSignin: 'メールアドレスまたはパスワードが正しくありません。',
  OAuthSignin: 'OAuth認証に失敗しました。',
  OAuthCallback: 'OAuth認証のコールバックでエラーが発生しました。',
  OAuthCreateAccount: 'OAuthアカウントの作成に失敗しました。',
  EmailCreateAccount: 'メールアカウントの作成に失敗しました。',
  Callback: 'コールバック処理でエラーが発生しました。',
  OAuthAccountNotLinked: 'このメールアドレスは既に別のアカウントで使用されています。',
  EmailSignin: 'メール送信に失敗しました。',
  CredentialsSignup: 'アカウント作成に失敗しました。',
  SessionRequired: 'このページにアクセスするにはログインが必要です。',
}

export default function AuthError() {
  const searchParams = useSearchParams()
  const [error, setError] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      setError(errorParam)
      setErrorMessage(errorMessages[errorParam] || errorMessages.Default)
    }
  }, [searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-red-600">
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            認証エラー
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            ログイン処理中に問題が発生しました
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  {errorMessage}
                </h3>
                {error && (
                  <div className="mt-2 text-sm text-red-700">
                    <p>エラーコード: {error}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              <h4 className="font-medium text-gray-900 mb-2">解決方法:</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>メールアドレスとパスワードを確認してください</li>
                <li>ブラウザのキャッシュをクリアしてみてください</li>
                <li>しばらく時間をおいてから再度お試しください</li>
                <li>問題が続く場合は管理者にお問い合わせください</li>
              </ul>
            </div>

            <div className="flex flex-col space-y-2">
              <Link
                href="/auth/signin"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                ログインページに戻る
              </Link>
              
              <Link
                href="/"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                ホームページに戻る
              </Link>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-500">
                テスト用アカウント: test@example.com / password
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 