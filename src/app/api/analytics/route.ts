import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { 
  AnalyticsRequest, 
  AnalyticsResponse, 
  AnalyticsSummary,
  TimeComparisonData,
  CompletionRateData,
  SatisfactionTrendData,
  CategoryAnalyticsData,
  EfficiencyMetrics
} from '@/types'
import { startOfDay, endOfDay, format, parseISO, differenceInMinutes } from 'date-fns'

// GET: 分析データ取得
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
    const periodType = searchParams.get('periodType') || 'week'
    const includeCategoriesParam = searchParams.get('includeCategories')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: '開始日と終了日は必須です' },
        { status: 400 }
      )
    }

    const includeCategories = includeCategoriesParam 
      ? includeCategoriesParam.split(',')
      : undefined

    const startDateTime = startOfDay(parseISO(startDate))
    const endDateTime = endOfDay(parseISO(endDate))

    // 基本的なスケジュールデータを取得
    const schedules = await prisma.schedule.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: startDateTime,
          lte: endDateTime
        },
        ...(includeCategories && {
          categoryId: {
            in: includeCategories
          }
        })
      },
      include: {
        category: true,
        actualRecords: true
      },
      orderBy: {
        date: 'asc'
      }
    })

    // カテゴリ情報を取得
    const categories = await prisma.scheduleCategory.findMany({
      where: { userId: session.user.id }
    })

    // データ分析処理
    const analyticsData = await processAnalyticsData(schedules, categories)

    return NextResponse.json(analyticsData)

  } catch (error) {
    console.error('Analytics Error:', error)
    return NextResponse.json(
      { error: '分析データの取得に失敗しました' },
      { status: 500 }
    )
  }
}

// 分析データ処理関数
async function processAnalyticsData(schedules: any[], categories: any[]): Promise<AnalyticsResponse> {
  // サマリー計算
  const summary = calculateSummary(schedules)
  
  // 時間比較データ
  const timeComparison = calculateTimeComparison(schedules)
  
  // 完了率データ
  const completionRate = calculateCompletionRate(schedules)
  
  // 満足度トレンド
  const satisfactionTrend = calculateSatisfactionTrend(schedules)
  
  // カテゴリ別分析
  const categoryBreakdown = calculateCategoryBreakdown(schedules, categories)
  
  // 効率性指標
  const efficiencyMetrics = calculateEfficiencyMetrics(schedules, categories)
  
  // インサイト生成
  const insights = generateInsights(summary, efficiencyMetrics, categoryBreakdown)

  return {
    summary,
    timeComparison,
    completionRate,
    satisfactionTrend,
    categoryBreakdown,
    efficiencyMetrics,
    insights
  }
}

function calculateSummary(schedules: any[]): AnalyticsSummary {
  const totalSchedules = schedules.length
  const completedSchedules = schedules.filter(s => s.actualRecords.length > 0).length
  
  let totalPlannedMinutes = 0
  let totalActualMinutes = 0
  let totalSatisfaction = 0
  let satisfactionCount = 0

  schedules.forEach(schedule => {
    // 計画時間計算
    const plannedDuration = calculatePlannedDuration(schedule.startTime, schedule.endTime)
    totalPlannedMinutes += plannedDuration

    // 実績がある場合
    if (schedule.actualRecords.length > 0) {
      const record = schedule.actualRecords[0]
      const actualDuration = calculatePlannedDuration(record.actualStartTime, record.actualEndTime)
      totalActualMinutes += actualDuration

      if (record.satisfactionRating) {
        totalSatisfaction += record.satisfactionRating
        satisfactionCount++
      }
    }
  })

  return {
    totalPlannedHours: Math.round((totalPlannedMinutes / 60) * 100) / 100,
    totalActualHours: Math.round((totalActualMinutes / 60) * 100) / 100,
    completedSchedules,
    totalSchedules,
    averageSatisfaction: satisfactionCount > 0 ? Math.round((totalSatisfaction / satisfactionCount) * 100) / 100 : 0,
    efficiencyRate: totalPlannedMinutes > 0 ? Math.round((totalActualMinutes / totalPlannedMinutes) * 100) / 100 : 0
  }
}

function calculateTimeComparison(schedules: any[]): TimeComparisonData[] {
  const dailyData: Record<string, {
    planned: number,
    actual: number,
    completed: number,
    total: number
  }> = {}

  schedules.forEach(schedule => {
    const dateKey = format(schedule.date, 'yyyy-MM-dd')
    
    if (!dailyData[dateKey]) {
      dailyData[dateKey] = { planned: 0, actual: 0, completed: 0, total: 0 }
    }

    const plannedDuration = calculatePlannedDuration(schedule.startTime, schedule.endTime)
    dailyData[dateKey].planned += plannedDuration
    dailyData[dateKey].total++

    if (schedule.actualRecords.length > 0) {
      const record = schedule.actualRecords[0]
      const actualDuration = calculatePlannedDuration(record.actualStartTime, record.actualEndTime)
      dailyData[dateKey].actual += actualDuration
      dailyData[dateKey].completed++
    }
  })

  return Object.entries(dailyData).map(([date, data]) => ({
    date,
    plannedMinutes: data.planned,
    actualMinutes: data.actual,
    difference: data.actual - data.planned,
    completionRate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0
  })).sort((a, b) => a.date.localeCompare(b.date))
}

function calculateCompletionRate(schedules: any[]): CompletionRateData {
  const completed = schedules.filter(s => s.actualRecords.length > 0).length
  const total = schedules.length
  const notStarted = total - completed

  return {
    completed,
    inProgress: 0, // 現在のスキーマでは進行中状態なし
    notStarted,
    cancelled: 0, // 現在のスキーマではキャンセル状態なし
    total,
    completionPercentage: total > 0 ? Math.round((completed / total) * 100) : 0
  }
}

function calculateSatisfactionTrend(schedules: any[]): SatisfactionTrendData[] {
  const dailyData: Record<string, { total: number, count: number }> = {}

  schedules.forEach(schedule => {
    if (schedule.actualRecords.length > 0) {
      const record = schedule.actualRecords[0]
      if (record.satisfactionRating) {
        const dateKey = format(schedule.date, 'yyyy-MM-dd')
        
        if (!dailyData[dateKey]) {
          dailyData[dateKey] = { total: 0, count: 0 }
        }
        
        dailyData[dateKey].total += record.satisfactionRating
        dailyData[dateKey].count++
      }
    }
  })

  return Object.entries(dailyData).map(([date, data]) => ({
    date,
    averageSatisfaction: Math.round((data.total / data.count) * 100) / 100,
    scheduleCount: data.count
  })).sort((a, b) => a.date.localeCompare(b.date))
}

function calculateCategoryBreakdown(schedules: any[], categories: any[]): CategoryAnalyticsData[] {
  const categoryData: Record<string, {
    plannedMinutes: number,
    actualMinutes: number,
    completed: number,
    total: number,
    satisfactionTotal: number,
    satisfactionCount: number
  }> = {}

  // 初期化
  categories.forEach(category => {
    categoryData[category.id] = {
      plannedMinutes: 0,
      actualMinutes: 0,
      completed: 0,
      total: 0,
      satisfactionTotal: 0,
      satisfactionCount: 0
    }
  })

  schedules.forEach(schedule => {
    const categoryId = schedule.categoryId
    if (!categoryData[categoryId]) return

    const plannedDuration = calculatePlannedDuration(schedule.startTime, schedule.endTime)
    categoryData[categoryId].plannedMinutes += plannedDuration
    categoryData[categoryId].total++

    if (schedule.actualRecords.length > 0) {
      const record = schedule.actualRecords[0]
      const actualDuration = calculatePlannedDuration(record.actualStartTime, record.actualEndTime)
      categoryData[categoryId].actualMinutes += actualDuration
      categoryData[categoryId].completed++

      if (record.satisfactionRating) {
        categoryData[categoryId].satisfactionTotal += record.satisfactionRating
        categoryData[categoryId].satisfactionCount++
      }
    }
  })

  return categories.map(category => {
    const data = categoryData[category.id]
    return {
      categoryId: category.id,
      categoryName: category.name,
      color: category.color,
      plannedMinutes: data.plannedMinutes,
      actualMinutes: data.actualMinutes,
      completedCount: data.completed,
      totalCount: data.total,
      averageSatisfaction: data.satisfactionCount > 0 
        ? Math.round((data.satisfactionTotal / data.satisfactionCount) * 100) / 100 
        : 0,
      efficiencyRate: data.plannedMinutes > 0 
        ? Math.round((data.actualMinutes / data.plannedMinutes) * 100) / 100 
        : 0
    }
  }).filter(item => item.totalCount > 0)
}

function calculateEfficiencyMetrics(schedules: any[], categories: any[]): EfficiencyMetrics {
  const completedSchedules = schedules.filter(s => s.actualRecords.length > 0)
  
  if (completedSchedules.length === 0) {
    return {
      timeEfficiency: 0,
      overrunPercentage: 0,
      underrunPercentage: 0,
      averageOverrun: 0,
      averageUnderrun: 0,
      mostEfficientCategory: null,
      leastEfficientCategory: null
    }
  }

  let onTimeCount = 0
  let overrunCount = 0
  let underrunCount = 0
  let totalOverrun = 0
  let totalUnderrun = 0

  const categoryEfficiency: Record<string, { total: number, actual: number }> = {}

  completedSchedules.forEach(schedule => {
    const plannedDuration = calculatePlannedDuration(schedule.startTime, schedule.endTime)
    const record = schedule.actualRecords[0]
    const actualDuration = calculatePlannedDuration(record.actualStartTime, record.actualEndTime)
    
    const difference = actualDuration - plannedDuration
    const tolerance = Math.max(5, plannedDuration * 0.1) // 5分または計画時間の10%の許容範囲

    if (Math.abs(difference) <= tolerance) {
      onTimeCount++
    } else if (difference > 0) {
      overrunCount++
      totalOverrun += difference
    } else {
      underrunCount++
      totalUnderrun += Math.abs(difference)
    }

    // カテゴリ別効率性
    const categoryId = schedule.categoryId
    if (!categoryEfficiency[categoryId]) {
      categoryEfficiency[categoryId] = { total: 0, actual: 0 }
    }
    categoryEfficiency[categoryId].total += plannedDuration
    categoryEfficiency[categoryId].actual += actualDuration
  })

  // 最も/最も効率の悪いカテゴリを特定
  let mostEfficientCategory: string | null = null
  let leastEfficientCategory: string | null = null
  let bestEfficiency = Infinity
  let worstEfficiency = 0

  categories.forEach(category => {
    const efficiency = categoryEfficiency[category.id]
    if (efficiency && efficiency.total > 0) {
      const rate = efficiency.actual / efficiency.total
      if (rate < bestEfficiency) {
        bestEfficiency = rate
        mostEfficientCategory = category.name
      }
      if (rate > worstEfficiency) {
        worstEfficiency = rate
        leastEfficientCategory = category.name
      }
    }
  })

  return {
    timeEfficiency: Math.round((onTimeCount / completedSchedules.length) * 100),
    overrunPercentage: Math.round((overrunCount / completedSchedules.length) * 100),
    underrunPercentage: Math.round((underrunCount / completedSchedules.length) * 100),
    averageOverrun: overrunCount > 0 ? Math.round(totalOverrun / overrunCount) : 0,
    averageUnderrun: underrunCount > 0 ? Math.round(totalUnderrun / underrunCount) : 0,
    mostEfficientCategory,
    leastEfficientCategory
  }
}

function generateInsights(
  summary: AnalyticsSummary, 
  efficiency: EfficiencyMetrics, 
  categories: CategoryAnalyticsData[]
): string[] {
  const insights: string[] = []

  // 完了率に関するインサイト
  const completionRate = summary.totalSchedules > 0 
    ? (summary.completedSchedules / summary.totalSchedules) * 100 
    : 0

  if (completionRate >= 80) {
    insights.push('✅ 高い完了率を維持しています！継続的な実績記録が習慣化されています。')
  } else if (completionRate >= 60) {
    insights.push('📈 完了率は良好ですが、より詳細な実績記録で分析精度が向上します。')
  } else {
    insights.push('⚠️ 実績記録の習慣化をお勧めします。計画の効果測定に重要です。')
  }

  // 効率性に関するインサイト
  if (summary.efficiencyRate > 1.2) {
    insights.push('⏰ 計画時間が短すぎる傾向があります。もう少し余裕のあるスケジュールを検討してください。')
  } else if (summary.efficiencyRate < 0.8) {
    insights.push('🎯 計画時間に余裕があります。より多くのタスクを詰め込める可能性があります。')
  } else {
    insights.push('⚖️ 計画と実績のバランスが良好です！')
  }

  // 満足度に関するインサイト
  if (summary.averageSatisfaction >= 4) {
    insights.push('😊 高い満足度を維持しています。現在のスケジュール管理が効果的です。')
  } else if (summary.averageSatisfaction >= 3) {
    insights.push('🤔 満足度は平均的です。スケジュールの質向上を検討してみてください。')
  } else if (summary.averageSatisfaction > 0) {
    insights.push('😓 満足度が低めです。タスクの優先度や時間配分を見直すことをお勧めします。')
  }

  // カテゴリ効率性インサイト
  if (efficiency.mostEfficientCategory) {
    insights.push(`🏆 「${efficiency.mostEfficientCategory}」が最も効率的なカテゴリです。この経験を他のカテゴリにも活用できるかもしれません。`)
  }

  return insights
}

// 時間文字列から分数を計算するヘルパー関数
function calculatePlannedDuration(startTime: string, endTime: string): number {
  const [startHour, startMinute] = startTime.split(':').map(Number)
  const [endHour, endMinute] = endTime.split(':').map(Number)
  
  const startMinutes = startHour * 60 + startMinute
  const endMinutes = endHour * 60 + endMinute
  
  return endMinutes - startMinutes
}