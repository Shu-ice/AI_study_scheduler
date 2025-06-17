// 型定義を追加
declare module 'japanese-holidays' {
  export function getHolidaysOf(year: number): Array<{
    month: number
    date: number
    name: string
  }>
}

import { getHolidaysOf } from 'japanese-holidays'

/**
 * 指定した日付が日本の祝日かどうかを判定
 */
export function isJapaneseHoliday(date: Date): boolean {
  try {
    const year = date.getFullYear()
    const month = date.getMonth() + 1 // 0ベースなので+1
    const day = date.getDate()
    
    const holidays = getHolidaysOf(year)
    return holidays.some(h => h.month === month && h.date === day)
  } catch {
    return false
  }
}

/**
 * 指定した日付の祝日名を取得（祝日でない場合はnull）
 */
export function getJapaneseHolidayName(date: Date): string | null {
  try {
    const year = date.getFullYear()
    const month = date.getMonth() + 1 // 0ベースなので+1
    const day = date.getDate()
    
    const holidays = getHolidaysOf(year)
    const holiday = holidays.find(h => h.month === month && h.date === day)
    return holiday ? holiday.name : null
  } catch {
    return null
  }
}

/**
 * 日付が特別な日（日曜日または祝日）かどうかを判定
 */
export function isSpecialDay(date: Date): {
  isSpecial: boolean
  type: 'sunday' | 'holiday' | 'sunday-holiday' | null
  holidayName?: string
} {
  const isSunday = date.getDay() === 0
  const holiday = isJapaneseHoliday(date)
  const holidayName = holiday ? getJapaneseHolidayName(date) || undefined : undefined

  if (isSunday && holiday) {
    return {
      isSpecial: true,
      type: 'sunday-holiday',
      holidayName
    }
  }

  if (holiday) {
    return {
      isSpecial: true,
      type: 'holiday',
      holidayName
    }
  }

  if (isSunday) {
    return {
      isSpecial: true,
      type: 'sunday'
    }
  }

  return {
    isSpecial: false,
    type: null
  }
}

/**
 * 祝日カラーを取得
 */
export function getHolidayColor(date: Date): string {
  const { isSpecial, type } = isSpecialDay(date)
  
  if (!isSpecial) return ''
  
  switch (type) {
    case 'sunday':
      return 'text-red-600'
    case 'holiday':
      return 'text-red-600'
    case 'sunday-holiday':
      return 'text-red-700 font-bold'
    default:
      return ''
  }
}

/**
 * 祝日の背景色を取得
 */
export function getHolidayBackgroundColor(date: Date): string {
  const { isSpecial, type } = isSpecialDay(date)
  
  if (!isSpecial) return ''
  
  switch (type) {
    case 'sunday':
      return 'bg-red-50'
    case 'holiday':
      return 'bg-red-50'
    case 'sunday-holiday':
      return 'bg-red-100'
    default:
      return ''
  }
} 