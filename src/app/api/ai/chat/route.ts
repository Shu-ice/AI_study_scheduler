import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getOpenAIClient } from '@/lib/openai'
import { ChatRequest, AIResponse } from '@/types'

export async function POST(req: NextRequest) {
  try {
    // 認証チェック
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    const body: ChatRequest = await req.json()
    const { message, conversationId } = body

    if (!message?.trim()) {
      return NextResponse.json(
        { error: 'メッセージが必要です' },
        { status: 400 }
      )
    }

    // OpenAI APIキーの確認
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY
    
    if (!hasOpenAIKey) {
      // モック応答（開発時用）
      const mockResponse = generateMockResponse(message)
      
      const response: AIResponse = {
        success: true,
        data: {
          content: mockResponse.content,
          metadata: mockResponse.metadata
        },
        metadata: {
          model: 'mock-gpt-4o-mini',
          tokens: 150,
          duration: 500
        }
      }

      return NextResponse.json(response)
    }

    // OpenAI API呼び出し（Claude Code実装）
    const openaiClient = getOpenAIClient()
    
    // システムプロンプトの構築
    let systemPrompt = `あなたは週間バーティカル計画表アプリケーションのアシスタントです。
ユーザーのタスク管理とスケジュール作成をサポートしてください。

以下の役割を果たしてください：
1. タスクの整理と優先度付けの提案
2. 効率的なスケジュール配置のアドバイス
3. 時間管理のベストプラクティス提供
4. モチベーション維持のサポート

回答は簡潔で実用的なものにしてください。日本語で回答してください。`

    // コンテキスト情報を追加
    if (body.context?.tasks && body.context.tasks.length > 0) {
      systemPrompt += `\n\n現在のタスク状況：
${body.context.tasks.map((task: any) => 
  `- ${task.title} (優先度: ${task.priority}, ステータス: ${task.status})`
).join('\n')}`
    }

    if (body.context?.schedules && body.context.schedules.length > 0) {
      systemPrompt += `\n\n今日のスケジュール：
${body.context.schedules.map((schedule: any) => 
  `- ${schedule.startTime}-${schedule.endTime}: ${schedule.title}`
).join('\n')}`
    }

    // OpenAI APIを呼び出し
    const response = await openaiClient.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message }
    ])

    if (!response.success) {
      return NextResponse.json(
        { 
          success: false,
          error: response.error || 'AI応答の生成に失敗しました' 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        content: response.data,
        conversationId: conversationId || `chat_${Date.now()}`
      },
      metadata: response.metadata
    })

  } catch (error) {
    console.error('AI chat error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'AIチャットの処理中にエラーが発生しました' 
      },
      { status: 500 }
    )
  }
}

// モック応答生成関数
function generateMockResponse(message: string) {
  const lowerMessage = message.toLowerCase()
  
  // タスク関連のキーワード検出
  if (lowerMessage.includes('タスク') || lowerMessage.includes('やること') || lowerMessage.includes('作業')) {
    return {
      content: `「${message}」について理解しました！\n\nこちらをタスクとして追加することをお勧めします：\n\n• 優先度: 中\n• 見積もり時間: 60分\n• カテゴリ: 作業\n\nタスクに追加しますか？`,
      metadata: {
        suggestedTask: {
          title: message.length > 50 ? message.substring(0, 50) + '...' : message,
          description: `AIが自動生成: ${message}`,
          estimatedDuration: 60,
          priority: 'medium' as const,
          status: 'pending' as const
        }
      }
    }
  }
  
  // スケジュール関連のキーワード検出
  if (lowerMessage.includes('スケジュール') || lowerMessage.includes('予定') || lowerMessage.includes('時間')) {
    return {
      content: `スケジュールについてですね！\n\n現在の空き時間を確認して、最適な時間帯を提案できます。\n\n• 午前中 (9:00-12:00): 集中作業に最適\n• 午後 (14:00-17:00): 会議や打ち合わせに適している\n\nどの時間帯がご希望ですか？`
    }
  }
  
  // 一般的な応答
  const responses = [
    `「${message}」について承知しました！\n\nタスクやスケジュールの管理について、どのようなサポートが必要でしょうか？\n\n• タスクの追加や編集\n• スケジュールの最適化\n• 進捗の確認\n\nお気軽にお聞かせください。`,
    `こんにちは！「${message}」についてお手伝いします。\n\n効率的なスケジュール管理のコツ：\n\n1. 重要度と緊急度でタスクを分類\n2. 集中できる時間帯を把握\n3. 適切な休憩時間の確保\n\n他にご質問はありますか？`,
    `ありがとうございます！\n\n「${message}」に関して、以下のような管理方法をお勧めします：\n\n✓ 明確な目標設定\n✓ 小さなステップに分割\n✓ 定期的な進捗確認\n\n具体的にどの部分でサポートが必要でしょうか？`
  ]
  
  return {
    content: responses[Math.floor(Math.random() * responses.length)]
  }
}