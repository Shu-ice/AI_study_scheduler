/**
 * 繰り返しスケジュール生成ユーティリティ
 * Task 7: 繰り返しスケジュール機能 のための中核ロジック
 */

import { Schedule, RepeatPattern } from '@/types'
import { addDays, addWeeks, isSameDay, format, startOfDay, endOfDay, isAfter, isBefore, getDay } from 'date-fns'

// 繰り返しスケジュールを展開して個別インスタンスを生成
export function expandRecurrenceToInstances(
  baseSchedule: Schedule,
  startDate: Date,
  endDate: Date
): Schedule[] {
  if (!baseSchedule.repeatPattern) {
    // 繰り返しパターンがない場合、元のスケジュールがrange内にあるかチェック
    const scheduleDate = startOfDay(baseSchedule.date)
    const rangeStart = startOfDay(startDate)
    const rangeEnd = endOfDay(endDate)
    
    if (scheduleDate >= rangeStart && scheduleDate <= rangeEnd) {
      return [baseSchedule]
    }
    return []
  }

  const pattern = typeof baseSchedule.repeatPattern === 'string' 
    ? JSON.parse(baseSchedule.repeatPattern) as RepeatPattern
    : baseSchedule.repeatPattern
  const instances: Schedule[] = []
  let currentDate = startOfDay(baseSchedule.date)
  const rangeStart = startOfDay(startDate)
  const rangeEnd = endOfDay(endDate)

  // パターンの終了日チェック
  const patternEndDate = pattern.endDate ? startOfDay(new Date(pattern.endDate)) : null

  let iterationCount = 0
  const maxIterations = 1000 // 無限ループ防止

  while (currentDate <= rangeEnd && iterationCount < maxIterations) {
    iterationCount++

    // パターンの終了日を超えている場合は停止
    if (patternEndDate && currentDate > patternEndDate) {
      break
    }

    // 例外日でない場合のみインスタンスを生成
    if (currentDate >= rangeStart && !isRecurrenceException(currentDate, pattern.exceptions || [])) {
      const instance: Schedule = {
        ...baseSchedule,
        id: `${baseSchedule.id}_${format(currentDate, 'yyyy-MM-dd')}`,
        date: currentDate,
        repeatPattern: undefined // インスタンスには繰り返しパターンを含めない
      }
      instances.push(instance)
    }

    // 次の発生日を計算
    const nextDate = calculateNextOccurrence(currentDate, pattern)
    if (!nextDate || isSameDay(nextDate, currentDate)) {
      break // 次の日付が計算できない、または同じ日付の場合は停止
    }
    currentDate = nextDate
  }

  return instances
}

// 次の繰り返し発生日を計算
export function calculateNextOccurrence(
  lastDate: Date,
  pattern: RepeatPattern
): Date | null {
  const currentDate = startOfDay(lastDate)

  switch (pattern.type) {
    case 'daily':
      return addDays(currentDate, pattern.interval)

    case 'weekly':
      return addWeeks(currentDate, pattern.interval)

    case 'weekdays': {
      let nextDate = addDays(currentDate, 1)
      // 次の平日を見つける
      while (getDay(nextDate) === 0 || getDay(nextDate) === 6) { // 0=日曜日, 6=土曜日
        nextDate = addDays(nextDate, 1)
      }
      return nextDate
    }

    case 'custom': {
      // カスタムパターンの場合、追加のロジックが必要
      // ここでは週単位での繰り返しと仮定
      let nextDate = addDays(currentDate, 1)
      let attempts = 0
      const maxAttempts = 14 // 2週間以内で次の該当日を探す

      while (attempts < maxAttempts) {
        // カスタムパターンの詳細実装が必要
        // 今回は簡単に週間隔で処理
        if (attempts >= 7) {
          return addWeeks(currentDate, pattern.interval)
        }
        nextDate = addDays(nextDate, 1)
        attempts++
      }
      return addWeeks(currentDate, pattern.interval)
    }

    default:
      return null
  }
}

// 指定日が例外日かどうか判定
export function isRecurrenceException(
  date: Date,
  exceptions: Date[]
): boolean {
  const targetDate = startOfDay(date)
  return exceptions.some(exceptionDate => 
    isSameDay(targetDate, startOfDay(new Date(exceptionDate)))
  )
}

// 繰り返しパターンをバリデーション
export function validateRecurrencePattern(
  pattern: RepeatPattern
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // タイプの検証
  if (!['daily', 'weekly', 'weekdays', 'custom'].includes(pattern.type)) {
    errors.push('繰り返しタイプが無効です')
  }

  // インターバルの検証
  if (!pattern.interval || pattern.interval < 1 || pattern.interval > 365) {
    errors.push('繰り返し間隔は1-365の間で指定してください')
  }

  // 終了日の検証
  if (pattern.endDate) {
    const endDate = new Date(pattern.endDate)
    const today = new Date()
    
    if (isNaN(endDate.getTime())) {
      errors.push('終了日の形式が無効です')
    } else if (isBefore(endDate, today)) {
      errors.push('終了日は今日以降の日付を指定してください')
    }
  }

  // 例外日の検証
  if (pattern.exceptions) {
    pattern.exceptions.forEach((exceptionDate, index) => {
      const date = new Date(exceptionDate)
      if (isNaN(date.getTime())) {
        errors.push(`例外日${index + 1}の形式が無効です`)
      }
    })
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// 繰り返しスケジュールのプレビュー生成（次のN回分）
export function generateRecurrencePreview(
  baseSchedule: Schedule,
  count: number = 10
): Date[] {
  if (!baseSchedule.repeatPattern) {
    return [baseSchedule.date]
  }

  const pattern = typeof baseSchedule.repeatPattern === 'string' 
    ? JSON.parse(baseSchedule.repeatPattern) as RepeatPattern
    : baseSchedule.repeatPattern
  const previewDates: Date[] = []
  let currentDate = startOfDay(baseSchedule.date)
  
  let generatedCount = 0
  let iterationCount = 0
  const maxIterations = count * 10 // 例外日を考慮した最大反復数

  while (generatedCount < count && iterationCount < maxIterations) {
    iterationCount++

    // パターンの終了日チェック
    if (pattern.endDate && isAfter(currentDate, new Date(pattern.endDate))) {
      break
    }

    // 例外日でない場合のみ追加
    if (!isRecurrenceException(currentDate, pattern.exceptions || [])) {
      previewDates.push(new Date(currentDate))
      generatedCount++
    }

    // 最初の日付の場合、次の発生日を計算
    if (generatedCount === 1 || iterationCount === 1) {
      const nextDate = calculateNextOccurrence(currentDate, pattern)
      if (!nextDate) break
      currentDate = nextDate
    } else {
      // 2回目以降は前回の計算結果から次を計算
      const nextDate = calculateNextOccurrence(currentDate, pattern)
      if (!nextDate || isSameDay(nextDate, currentDate)) break
      currentDate = nextDate
    }
  }

  return previewDates
}