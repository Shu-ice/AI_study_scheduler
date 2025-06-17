import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validateTaskData } from '@/lib/taskUtils'

// GET: タスク一覧取得
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const categoryId = searchParams.get('categoryId')
    const overdue = searchParams.get('overdue')

    let whereClause: any = {
      userId: session.user.id
    }

    // ステータスでフィルタリング
    if (status) {
      whereClause.status = status.toUpperCase()
    }

    // 優先度でフィルタリング
    if (priority) {
      whereClause.priority = priority.toUpperCase()
    }

    // カテゴリでフィルタリング
    if (categoryId) {
      whereClause.categoryId = categoryId
    }

    // 期限切れタスクのフィルタリング
    if (overdue === 'true') {
      whereClause.deadline = {
        lt: new Date()
      }
      whereClause.status = {
        not: 'COMPLETED'
      }
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        category: true
      },
      orderBy: [
        { priority: 'desc' },
        { deadline: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    // データ変換
    const formattedTasks = tasks.map(task => ({
      id: task.id,
      userId: task.userId,
      title: task.title,
      description: task.description,
      estimatedDuration: task.estimatedDuration,
      priority: task.priority.toLowerCase(),
      deadline: task.deadline,
      category: task.category,
      status: task.status.toLowerCase(),
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    }))

    return NextResponse.json(formattedTasks)
  } catch (error) {
    console.error('タスク取得エラー:', error)
    return NextResponse.json(
      { error: 'タスクの取得に失敗しました' },
      { status: 500 }
    )
  }
}

// POST: 新しいタスク作成
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      title,
      description,
      estimatedDuration,
      priority,
      deadline,
      categoryId
    } = body

    // バリデーション
    const validation = validateTaskData({
      title,
      description,
      estimatedDuration,
      priority,
      deadline,
      categoryId,
      userId: session.user.id
    })

    if (!validation.isValid) {
      return NextResponse.json(
        { error: `バリデーションエラー: ${validation.errors.join(', ')}` },
        { status: 400 }
      )
    }

    // カテゴリーが存在するかチェック
    const category = await prisma.scheduleCategory.findUnique({
      where: { id: categoryId }
    })

    if (!category || category.userId !== session.user.id) {
      return NextResponse.json(
        { error: '指定されたカテゴリーが見つかりません' },
        { status: 400 }
      )
    }

    // タスク作成
    const task = await prisma.task.create({
      data: {
        title,
        description,
        estimatedDuration: parseInt(estimatedDuration),
        priority: priority.toUpperCase(),
        deadline: deadline ? new Date(deadline) : null,
        status: 'PENDING',
        userId: session.user.id,
        categoryId
      },
      include: {
        category: true
      }
    })

    // レスポンス用にデータ変換
    const formattedTask = {
      id: task.id,
      userId: task.userId,
      title: task.title,
      description: task.description,
      estimatedDuration: task.estimatedDuration,
      priority: task.priority.toLowerCase(),
      deadline: task.deadline,
      category: task.category,
      status: task.status.toLowerCase(),
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    }

    return NextResponse.json(formattedTask, { status: 201 })
  } catch (error) {
    console.error('タスク作成エラー:', error)
    return NextResponse.json(
      { error: 'タスクの作成に失敗しました' },
      { status: 500 }
    )
  }
}