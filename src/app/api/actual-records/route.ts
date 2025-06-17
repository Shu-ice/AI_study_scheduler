import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: 実績記録の取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const scheduleId = searchParams.get('scheduleId')

    let whereClause: any = {
      schedule: {
        userId: session.user.id
      }
    }

    if (date) {
      const targetDate = new Date(date)
      const nextDate = new Date(targetDate)
      nextDate.setDate(nextDate.getDate() + 1)
      
      whereClause.schedule = {
        ...whereClause.schedule,
        date: {
          gte: targetDate,
          lt: nextDate
        }
      }
    }

    if (scheduleId) {
      whereClause.scheduleId = scheduleId
    }

    const actualRecords = await prisma.actualRecord.findMany({
      where: whereClause,
      include: {
        schedule: {
          include: {
            category: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(actualRecords)
  } catch (error) {
    console.error('実績記録取得エラー:', error)
    return NextResponse.json(
      { error: '実績記録の取得に失敗しました' },
      { status: 500 }
    )
  }
}

// POST: 実績記録の作成・更新
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const body = await request.json()
    const { scheduleId, actualStartTime, actualEndTime, notes, satisfactionRating } = body

    // スケジュールの存在確認と権限チェック
    const schedule = await prisma.schedule.findFirst({
      where: {
        id: scheduleId,
        userId: session.user.id
      }
    })

    if (!schedule) {
      return NextResponse.json(
        { error: 'スケジュールが見つからないか、アクセス権限がありません' },
        { status: 404 }
      )
    }

    // 既存の実績記録をチェック
    const existingRecord = await prisma.actualRecord.findFirst({
      where: {
        scheduleId: scheduleId
      }
    })

    let actualRecord

    if (existingRecord) {
      // 更新
      actualRecord = await prisma.actualRecord.update({
        where: { id: existingRecord.id },
        data: {
          actualStartTime,
          actualEndTime,
          notes,
          satisfactionRating
        },
        include: {
          schedule: {
            include: {
              category: true
            }
          }
        }
      })
    } else {
      // 新規作成
      actualRecord = await prisma.actualRecord.create({
        data: {
          scheduleId,
          userId: session.user.id,
          actualStartTime,
          actualEndTime,
          notes,
          satisfactionRating
        },
        include: {
          schedule: {
            include: {
              category: true
            }
          }
        }
      })
    }

    return NextResponse.json(actualRecord)
  } catch (error) {
    console.error('実績記録保存エラー:', error)
    return NextResponse.json(
      { error: '実績記録の保存に失敗しました' },
      { status: 500 }
    )
  }
}

// PUT: 実績記録の更新
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const body = await request.json()
    const { id, actualStartTime, actualEndTime, notes, satisfactionRating } = body

    // 実績記録の存在確認と権限チェック
    const existingRecord = await prisma.actualRecord.findFirst({
      where: {
        id,
        schedule: {
          userId: session.user.id
        }
      }
    })

    if (!existingRecord) {
      return NextResponse.json(
        { error: '実績記録が見つからないか、アクセス権限がありません' },
        { status: 404 }
      )
    }

    const actualRecord = await prisma.actualRecord.update({
      where: { id },
      data: {
        actualStartTime,
        actualEndTime,
        notes,
        satisfactionRating
      },
      include: {
        schedule: {
          include: {
            category: true
          }
        }
      }
    })

    return NextResponse.json(actualRecord)
  } catch (error) {
    console.error('実績記録更新エラー:', error)
    return NextResponse.json(
      { error: '実績記録の更新に失敗しました' },
      { status: 500 }
    )
  }
}

// DELETE: 実績記録の削除
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'IDが必要です' }, { status: 400 })
    }

    // 実績記録の存在確認と権限チェック
    const existingRecord = await prisma.actualRecord.findFirst({
      where: {
        id,
        schedule: {
          userId: session.user.id
        }
      }
    })

    if (!existingRecord) {
      return NextResponse.json(
        { error: '実績記録が見つからないか、アクセス権限がありません' },
        { status: 404 }
      )
    }

    await prisma.actualRecord.delete({
      where: { id }
    })

    return NextResponse.json({ message: '実績記録が削除されました' })
  } catch (error) {
    console.error('実績記録削除エラー:', error)
    return NextResponse.json(
      { error: '実績記録の削除に失敗しました' },
      { status: 500 }
    )
  }
} 