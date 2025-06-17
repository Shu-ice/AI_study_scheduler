import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validateRecurrencePattern } from '@/lib/recurrence'

interface Params {
  params: {
    id: string
  }
}

// PUT: スケジュール更新
export async function PUT(request: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    const scheduleId = params.id
    const body = await request.json()
    const {
      title,
      description,
      startTime,
      endTime,
      date,
      categoryId,
      isFixed,
      repeatPattern
    } = body

    // スケジュールが存在し、ユーザーが所有者かチェック
    const existingSchedule = await prisma.schedule.findFirst({
      where: {
        id: scheduleId,
        userId: session.user.id
      }
    })

    if (!existingSchedule) {
      return NextResponse.json(
        { error: 'スケジュールが見つからないか、アクセス権限がありません' },
        { status: 404 }
      )
    }

    // カテゴリーが存在するかチェック
    if (categoryId) {
      const category = await prisma.scheduleCategory.findUnique({
        where: { id: categoryId }
      })

      if (!category) {
        return NextResponse.json(
          { error: '指定されたカテゴリーが見つかりません' },
          { status: 400 }
        )
      }
    }

    // 繰り返しパターンのバリデーション（設定されている場合）
    if (repeatPattern) {
      const validation = validateRecurrencePattern(repeatPattern)
      if (!validation.isValid) {
        return NextResponse.json(
          { error: `繰り返しパターンエラー: ${validation.errors.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // スケジュール更新
    const updatedSchedule = await prisma.schedule.update({
      where: { id: scheduleId },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(startTime && { startTime }),
        ...(endTime && { endTime }),
        ...(date && { date: new Date(date) }),
        ...(categoryId && { categoryId }),
        ...(isFixed !== undefined && { isFixed }),
        ...(repeatPattern !== undefined && { 
          repeatPattern: repeatPattern ? JSON.stringify(repeatPattern) : null 
        })
      },
      include: {
        category: true
      }
    })

    return NextResponse.json(updatedSchedule)
  } catch (error) {
    console.error('スケジュール更新エラー:', error)
    return NextResponse.json(
      { error: 'スケジュールの更新に失敗しました' },
      { status: 500 }
    )
  }
}

// DELETE: スケジュール削除
export async function DELETE(request: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    const scheduleId = params.id

    // スケジュールが存在し、ユーザーが所有者かチェック
    const existingSchedule = await prisma.schedule.findFirst({
      where: {
        id: scheduleId,
        userId: session.user.id
      }
    })

    if (!existingSchedule) {
      return NextResponse.json(
        { error: 'スケジュールが見つからないか、アクセス権限がありません' },
        { status: 404 }
      )
    }

    // スケジュール削除
    await prisma.schedule.delete({
      where: { id: scheduleId }
    })

    return NextResponse.json(
      { message: 'スケジュールが削除されました' },
      { status: 200 }
    )
  } catch (error) {
    console.error('スケジュール削除エラー:', error)
    return NextResponse.json(
      { error: 'スケジュールの削除に失敗しました' },
      { status: 500 }
    )
  }
} 