import { useMemo } from 'react'
import { Schedule, ScheduleOverlap } from '@/types'

// 時間の重複チェック
function timeRangesOverlap(
  start1: string, end1: string,
  start2: string, end2: string
): boolean {
  const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  const start1Min = toMinutes(start1)
  const end1Min = toMinutes(end1)
  const start2Min = toMinutes(start2)
  const end2Min = toMinutes(end2)

  return start1Min < end2Min && start2Min < end1Min
}

// スケジュールグループ化（重複するものをまとめる）
function groupOverlappingSchedules(schedules: Schedule[]): Schedule[][] {
  const groups: Schedule[][] = []
  const processed = new Set<string>()

  for (const schedule of schedules) {
    if (processed.has(schedule.id)) continue

    const group = [schedule]
    processed.add(schedule.id)

    // 他のスケジュールとの重複をチェック
    for (const other of schedules) {
      if (processed.has(other.id)) continue

      const overlapsWithGroup = group.some(groupSchedule =>
        timeRangesOverlap(
          groupSchedule.startTime, groupSchedule.endTime,
          other.startTime, other.endTime
        )
      )

      if (overlapsWithGroup) {
        group.push(other)
        processed.add(other.id)
      }
    }

    groups.push(group)
  }

  return groups
}

// 各グループ内でのカラム配置計算
function calculateColumnLayout(group: Schedule[]): Map<string, ScheduleOverlap> {
  const layout = new Map<string, ScheduleOverlap>()
  const totalColumns = group.length

  // 開始時刻でソート
  const sortedSchedules = group.sort((a, b) => {
    const timeA = a.startTime
    const timeB = b.startTime
    return timeA.localeCompare(timeB)
  })

  sortedSchedules.forEach((schedule, index) => {
    const columnWidth = 1 / totalColumns
    
    layout.set(schedule.id, {
      scheduleId: schedule.id,
      column: index,
      totalColumns,
      width: columnWidth
    })
  })

  return layout
}

export function useScheduleOverlap(schedules: Schedule[], date: Date) {
  const overlaps = useMemo(() => {
    // 指定日のスケジュールのみフィルタリング
    const daySchedules = schedules.filter(schedule =>
      new Date(schedule.date).toDateString() === date.toDateString()
    )

    if (daySchedules.length <= 1) {
      return new Map<string, ScheduleOverlap>()
    }

    // 重複するスケジュールをグループ化
    const groups = groupOverlappingSchedules(daySchedules)
    const allOverlaps = new Map<string, ScheduleOverlap>()

    // 各グループでカラム配置を計算
    groups.forEach(group => {
      if (group.length > 1) {
        const groupLayout = calculateColumnLayout(group)
        groupLayout.forEach((overlap, scheduleId) => {
          allOverlaps.set(scheduleId, overlap)
        })
      }
    })

    return allOverlaps
  }, [schedules, date])

  // 特定のスケジュールの重複情報取得
  const getOverlapInfo = (scheduleId: string): ScheduleOverlap | null => {
    return overlaps.get(scheduleId) || null
  }

  // 重複するスケジュールの数
  const getOverlapCount = (scheduleId: string): number => {
    const overlap = overlaps.get(scheduleId)
    return overlap ? overlap.totalColumns : 1
  }

  // 重複があるかどうか
  const hasOverlaps = overlaps.size > 0

  // デバッグ用：重複情報の詳細
  const getOverlapDetails = () => {
    const details: any[] = []
    overlaps.forEach((overlap, scheduleId) => {
      const schedule = schedules.find(s => s.id === scheduleId)
      if (schedule) {
        details.push({
          schedule: schedule.title,
          time: `${schedule.startTime}-${schedule.endTime}`,
          column: overlap.column,
          totalColumns: overlap.totalColumns,
          width: `${(overlap.width * 100).toFixed(1)}%`
        })
      }
    })
    return details
  }

  return {
    overlaps,
    getOverlapInfo,
    getOverlapCount,
    hasOverlaps,
    getOverlapDetails
  }
}