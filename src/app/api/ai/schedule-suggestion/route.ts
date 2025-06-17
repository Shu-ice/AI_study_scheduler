import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ScheduleSuggestionRequest, ScheduleSuggestionResponse } from '@/types'
import { startOfDay, addDays, format } from 'date-fns'

// 改良された基本的なスケジュール提案を生成する関数
function generateBasicScheduleSuggestion(
  tasks: any[],
  availableSlots: any[],
  preferences: any,
  existingSchedules: any[]
): ScheduleSuggestionResponse {
  const suggestedSchedules = []
  const conflicts = []
  
  // 高度なタスクソート（優先度、期限、推定時間を総合考慮）
  const sortedTasks = [...tasks].sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 1
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 1
    
    // 期限が近いものを優先
    const aDeadline = a.deadline ? new Date(a.deadline).getTime() : Infinity
    const bDeadline = b.deadline ? new Date(b.deadline).getTime() : Infinity
    
    // 複合スコア計算
    const aScore = aPriority * 1000 - (aDeadline - Date.now()) / (1000 * 60 * 60 * 24) + a.estimatedDuration / 60
    const bScore = bPriority * 1000 - (bDeadline - Date.now()) / (1000 * 60 * 60 * 24) + b.estimatedDuration / 60
    
    return bScore - aScore
  })

  // 時間枠の効率性分析
  const timeSlotEfficiency = (hour: number) => {
    // 朝の集中時間（9-11時）: 高効率
    if (hour >= 9 && hour <= 11) return 1.0
    // 昼食後の集中時間（14-16時）: 中効率
    if (hour >= 14 && hour <= 16) return 0.9
    // 夕方の追い込み時間（17-19時）: 中効率
    if (hour >= 17 && hour <= 19) return 0.8
    // その他の時間: 標準効率
    return 0.7
  }

  // エネルギー管理システム
  let dailyEnergy = 100 // 1日のエネルギー量
  let currentDate = new Date()
  let currentHour = parseInt(preferences.preferredStartTime?.split(':')[0] || '9')
  const endHour = parseInt(preferences.preferredEndTime?.split(':')[0] || '18')
  const maxDailyHours = endHour - currentHour
  
  for (const task of sortedTasks.slice(0, 8)) { // 最大8つのタスクを処理
    const durationHours = Math.ceil(task.estimatedDuration / 60)
    const taskComplexity = task.priority === 'high' ? 1.2 : task.priority === 'medium' ? 1.0 : 0.8
    const energyRequired = durationHours * taskComplexity * 20
    
    // エネルギー不足の場合は翌日に
    if (dailyEnergy < energyRequired || currentHour + durationHours > endHour) {
      currentDate = addDays(currentDate, 1)
      currentHour = parseInt(preferences.preferredStartTime?.split(':')[0] || '9')
      dailyEnergy = 100
      
      // 週末をスキップ（設定による）
      if (!preferences.allowWeekends && (currentDate.getDay() === 0 || currentDate.getDay() === 6)) {
        currentDate = addDays(currentDate, currentDate.getDay() === 0 ? 1 : 2)
      }
    }
    
    // 最適な時間帯を検索
    let bestHour = currentHour
    let bestEfficiency = timeSlotEfficiency(currentHour)
    
    for (let h = currentHour; h <= endHour - durationHours; h++) {
      const efficiency = timeSlotEfficiency(h)
      if (efficiency > bestEfficiency) {
        bestHour = h
        bestEfficiency = efficiency
      }
    }
    
    const dateStr = format(currentDate, 'yyyy-MM-dd')
    const startTime = `${bestHour.toString().padStart(2, '0')}:00`
    const endTime = `${(bestHour + durationHours).toString().padStart(2, '0')}:00`
    
    // 既存スケジュールとの競合チェック（より精密）
    const hasConflict = existingSchedules.some(existing => {
      if (existing.date !== dateStr) return false
      
      const existingStart = parseInt(existing.startTime.split(':')[0])
      const existingEnd = parseInt(existing.endTime.split(':')[0])
      const taskStart = bestHour
      const taskEnd = bestHour + durationHours
      
      return (taskStart < existingEnd && taskEnd > existingStart)
    })
    
    if (hasConflict) {
      conflicts.push({
        task: task.title,
        issue: `${dateStr} ${startTime}-${endTime}で既存スケジュールと競合`,
        suggestions: [
          '時間をずらしてください',
          '別の日に配置を検討してください',
          '既存スケジュールの調整を検討してください'
        ]
      })
      
      // 競合回避のため次の利用可能な時間を検索
      let nextAvailableHour = bestHour + 1
      while (nextAvailableHour <= endHour - durationHours) {
        const newStartTime = `${nextAvailableHour.toString().padStart(2, '0')}:00`
        const newEndTime = `${(nextAvailableHour + durationHours).toString().padStart(2, '0')}:00`
        
        const stillConflicts = existingSchedules.some(existing => {
          if (existing.date !== dateStr) return false
          const existingStart = parseInt(existing.startTime.split(':')[0])
          const existingEnd = parseInt(existing.endTime.split(':')[0])
          return (nextAvailableHour < existingEnd && nextAvailableHour + durationHours > existingStart)
        })
        
        if (!stillConflicts) {
          bestHour = nextAvailableHour
          break
        }
        nextAvailableHour++
      }
    }
    
    // スケジュール品質スコア計算
    const efficiencyScore = bestEfficiency * 100
    const priorityBonus = task.priority === 'high' ? 20 : task.priority === 'medium' ? 10 : 0
    const energyScore = (dailyEnergy / 100) * 20
    const conflictPenalty = hasConflict ? -30 : 0
    
    const finalScore = Math.max(30, Math.min(100, 
      efficiencyScore + priorityBonus + energyScore + conflictPenalty
    ))
    
    suggestedSchedules.push({
      schedule: {
        title: task.title,
        startTime: `${bestHour.toString().padStart(2, '0')}:00`,
        endTime: `${(bestHour + durationHours).toString().padStart(2, '0')}:00`,
        date: new Date(dateStr),
        description: `⏱️ 推定時間: ${task.estimatedDuration}分 | 🔥 優先度: ${task.priority} | ⚡ 効率性: ${Math.round(bestEfficiency * 100)}%`
      },
      score: Math.round(finalScore),
      reasoning: `効率性${Math.round(bestEfficiency * 100)}%の時間帯に配置。${hasConflict ? '競合回避済み。' : ''}エネルギー消費: ${Math.round(energyRequired)}%`
    })
    
    // エネルギーと時間を更新
    dailyEnergy -= energyRequired
    currentHour = bestHour + durationHours + 0.25 // 15分の休憩時間
  }
  
  const totalHours = suggestedSchedules.reduce((sum, item) => {
    const start = parseInt(item.schedule.startTime.split(':')[0])
    const end = parseInt(item.schedule.endTime.split(':')[0])
    return sum + (end - start)
  }, 0)
  
  const averageScore = suggestedSchedules.length > 0 
    ? suggestedSchedules.reduce((sum, item) => sum + item.score, 0) / suggestedSchedules.length
    : 50
  
  return {
    suggestedSchedules,
    conflicts,
    summary: {
      totalHours,
      efficiency: Math.round(averageScore),
      stress: Math.max(10, Math.min(90, 50 - averageScore + conflicts.length * 15))
    }
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    const body: ScheduleSuggestionRequest = await request.json()
    const { tasks, availableSlots, preferences, constraints } = body

    if (!tasks || tasks.length === 0) {
      return NextResponse.json(
        { error: 'スケジュール対象のタスクが必要です' },
        { status: 400 }
      )
    }

    if (!availableSlots || availableSlots.length === 0) {
      return NextResponse.json(
        { error: '利用可能な時間枠が必要です' },
        { status: 400 }
      )
    }

    // 既存スケジュールを取得して競合チェック用に準備
    const today = startOfDay(new Date())
    const nextWeek = addDays(today, 7)
    
    const existingSchedules = await prisma.schedule.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: today,
          lte: nextWeek
        }
      },
      select: {
        title: true,
        startTime: true,
        endTime: true,
        date: true
      }
    })

    const existingSchedulesFormatted = existingSchedules.map((schedule: any) => ({
      title: schedule.title,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      date: format(schedule.date, 'yyyy-MM-dd')
    }))

    // OpenAI APIキーの確認
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY
    let suggestionResult: ScheduleSuggestionResponse

    if (hasOpenAIKey) {
      try {
        // OpenAI APIを使用した高度な提案
        const { getOpenAIClient } = await import('@/lib/openai')
        
        const normalizedTasks = tasks.map(task => ({
          id: task.id,
          title: task.title,
          estimatedDuration: task.estimatedDuration,
          priority: task.priority,
          deadline: task.deadline,
          category: task.category?.name || 'その他'
        }))

        const normalizedSlots = availableSlots.map(slot => ({
          hour: slot.hour,
          minute: slot.minute,
          display: slot.display
        }))

        const openaiClient = getOpenAIClient()
        const response = await openaiClient.generateScheduleSuggestion(
          normalizedTasks,
          normalizedSlots,
          preferences,
          {
            ...constraints,
            existingSchedules: existingSchedulesFormatted
          }
        )

        if (response.success) {
          const aiData = JSON.parse(response.data!)
          
          const processedSchedules = aiData.suggestedSchedules.map((item: any) => {
            const schedule = item.schedule
            
            const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
            const startTime = timeRegex.test(schedule.startTime) ? schedule.startTime : '09:00'
            const endTime = timeRegex.test(schedule.endTime) ? schedule.endTime : '10:00'
            
            let scheduleDate: string
            try {
              scheduleDate = new Date(schedule.date).toISOString().split('T')[0]
            } catch {
              scheduleDate = format(new Date(), 'yyyy-MM-dd')
            }

            return {
              schedule: {
                title: schedule.title || 'タスク',
                startTime,
                endTime,
                date: scheduleDate,
                description: schedule.description
              },
              score: Math.max(0, Math.min(100, item.score || 50)),
              reasoning: item.reasoning || 'AI提案'
            }
          })

          suggestionResult = {
            suggestedSchedules: processedSchedules,
            conflicts: aiData.conflicts || [],
            summary: {
              totalHours: Math.max(0, aiData.summary?.totalHours || 0),
              efficiency: Math.max(0, Math.min(100, aiData.summary?.efficiency || 50)),
              stress: Math.max(0, Math.min(100, aiData.summary?.stress || 50))
            }
          }
        } else {
          throw new Error('AI提案の生成に失敗')
        }
      } catch (aiError) {
        console.warn('AI提案でエラーが発生、基本提案にフォールバック:', aiError)
        suggestionResult = generateBasicScheduleSuggestion(tasks, availableSlots, preferences, existingSchedulesFormatted)
      }
    } else {
      // OpenAI APIキーがない場合は基本提案を使用
      console.info('OpenAI APIキーが設定されていません。基本的なスケジュール提案を生成します。')
      suggestionResult = generateBasicScheduleSuggestion(tasks, availableSlots, preferences, existingSchedulesFormatted)
    }

    return NextResponse.json({
      ...suggestionResult,
      metadata: {
        requestId: `schedule_${Date.now()}`,
        processingTime: 0,
        model: hasOpenAIKey ? 'gpt-4o-mini' : 'basic-algorithm',
        taskCount: tasks.length,
        slotCount: availableSlots.length,
        usingAI: hasOpenAIKey
      }
    })

  } catch (error) {
    console.error('Schedule Suggestion Error:', error)
    
    return NextResponse.json(
      { error: 'スケジュール提案の生成中にエラーが発生しました。しばらく時間をおいて再試行してください。' },
      { status: 500 }
    )
  }
}