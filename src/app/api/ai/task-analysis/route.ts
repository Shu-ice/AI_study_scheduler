import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getOpenAIClient } from '@/lib/openai'
import { prisma } from '@/lib/prisma'
import { TaskAnalysisRequest, TaskAnalysisResponse } from '@/types'
import { TaskPriority, TaskStatus } from '@/types'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    const body: TaskAnalysisRequest = await request.json()
    const { taskDescription, existingTasks, deadline, preferences } = body

    if (!taskDescription || taskDescription.trim().length === 0) {
      return NextResponse.json(
        { error: 'タスク説明は必須です' },
        { status: 400 }
      )
    }

    if (taskDescription.length > 1000) {
      return NextResponse.json(
        { error: 'タスク説明は1000文字以内で入力してください' },
        { status: 400 }
      )
    }

    // 既存タスクを取得（指定されていない場合）
    let userExistingTasks = existingTasks
    if (!userExistingTasks) {
      const tasks = await prisma.task.findMany({
        where: { 
          userId: session.user.id,
          status: { not: 'COMPLETED' }
        },
        include: { category: true },
        take: 10 // 最新10件に制限
      })
      
      userExistingTasks = tasks.map(task => ({
        id: task.id,
        userId: task.userId,
        title: task.title,
        description: task.description || undefined,
        priority: task.priority.toLowerCase() as TaskPriority,
        status: task.status.toLowerCase() as TaskStatus,
        estimatedDuration: task.estimatedDuration,
        category: {
          ...task.category,
          icon: task.category.icon || undefined
        },
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      }))
    }

    // ユーザーのカテゴリ一覧を取得
    const categories = await prisma.scheduleCategory.findMany({
      where: { userId: session.user.id },
      select: { id: true, name: true, color: true }
    })

    const openaiClient = getOpenAIClient()

    // OpenAI APIでタスク分析実行
    const response = await openaiClient.generateTaskAnalysis(
      taskDescription,
      {
        existingTasks: userExistingTasks,
        deadline,
        preferences: {
          ...preferences,
          availableCategories: categories.map(cat => cat.name)
        }
      }
    )

    if (!response.success) {
      return NextResponse.json(
        { error: response.error || 'タスク分析の生成に失敗しました' },
        { status: 500 }
      )
    }

    // AIの応答をパース
    let analysisResult: TaskAnalysisResponse
    try {
      const aiData = JSON.parse(response.data!)
      
      // レスポンス形式のバリデーション
      if (!aiData.suggestedTasks || !Array.isArray(aiData.suggestedTasks)) {
        throw new Error('Invalid AI response format')
      }

      // カテゴリIDをマッピング
      const processedTasks = aiData.suggestedTasks.map((task: any) => {
        const category = categories.find(cat => 
          cat.name.toLowerCase() === task.category?.toLowerCase()
        ) || categories[0] || null

        return {
          title: task.title,
          description: task.description,
          estimatedDuration: Math.max(15, Math.min(480, task.estimatedDuration || 60)), // 15分-8時間の範囲
          priority: ['low', 'medium', 'high'].includes(task.priority) ? task.priority : 'medium',
          categoryId: category?.id,
          categoryName: category?.name || 'その他'
        }
      })

      analysisResult = {
        suggestedTasks: processedTasks,
        insights: aiData.insights || [],
        estimatedEffort: {
          total: aiData.estimatedEffort?.total || 
                 processedTasks.reduce((sum: number, task: any) => sum + task.estimatedDuration, 0),
          breakdown: aiData.estimatedEffort?.breakdown || 
                     processedTasks.map((task: any) => ({
                       task: task.title,
                       duration: task.estimatedDuration
                     }))
        }
      }
    } catch (parseError) {
      console.error('AI Response Parse Error:', parseError)
      return NextResponse.json(
        { error: 'AI応答の解析に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ...analysisResult,
      metadata: {
        requestId: `analysis_${Date.now()}`,
        processingTime: response.metadata?.duration,
        model: response.metadata?.model
      }
    })

  } catch (error) {
    console.error('Task Analysis Error:', error)
    
    if (error instanceof Error && error.message.includes('レート制限')) {
      return NextResponse.json(
        { error: 'API使用量の制限に達しました。しばらくお待ちください。' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: 'タスク分析中にエラーが発生しました' },
      { status: 500 }
    )
  }
}