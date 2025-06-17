import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { expandRecurrenceToInstances, validateRecurrencePattern } from '@/lib/recurrence'
import { Schedule } from '@/types'

// GET: スケジュール一覧取得
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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    let whereClause: any = {
      userId: session.user.id
    }

    // 日付範囲でフィルタリング
    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    const schedules = await prisma.schedule.findMany({
      where: whereClause,
      include: {
        category: true
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' }
      ]
    })

    // 繰り返しスケジュールを展開
    let expandedSchedules: Schedule[] = []
    
    if (startDate && endDate) {
      // 日付範囲が指定されている場合は繰り返しスケジュールを展開
      for (const schedule of schedules) {
        const typedSchedule: Schedule = {
          id: schedule.id,
          userId: schedule.userId,
          title: schedule.title,
          description: schedule.description || undefined,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          date: schedule.date,
          category: {
            ...schedule.category,
            icon: schedule.category.icon || undefined
          },
          isFixed: schedule.isFixed,
          repeatPattern: schedule.repeatPattern ? JSON.parse(schedule.repeatPattern) : undefined,
          color: schedule.color || undefined,
          createdAt: schedule.createdAt,
          updatedAt: schedule.updatedAt
        }
        
        const instances = expandRecurrenceToInstances(
          typedSchedule,
          new Date(startDate),
          new Date(endDate)
        )
        expandedSchedules.push(...instances)
      }
    } else {
      // 日付範囲が指定されていない場合はそのまま返す
      expandedSchedules = schedules.map((schedule: any) => ({
        id: schedule.id,
        userId: schedule.userId,
        title: schedule.title,
        description: schedule.description || undefined,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        date: schedule.date,
        category: {
          ...schedule.category,
          icon: schedule.category.icon || undefined
        },
        isFixed: schedule.isFixed,
        repeatPattern: schedule.repeatPattern ? JSON.parse(schedule.repeatPattern) : undefined,
        color: schedule.color || undefined,
        createdAt: schedule.createdAt,
        updatedAt: schedule.updatedAt
      }))
    }

    return NextResponse.json(expandedSchedules)
  } catch (error) {
    console.error('スケジュール取得エラー:', error)
    return NextResponse.json(
      { error: 'スケジュールの取得に失敗しました' },
      { status: 500 }
    )
  }
}

// POST: 新しいスケジュール作成
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
    console.log('🔍 スケジュール作成リクエスト body:', JSON.stringify(body, null, 2))
    
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

    console.log('📝 抽出されたフィールド:', {
      title,
      description,
      startTime,
      endTime,
      date,
      categoryId,
      isFixed,
      repeatPattern
    })

    // バリデーション
    if (!title || !startTime || !endTime || !date) {
      console.error('❌ 必須フィールドエラー:', {
        title: !!title,
        startTime: !!startTime,
        endTime: !!endTime,
        date: !!date,
        categoryId: !!categoryId
      })
      return NextResponse.json(
        { 
          error: '必須フィールドが不足しています',
          details: {
            title: !!title,
            startTime: !!startTime,
            endTime: !!endTime,
            date: !!date,
            categoryId: !!categoryId
          }
        },
        { status: 400 }
      )
    }

    // カテゴリーIDが指定されていない場合はデフォルトカテゴリーを取得/作成
    let finalCategoryId = categoryId
    if (!categoryId) {
      console.log('🔧 カテゴリーIDなし、デフォルトカテゴリーを検索/作成します')
      
      // デフォルトカテゴリーを検索
      let defaultCategory = await prisma.scheduleCategory.findFirst({
        where: {
          userId: session.user.id,
          name: 'デフォルト'
        }
      })

      // デフォルトカテゴリーが存在しない場合は作成
      if (!defaultCategory) {
        console.log('🆕 デフォルトカテゴリーを作成します')
        defaultCategory = await prisma.scheduleCategory.create({
          data: {
            name: 'デフォルト',
            color: '#6B7280', // グレー
            userId: session.user.id
          }
        })
      }
      
      finalCategoryId = defaultCategory.id
      console.log('✅ デフォルトカテゴリーID:', finalCategoryId)
    }

    // カテゴリーが存在するかチェック
    const category = await prisma.scheduleCategory.findUnique({
      where: { id: finalCategoryId }
    })

    if (!category) {
      console.error('❌ カテゴリーが見つかりません:', finalCategoryId)
      return NextResponse.json(
        { error: '指定されたカテゴリーが見つかりません' },
        { status: 400 }
      )
    }

    // 繰り返しパターンのバリデーション（設定されている場合）
    if (repeatPattern) {
      const validation = validateRecurrencePattern(repeatPattern)
      if (!validation.isValid) {
        console.error('❌ 繰り返しパターンエラー:', validation.errors)
        return NextResponse.json(
          { error: `繰り返しパターンエラー: ${validation.errors.join(', ')}` },
          { status: 400 }
        )
      }
    }

    console.log('🚀 スケジュール作成開始')
    
    // スケジュール作成
    const schedule = await prisma.schedule.create({
      data: {
        title,
        description,
        startTime,
        endTime,
        date: new Date(date),
        isFixed: isFixed ?? true,
        userId: session.user.id,
        categoryId: finalCategoryId,
        color: category.color, // カテゴリーの色を使用
        repeatPattern: repeatPattern ? JSON.stringify(repeatPattern) : null
      },
      include: {
        category: true
      }
    })

    console.log('✅ スケジュール作成成功:', schedule.id)
    return NextResponse.json(schedule, { status: 201 })
  } catch (error) {
    console.error('💥 スケジュール作成エラー:', error)
    return NextResponse.json(
      { 
        error: 'スケジュールの作成に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    )
  }
} 