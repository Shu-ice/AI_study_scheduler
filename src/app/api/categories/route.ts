import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: カテゴリー一覧取得
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // 全てのカテゴリーを取得（グローバル使用）
    const categories = await prisma.scheduleCategory.findMany({
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error('カテゴリー取得エラー:', error)
    return NextResponse.json(
      { error: 'カテゴリーの取得に失敗しました' },
      { status: 500 }
    )
  }
}

// PUT: カテゴリー一括更新
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    const { categories } = await request.json()

    if (!Array.isArray(categories)) {
      return NextResponse.json(
        { error: 'カテゴリーの配列が必要です' },
        { status: 400 }
      )
    }

    // トランザクション内で全カテゴリーを更新
    await prisma.$transaction(async (tx) => {
      // 既存のカテゴリーを全削除
      await tx.scheduleCategory.deleteMany({})

      // 新しいカテゴリーを作成
      for (const category of categories) {
        await tx.scheduleCategory.create({
          data: {
            id: category.id,
            userId: session.user.id,
            name: category.name,
            color: category.color,
            icon: category.icon || null
          }
        })
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('カテゴリー更新エラー:', error)
    return NextResponse.json(
      { error: 'カテゴリーの更新に失敗しました' },
      { status: 500 }
    )
  }
} 