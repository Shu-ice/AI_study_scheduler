import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validateTaskData } from '@/lib/taskUtils'

// GET: 特定のタスク詳細取得
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    const task = await prisma.task.findUnique({
      where: { 
        id: params.id,
        userId: session.user.id // ユーザー認証チェック
      },
      include: {
        category: true
      }
    })

    if (!task) {
      return NextResponse.json(
        { error: 'タスクが見つかりません' },
        { status: 404 }
      )
    }

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

    return NextResponse.json(formattedTask)
  } catch (error) {
    console.error('タスク取得エラー:', error)
    return NextResponse.json(
      { error: 'タスクの取得に失敗しました' },
      { status: 500 }
    )
  }
}

// PUT: タスク更新
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // タスクの存在確認とユーザー認証
    const existingTask = await prisma.task.findUnique({
      where: { 
        id: params.id,
        userId: session.user.id
      }
    })

    if (!existingTask) {
      return NextResponse.json(
        { error: 'タスクが見つかりません' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const {
      title,
      description,
      estimatedDuration,
      priority,
      deadline,
      categoryId,
      status
    } = body

    // バリデーション（更新データのみ）
    const updateData: any = {}
    
    if (title !== undefined) {
      if (!title || title.trim().length === 0) {
        return NextResponse.json(
          { error: 'タイトルは必須です' },
          { status: 400 }
        )
      }
      updateData.title = title.trim()
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null
    }

    if (estimatedDuration !== undefined) {
      const duration = parseInt(estimatedDuration)
      if (isNaN(duration) || duration < 1 || duration > 1440) {
        return NextResponse.json(
          { error: '推定時間は1-1440分の範囲で入力してください' },
          { status: 400 }
        )
      }
      updateData.estimatedDuration = duration
    }

    if (priority !== undefined) {
      const validPriorities = ['low', 'medium', 'high']
      if (!validPriorities.includes(priority)) {
        return NextResponse.json(
          { error: '無効な優先度です' },
          { status: 400 }
        )
      }
      updateData.priority = priority.toUpperCase()
    }

    if (deadline !== undefined) {
      if (deadline === null) {
        updateData.deadline = null
      } else {
        const deadlineDate = new Date(deadline)
        if (isNaN(deadlineDate.getTime())) {
          return NextResponse.json(
            { error: '無効な期限日です' },
            { status: 400 }
          )
        }
        updateData.deadline = deadlineDate
      }
    }

    if (status !== undefined) {
      const validStatuses = ['pending', 'in-progress', 'completed', 'cancelled']
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: '無効なステータスです' },
          { status: 400 }
        )
      }
      updateData.status = status.replace('-', '_').toUpperCase()
    }

    if (categoryId !== undefined) {
      // カテゴリーの存在確認
      const category = await prisma.scheduleCategory.findUnique({
        where: { id: categoryId }
      })

      if (!category || category.userId !== session.user.id) {
        return NextResponse.json(
          { error: '指定されたカテゴリーが見つかりません' },
          { status: 400 }
        )
      }
      updateData.categoryId = categoryId
    }

    // タスク更新
    const updatedTask = await prisma.task.update({
      where: { id: params.id },
      data: updateData,
      include: {
        category: true
      }
    })

    // レスポンス用にデータ変換
    const formattedTask = {
      id: updatedTask.id,
      userId: updatedTask.userId,
      title: updatedTask.title,
      description: updatedTask.description,
      estimatedDuration: updatedTask.estimatedDuration,
      priority: updatedTask.priority.toLowerCase(),
      deadline: updatedTask.deadline,
      category: updatedTask.category,
      status: updatedTask.status.toLowerCase().replace('_', '-'),
      createdAt: updatedTask.createdAt,
      updatedAt: updatedTask.updatedAt
    }

    return NextResponse.json(formattedTask)
  } catch (error) {
    console.error('タスク更新エラー:', error)
    return NextResponse.json(
      { error: 'タスクの更新に失敗しました' },
      { status: 500 }
    )
  }
}

// DELETE: タスク削除
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // タスクの存在確認とユーザー認証
    const existingTask = await prisma.task.findUnique({
      where: { 
        id: params.id,
        userId: session.user.id
      }
    })

    if (!existingTask) {
      return NextResponse.json(
        { error: 'タスクが見つかりません' },
        { status: 404 }
      )
    }

    // タスク削除
    await prisma.task.delete({
      where: { id: params.id }
    })

    return NextResponse.json(
      { message: 'タスクが削除されました' },
      { status: 200 }
    )
  } catch (error) {
    console.error('タスク削除エラー:', error)
    return NextResponse.json(
      { error: 'タスクの削除に失敗しました' },
      { status: 500 }
    )
  }
}