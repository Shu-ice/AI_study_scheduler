import { useState, useCallback, useMemo } from 'react'
import { CalendarSettings, TimeInterval, TimeSlot } from '@/types'

// デフォルトのカレンダー設定
const DEFAULT_SETTINGS: CalendarSettings = {
  timeInterval: 30,
  startHour: 5,
  endHour: 23,
  autoHeight: true,
  showOverlapping: true
}

export function useCalendarSettings(initialSettings?: Partial<CalendarSettings>) {
  const [settings, setSettings] = useState<CalendarSettings>({
    ...DEFAULT_SETTINGS,
    ...initialSettings
  })

  // 設定更新関数
  const updateSettings = useCallback((newSettings: Partial<CalendarSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }, [])

  // 時間間隔変更
  const setTimeInterval = useCallback((interval: TimeInterval) => {
    updateSettings({ timeInterval: interval })
  }, [updateSettings])

  // 時間範囲変更
  const setTimeRange = useCallback((startHour: number, endHour: number) => {
    updateSettings({ startHour, endHour })
  }, [updateSettings])

  // 時間スロット生成（設定に基づく）
  const timeSlots = useMemo((): TimeSlot[] => {
    const slots: TimeSlot[] = []
    const { timeInterval, startHour, endHour } = settings
    
    let index = 0
    for (let hour = startHour; hour <= endHour; hour++) {
      const slotsPerHour = 60 / timeInterval
      
      for (let slotIndex = 0; slotIndex < slotsPerHour; slotIndex++) {
        const minute = slotIndex * timeInterval
        
        // 最後の時間（例：23時）の場合、30分までしか生成しない
        if (hour === endHour && minute > 30) continue
        
        slots.push({
          hour,
          minute,
          display: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
          index
        })
        index++
      }
    }
    
    return slots
  }, [settings])

  // アイテム高さ計算（間隔に応じて調整）
  const getItemHeight = useCallback((isMobile: boolean = false) => {
    const { timeInterval } = settings
    const baseHeight = isMobile ? 32 : 24
    
    // 時間間隔が短いほど高さを小さく
    switch (timeInterval) {
      case 15:
        return baseHeight * 0.5 // 15分間隔は半分の高さ
      case 30:
        return baseHeight // 基本の高さ
      case 60:
        return baseHeight * 2 // 60分間隔は2倍の高さ
      default:
        return baseHeight
    }
  }, [settings])

  // スケジュール密度計算
  const calculateScheduleDensity = useCallback((schedules: any[], date: Date) => {
    const daySchedules = schedules.filter(schedule => 
      new Date(schedule.date).toDateString() === date.toDateString()
    )
    
    if (daySchedules.length === 0) return 'low'
    
    // 時間当たりのスケジュール数で密度を判定
    const totalHours = settings.endHour - settings.startHour
    const density = daySchedules.length / totalHours
    
    if (density > 0.5) return 'high'
    if (density > 0.2) return 'medium'
    return 'low'
  }, [settings])

  // 現在時刻のスロットインデックス取得
  const getCurrentTimeSlotIndex = useCallback(() => {
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    
    return timeSlots.findIndex(slot => {
      if (slot.hour > currentHour) return true
      if (slot.hour === currentHour && slot.minute >= currentMinute) return true
      return false
    })
  }, [timeSlots])

  return {
    settings,
    updateSettings,
    setTimeInterval,
    setTimeRange,
    timeSlots,
    getItemHeight,
    calculateScheduleDensity,
    getCurrentTimeSlotIndex
  }
}