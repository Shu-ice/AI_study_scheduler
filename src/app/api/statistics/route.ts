import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: 統計データの取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'week' // week, month, year, custom
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // 期間の設定
    let dateFilter: { date?: { gte: Date; lte: Date } } = {}
    const now = new Date()
    
    if (period === 'custom' && startDate && endDate) {
      dateFilter = {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      }
    } else {
      const periodStart = new Date()
      switch (period) {
        case 'week':
          periodStart.setDate(now.getDate() - 7)
          break
        case 'month':
          periodStart.setMonth(now.getMonth() - 1)
          break
        case 'year':
          periodStart.setFullYear(now.getFullYear() - 1)
          break
        default:
          periodStart.setDate(now.getDate() - 7)
      }
      
      dateFilter = {
        date: {
          gte: periodStart,
          lte: now
        }
      }
    }

    // 基本統計の収集
    const [
      totalSchedules,
      completedSchedules,
      totalTasks,
      completedTasks,
      categories,
      schedules,
      actualRecords
    ] = await Promise.all([
      // スケジュール統計
      prisma.schedule.count({
        where: {
          userId: session.user.id,
          ...dateFilter
        }
      }),
      
      // 完了済みスケジュール（実績記録があるもの）
      prisma.schedule.count({
        where: {
          userId: session.user.id,
          ...dateFilter,
          actualRecords: {
            some: {
              actualEndTime: {
                not: undefined
              }
            }
          }
        }
      }),
      
      // タスク統計
      prisma.task.count({
        where: {
          userId: session.user.id,
          createdAt: dateFilter.date ? {
            gte: dateFilter.date.gte,
            lte: dateFilter.date.lte
          } : undefined
        }
      }),
      
      // 完了済みタスク
      prisma.task.count({
        where: {
          userId: session.user.id,
          status: 'completed',
          createdAt: dateFilter.date ? {
            gte: dateFilter.date.gte,
            lte: dateFilter.date.lte
          } : undefined
        }
      }),
      
      // カテゴリ別統計
      prisma.scheduleCategory.findMany({
        where: {
          schedules: {
            some: {
              userId: session.user.id,
              ...dateFilter
            }
          }
        },
        include: {
          _count: {
            select: {
              schedules: {
                where: {
                  userId: session.user.id,
                  ...dateFilter
                }
              }
            }
          }
        }
      }),
      
      // 詳細なスケジュールデータ
      prisma.schedule.findMany({
        where: {
          userId: session.user.id,
          ...dateFilter
        },
        include: {
          category: true,
          actualRecords: true
        },
        orderBy: {
          date: 'desc'
        }
      }),
      
      // 実績記録
      prisma.actualRecord.findMany({
        where: {
          schedule: {
            userId: session.user.id,
            ...dateFilter
          }
        },
        include: {
          schedule: {
            include: {
              category: true
            }
          }
        }
      })
    ])

    // 時間効率性の計算
    const timeEfficiency = calculateTimeEfficiency(schedules, actualRecords)
    
    // 満足度統計
    const satisfactionStats = calculateSatisfactionStats(actualRecords)
    
    // カテゴリ別分析
    const categoryAnalysis = analyzeCategoryPerformance(schedules, actualRecords)
    
    // 週次トレンド分析
    const weeklyTrend = calculateWeeklyTrend(schedules, actualRecords, dateFilter.date)
    
    // 生産性指標
    const productivityMetrics = calculateProductivityMetrics(schedules, actualRecords, totalTasks, completedTasks)

    const statistics = {
      period,
      dateRange: {
        start: dateFilter.date?.gte || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        end: dateFilter.date?.lte || now
      },
      overview: {
        totalSchedules,
        completedSchedules,
        scheduleCompletionRate: totalSchedules > 0 ? Math.round((completedSchedules / totalSchedules) * 100) : 0,
        totalTasks,
        completedTasks,
        taskCompletionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      },
      timeEfficiency,
      satisfaction: satisfactionStats,
      categories: categoryAnalysis,
      weeklyTrend,
      productivity: productivityMetrics
    }

    return NextResponse.json(statistics)
  } catch (error) {
    console.error('統計データ取得エラー:', error)
    return NextResponse.json(
      { error: '統計データの取得に失敗しました' },
      { status: 500 }
    )
  }
}

// 時間効率性計算
function calculateTimeEfficiency(schedules: any[], actualRecords: any[]) {
  let totalPlannedMinutes = 0
  let totalActualMinutes = 0
  let accuracySum = 0
  let accuracyCount = 0

  schedules.forEach(schedule => {
    const [startHour, startMin] = schedule.startTime.split(':').map(Number)
    const [endHour, endMin] = schedule.endTime.split(':').map(Number)
    const plannedMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin)
    totalPlannedMinutes += plannedMinutes

    const actualRecord = actualRecords.find(record => record.scheduleId === schedule.id)
    if (actualRecord?.actualStartTime && actualRecord?.actualEndTime) {
      const [actualStartHour, actualStartMin] = actualRecord.actualStartTime.split(':').map(Number)
      const [actualEndHour, actualEndMin] = actualRecord.actualEndTime.split(':').map(Number)
      const actualMinutes = (actualEndHour * 60 + actualEndMin) - (actualStartHour * 60 + actualStartMin)
      totalActualMinutes += actualMinutes

      // 時間精度の計算（100%から誤差を引く）
      const accuracy = Math.max(0, 100 - Math.abs(plannedMinutes - actualMinutes) / plannedMinutes * 100)
      accuracySum += accuracy
      accuracyCount++
    }
  })

  return {
    totalPlannedHours: Math.round(totalPlannedMinutes / 60 * 10) / 10,
    totalActualHours: Math.round(totalActualMinutes / 60 * 10) / 10,
    efficiency: totalPlannedMinutes > 0 ? Math.round((totalActualMinutes / totalPlannedMinutes) * 100) : 0,
    timeAccuracy: accuracyCount > 0 ? Math.round(accuracySum / accuracyCount) : 0
  }
}

// 満足度統計計算
function calculateSatisfactionStats(actualRecords: any[]) {
  const ratingsWithData = actualRecords.filter(record => record.satisfactionRating)
  
  if (ratingsWithData.length === 0) {
    return {
      averageRating: 0,
      totalRatings: 0,
      distribution: [0, 0, 0, 0, 0]
    }
  }

  const total = ratingsWithData.reduce((sum, record) => sum + record.satisfactionRating, 0)
  const average = total / ratingsWithData.length

  // 1-5の分布
  const distribution = [0, 0, 0, 0, 0]
  ratingsWithData.forEach(record => {
    if (record.satisfactionRating >= 1 && record.satisfactionRating <= 5) {
      distribution[record.satisfactionRating - 1]++
    }
  })

  return {
    averageRating: Math.round(average * 10) / 10,
    totalRatings: ratingsWithData.length,
    distribution
  }
}

// カテゴリ別パフォーマンス分析
function analyzeCategoryPerformance(schedules: any[], actualRecords: any[]) {
  const categoryMap = new Map()

  schedules.forEach(schedule => {
    const categoryId = schedule.category.id
    if (!categoryMap.has(categoryId)) {
      categoryMap.set(categoryId, {
        id: categoryId,
        name: schedule.category.name,
        color: schedule.category.color,
        totalSchedules: 0,
        completedSchedules: 0,
        totalPlannedMinutes: 0,
        totalActualMinutes: 0,
        satisfactionSum: 0,
        satisfactionCount: 0
      })
    }

    const categoryData = categoryMap.get(categoryId)
    categoryData.totalSchedules++

    const [startHour, startMin] = schedule.startTime.split(':').map(Number)
    const [endHour, endMin] = schedule.endTime.split(':').map(Number)
    categoryData.totalPlannedMinutes += (endHour * 60 + endMin) - (startHour * 60 + startMin)

    const actualRecord = actualRecords.find(record => record.scheduleId === schedule.id)
    if (actualRecord?.actualEndTime) {
      categoryData.completedSchedules++
      
      if (actualRecord.actualStartTime && actualRecord.actualEndTime) {
        const [actualStartHour, actualStartMin] = actualRecord.actualStartTime.split(':').map(Number)
        const [actualEndHour, actualEndMin] = actualRecord.actualEndTime.split(':').map(Number)
        categoryData.totalActualMinutes += (actualEndHour * 60 + actualEndMin) - (actualStartHour * 60 + actualStartMin)
      }

      if (actualRecord.satisfactionRating) {
        categoryData.satisfactionSum += actualRecord.satisfactionRating
        categoryData.satisfactionCount++
      }
    }
  })

  return Array.from(categoryMap.values()).map(category => ({
    ...category,
    completionRate: category.totalSchedules > 0 ? Math.round((category.completedSchedules / category.totalSchedules) * 100) : 0,
    averageHours: Math.round(category.totalPlannedMinutes / 60 * 10) / 10,
    efficiency: category.totalPlannedMinutes > 0 ? Math.round((category.totalActualMinutes / category.totalPlannedMinutes) * 100) : 0,
    averageSatisfaction: category.satisfactionCount > 0 ? Math.round((category.satisfactionSum / category.satisfactionCount) * 10) / 10 : 0
  }))
}

// 週次トレンド分析
function calculateWeeklyTrend(schedules: any[], actualRecords: any[], dateRange: any) {
  if (!dateRange) return []

  const weeks = []
  const start = new Date(dateRange.gte)
  const end = new Date(dateRange.lte)
  
  // 週単位で区切る
  const currentWeekStart = new Date(start)
  while (currentWeekStart <= end) {
    const weekEnd = new Date(currentWeekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    
    const weekSchedules = schedules.filter(schedule => {
      const scheduleDate = new Date(schedule.date)
      return scheduleDate >= currentWeekStart && scheduleDate <= weekEnd
    })

    const weekActualRecords = actualRecords.filter(record => {
      const scheduleDate = new Date(record.schedule.date)
      return scheduleDate >= currentWeekStart && scheduleDate <= weekEnd
    })

    weeks.push({
      weekStart: new Date(currentWeekStart),
      weekEnd: new Date(weekEnd),
      totalSchedules: weekSchedules.length,
      completedSchedules: weekActualRecords.filter(r => r.actualEndTime).length,
      averageSatisfaction: weekActualRecords.length > 0 
        ? weekActualRecords.reduce((sum, r) => sum + (r.satisfactionRating || 0), 0) / weekActualRecords.length 
        : 0
    })

    currentWeekStart.setDate(currentWeekStart.getDate() + 7)
  }

  return weeks
}

// 生産性指標計算
function calculateProductivityMetrics(schedules: any[], actualRecords: any[], totalTasks: number, completedTasks: number) {
  const completedActualRecords = actualRecords.filter(record => record.actualEndTime)
  
  const focusTime = completedActualRecords.reduce((total, record) => {
    if (record.actualStartTime && record.actualEndTime) {
      const [startHour, startMin] = record.actualStartTime.split(':').map(Number)
      const [endHour, endMin] = record.actualEndTime.split(':').map(Number)
      return total + ((endHour * 60 + endMin) - (startHour * 60 + startMin))
    }
    return total
  }, 0)

  const averageSessionLength = completedActualRecords.length > 0 
    ? focusTime / completedActualRecords.length 
    : 0

  return {
    totalFocusHours: Math.round(focusTime / 60 * 10) / 10,
    averageSessionMinutes: Math.round(averageSessionLength),
    tasksPerHour: focusTime > 0 ? Math.round((completedTasks / (focusTime / 60)) * 10) / 10 : 0,
    productivityScore: calculateProductivityScore(schedules.length, completedActualRecords.length, totalTasks, completedTasks)
  }
}

// 生産性スコア計算（0-100）
function calculateProductivityScore(totalSchedules: number, completedSchedules: number, totalTasks: number, completedTasks: number) {
  if (totalSchedules === 0 && totalTasks === 0) return 0
  
  const scheduleScore = totalSchedules > 0 ? (completedSchedules / totalSchedules) * 50 : 0
  const taskScore = totalTasks > 0 ? (completedTasks / totalTasks) * 50 : 0
  
  return Math.round(scheduleScore + taskScore)
} 