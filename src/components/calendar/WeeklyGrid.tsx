'use client'

import { useState, useMemo, useCallback, useEffect, useRef, memo } from 'react'
import { format, startOfWeek, addDays, isSameDay, isToday, endOfWeek, addWeeks, subWeeks, startOfDay, endOfDay } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ChevronLeftIcon, ChevronRightIcon, ClockIcon } from '@heroicons/react/24/outline'
import { Schedule, TimeSlot, ScheduleCategory, CalendarSettings, ScheduleOverlap } from '@/types'
import { useColoredSchedules } from '@/hooks/useColoredSchedule'
import { useCalendarSettings } from '@/hooks/useCalendarSettings'
import { useScheduleOverlap } from '@/hooks/useScheduleOverlap'
import { isSpecialDay, getHolidayColor, getHolidayBackgroundColor, getJapaneseHolidayName } from '@/utils/holidays'
import ScheduleBlock from './ScheduleBlock'
import CalendarToolbar from './CalendarToolbar'

// カスタムフック：画面サイズとタッチデバイス検出
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false)
  
  useEffect(() => {
    const media = window.matchMedia(query)
    setMatches(media.matches)
    
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches)
    media.addEventListener('change', listener)
    
    return () => media.removeEventListener('change', listener)
  }, [query])
  
  return matches
}

// 改良版スワイプジェスチャーフック（慣性スクロール対応）
function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
  velocityThreshold = 0.3
}: {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  threshold?: number
  velocityThreshold?: number
}) {
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const touchStartTime = useRef<number>(0)
  const isSwipeInProgress = useRef<boolean>(false)
  
  const handlers = useMemo(() => ({
    onTouchStart: (e: React.TouchEvent) => {
      touchStartX.current = e.touches[0].clientX
      touchStartY.current = e.touches[0].clientY
      touchStartTime.current = Date.now()
      isSwipeInProgress.current = false
    },
    
    onTouchMove: (e: React.TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return
      
      const currentX = e.touches[0].clientX
      const currentY = e.touches[0].clientY
      
      const deltaX = currentX - touchStartX.current
      const deltaY = currentY - touchStartY.current
      
      // スワイプ方向の初期判定
      if (!isSwipeInProgress.current) {
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 20) {
          isSwipeInProgress.current = true
          e.preventDefault() // ブラウザのデフォルトスクロールを防ぐ
        }
      }
    },
    
    onTouchEnd: (e: React.TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return
      
      const touchEndX = e.changedTouches[0].clientX
      const touchEndY = e.changedTouches[0].clientY
      const touchEndTime = Date.now()
      
      const deltaX = touchEndX - touchStartX.current
      const deltaY = touchEndY - touchStartY.current
      const deltaTime = touchEndTime - touchStartTime.current
      
      // 速度計算（px/ms）
      const velocityX = Math.abs(deltaX) / deltaTime
      
      // 縦スクロールを優先（縦の移動が横より大きい場合はスワイプ無効）
      if (Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
        touchStartX.current = null
        touchStartY.current = null
        isSwipeInProgress.current = false
        return
      }
      
      // スワイプ判定：距離または速度で判定
      const isValidSwipe = Math.abs(deltaX) > threshold || velocityX > velocityThreshold
      
      if (isValidSwipe) {
        if (deltaX > 0) {
          onSwipeRight?.()
        } else {
          onSwipeLeft?.()
        }
      }
      
      touchStartX.current = null
      touchStartY.current = null
      isSwipeInProgress.current = false
    }
  }), [onSwipeLeft, onSwipeRight, threshold, velocityThreshold])
  
  return handlers
}

// オリエンテーション変更検出フック
function useOrientation() {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')
  
  useEffect(() => {
    const handleOrientationChange = () => {
      const isLandscape = window.innerWidth > window.innerHeight
      setOrientation(isLandscape ? 'landscape' : 'portrait')
    }
    
    handleOrientationChange() // 初期値設定
    window.addEventListener('resize', handleOrientationChange)
    window.addEventListener('orientationchange', handleOrientationChange)
    
    return () => {
      window.removeEventListener('resize', handleOrientationChange)
      window.removeEventListener('orientationchange', handleOrientationChange)
    }
  }, [])
  
  return orientation
}

// 仮想スクロール用フック
function useVirtualScrolling({
  itemHeight,
  containerHeight,
  itemCount,
  overscan = 5
}: {
  itemHeight: number
  containerHeight: number
  itemCount: number
  overscan?: number
}) {
  const [scrollTop, setScrollTop] = useState(0)
  
  const visibleStart = Math.floor(scrollTop / itemHeight)
  const visibleEnd = Math.min(
    itemCount,
    Math.ceil((scrollTop + containerHeight) / itemHeight)
  )
  
  const startIndex = Math.max(0, visibleStart - overscan)
  const endIndex = Math.min(itemCount, visibleEnd + overscan)
  
  const visibleItems = {
    startIndex,
    endIndex,
    offsetY: startIndex * itemHeight
  }
  
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])
  
  return {
    visibleItems,
    handleScroll,
    totalHeight: itemCount * itemHeight
  }
}

interface WeeklyGridProps {
  schedules: Schedule[]
  categories: ScheduleCategory[]
  onScheduleClick?: (schedule: Schedule) => void
  onTimeSlotClick?: (date: Date, time: string) => void
  onDayClick?: (date: Date) => void
  onScheduleUpdate?: () => void
  onScheduleMove?: (schedule: Schedule, newStartTime: string, newEndTime: string) => void
  initialSettings?: Partial<CalendarSettings>
}

// DayColumnコンポーネントを内部で定義
const DayColumn = memo(function DayColumn({
  date,
  timeSlots,
  schedules,
  isToday: isDayToday,
  isMobile,
  getItemHeight,
  settings,
  dragState,
  handleScheduleDragStart,
  handleScheduleDragEnd,
  getScheduleOverlap,
  onScheduleClick,
  onTimeSlotClick,
  onDayClick
}: {
  date: Date
  timeSlots: TimeSlot[]
  schedules: Schedule[]
  isToday: boolean
  isMobile?: boolean
  getItemHeight: (isMobile?: boolean) => number
  settings: CalendarSettings
  dragState: any
  handleScheduleDragStart: (schedule: Schedule, e: React.MouseEvent | React.TouchEvent) => void
  handleScheduleDragEnd: () => void
  getScheduleOverlap: (scheduleId: string) => ScheduleOverlap | null
  onScheduleClick?: (schedule: Schedule) => void
  onTimeSlotClick?: (date: Date, time: string) => void
  onDayClick?: (date: Date) => void
}) {
  const specialDay = isSpecialDay(date)
  const holidayBgColor = getHolidayBackgroundColor(date)
  const isSaturday = date.getDay() === 6

  // 🔧 時間列と同じitemHeight計算を使用（グリッド線の完全一致）
  const slotItemHeight = getItemHeight(isMobile)

  // スケジュールの開始時刻をメモ化
  const scheduleStartTimes = useMemo(() => {
    const startTimeMap = new Map<string, { hour: number; minute: number }>()
    schedules.forEach(schedule => {
      const [startHour, startMinute] = schedule.startTime.split(':').map(Number)
      startTimeMap.set(schedule.id, { hour: startHour, minute: startMinute })
    })
    return startTimeMap
  }, [schedules])

  // 各タイムスロットでのスケジュールをメモ化
  const slotsWithSchedules = useMemo(() => {
    return timeSlots.map((slot, slotIndex) => {
      const scheduleForSlot = schedules.find(schedule => {
        const startTime = scheduleStartTimes.get(schedule.id)
        if (!startTime) return false
        return startTime.hour === slot.hour && startTime.minute === slot.minute
      })

      return {
        slot,
        slotIndex,
        schedule: scheduleForSlot
      }
    })
  }, [timeSlots, schedules, scheduleStartTimes])

  // 🔧 スケジュールの正確な位置計算（任意の時間間隔対応）
  const getSchedulePosition = useCallback((schedule: Schedule) => {
    const [startHour, startMinute] = schedule.startTime.split(':').map(Number)
    const startTimeInMinutes = startHour * 60 + startMinute
    const dayStartInMinutes = settings.startHour * 60
    
    // 開始時刻からの経過分数
    const minutesFromStart = startTimeInMinutes - dayStartInMinutes
    
    // 🔧 根本修正：間隔設定に関係なく1分あたりのピクセル数を計算
    // 30分間隔のスロット高さを基準とする（24px/32px）
    const baseSlotHeight = isMobile ? 32 : 24
    const pixelsPerMinute = baseSlotHeight / 30 // 30分間隔のときの1分あたりピクセル数
    const position = minutesFromStart * pixelsPerMinute
    
    return Math.max(0, position) // 負の値は0にクリップ
  }, [settings.startHour, isMobile])

  const handleTimeSlotClick = useCallback((timeSlot: TimeSlot) => {
    onTimeSlotClick?.(date, timeSlot.display)
  }, [date, onTimeSlotClick])

  const handleDayClick = useCallback(() => {
    onDayClick?.(date)
  }, [date, onDayClick])

  const handleScheduleClick = useCallback((schedule: Schedule) => {
    onScheduleClick?.(schedule)
  }, [onScheduleClick])

  // 🚀 時間帯による美しいグラデーション背景色を適用
  const getTimeSlotBackgroundColor = (hour: number, minute: number): string => {
    const timeInMinutes = hour * 60 + minute
    
    // 時間帯による美しいグラデーション色分け
    if (timeInMinutes < 5 * 60) {
      // 深夜 (0:00-5:00): 深い夜の静寂
      return 'bg-gradient-to-br from-slate-200 via-gray-200 to-stone-200'
    } else if (timeInMinutes < 8 * 60) {
      // 早朝 (5:00-8:00): 暖かい朝日の色
      return 'bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50'
    } else if (timeInMinutes < 11 * 60) {
      // 午前 (8:00-11:00): 爽やかな朝の色
      return 'bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50'
    } else if (timeInMinutes < 14 * 60) {
      // 昼 (11:00-14:00): 明るい青空の色
      return 'bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50'
    } else if (timeInMinutes < 17 * 60) {
      // 午後 (14:00-17:00): 落ち着いた紫の色
      return 'bg-gradient-to-br from-indigo-50 via-purple-50 to-violet-50'
    } else if (timeInMinutes < 20 * 60) {
      // 夕方 (17:00-20:00): 夕焼けの色
      return 'bg-gradient-to-br from-rose-50 via-pink-50 to-fuchsia-50'
    } else if (timeInMinutes < 23 * 60) {
      // 夜 (20:00-23:00): 深い夜の色
      return 'bg-gradient-to-br from-indigo-100 via-purple-100 to-slate-100'
    } else {
      // 深夜 (23:00-): 最も深い夜の色
      return 'bg-gradient-to-br from-slate-200 via-gray-200 to-stone-200'
    }
  }

  return (
    <div className={`flex-1 border-r border-gray-200 relative ${
      holidayBgColor || (isSaturday ? 'bg-blue-25' : '')
    }`}>
      {/* タイムスロット背景 */}
      {slotsWithSchedules.map(({ slot, slotIndex }) => (
        <div
          key={`${date.toISOString()}-${slot.hour}-${slot.minute}-${slotIndex}`}
          className={`${
            // 🔧 修正: 次のスロットが正時の場合に濃いボーダーを適用（1メモリ上にシフト）
            // 現在スロットの次が正時（00分）なら濃いボーダー、次が30分なら薄いボーダー
            // slotIndexベースで判定: 次のスロットが正時かどうかで現在のボーダーを決定
            (() => {
              const nextSlotIndex = slotIndex + 1;
              if (nextSlotIndex >= slotsWithSchedules.length) {
                // 最後のスロットの場合は薄いボーダー
                return 'border-b border-gray-100';
              }
              const nextSlot = slotsWithSchedules[nextSlotIndex].slot;
              return nextSlot.minute === 0 
                ? 'border-b border-gray-200'  // 次が正時なら濃いボーダー
                : 'border-b border-gray-100'; // 次が30分なら薄いボーダー
            })()
          } cursor-pointer transition-colors relative ${
            isDayToday ? 'hover:bg-blue-50' : 'hover:bg-gray-50'
          } ${
            isMobile ? 'touch-manipulation tap-highlight-transparent' : ''
          } ${
            // 🚀 時間帯による背景色を適用
            getTimeSlotBackgroundColor ? getTimeSlotBackgroundColor(slot.hour, slot.minute) : ''
          }`}
          style={{
            // 🔧 時間列と同じitemHeight値を使用（完全一致）
            height: `${slotItemHeight}px`,
            minHeight: `${slotItemHeight}px`,
            // グリッド線の位置を正確に合わせるため、ボックスサイジングを統一
            boxSizing: 'border-box'
          }}
          onClick={() => handleTimeSlotClick(slot)}
        />
      ))}
      
      {/* 🔧 スケジュールブロック群（正確な位置に配置） */}
      {schedules.map(schedule => (
        <div
          key={`schedule-${schedule.id}`}
          className="absolute inset-x-0"
          style={{
            top: `${getSchedulePosition(schedule)}px`,
            zIndex: 20
          }}
        >
          <ScheduleBlock
            schedule={schedule}
            category={schedule.category}
            isMobile={isMobile}
            timeInterval={settings.timeInterval}
            itemHeight={slotItemHeight}
            overlap={getScheduleOverlap(schedule.id)}
            onClick={() => handleScheduleClick(schedule)}
            onDragStart={handleScheduleDragStart}
            onDragEnd={handleScheduleDragEnd}
            isDragging={dragState.isDragging && dragState.schedule?.id === schedule.id}
          />
        </div>
      ))}
    </div>
  )
})

// WeekNavigationコンポーネントを内部で定義
const WeekNavigation = memo(function WeekNavigation({
  currentWeek,
  currentDay,
  isMobile,
  mobileNavInfo,
  onPrevious,
  onNext,
  onToday,
  onScrollToNow
}: {
  currentWeek: Date
  currentDay?: Date
  isMobile: boolean
  mobileNavInfo?: {
    currentDate: Date
    dayOfWeek: string
    dayOfMonth: string
    monthYear: string
    isToday: boolean
  } | null
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
  onScrollToNow?: () => void
}) {
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 })
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 })

  return (
    <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 bg-white">
      <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
        {isMobile && mobileNavInfo ? (
          <>
            <div className="flex flex-col min-w-0">
              <h2 className="text-base font-semibold text-gray-900 truncate">
                {mobileNavInfo.monthYear}
              </h2>
              <div className="flex items-center space-x-2">
                <span className={`text-xl font-bold ${
                  mobileNavInfo.isToday ? 'text-blue-600' : 'text-gray-900'
                }`}>
                  {mobileNavInfo.dayOfMonth}
                </span>
                <span className={`text-sm ${
                  mobileNavInfo.isToday ? 'text-blue-600' : 'text-gray-600'
                }`}>
                  {mobileNavInfo.dayOfWeek}
                </span>
              </div>
            </div>
          </>
        ) : (
          <h2 className="text-sm sm:text-lg lg:text-xl font-semibold text-gray-900 truncate">
            {format(weekStart, 'yyyy年M月d日', { locale: ja })} - {format(weekEnd, 'M月d日', { locale: ja })}
          </h2>
        )}
        
        <div className="flex items-center space-x-1 sm:space-x-2">
          <button
            onClick={onToday}
            className={`px-2 py-1 text-xs sm:text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors ${
              isMobile ? 'min-h-[44px] min-w-[44px] flex items-center justify-center' : ''
            }`}
          >
            今日
          </button>
          {onScrollToNow && (
            <button
              onClick={onScrollToNow}
              className={`px-2 py-1 text-xs sm:text-sm font-medium text-green-600 bg-green-50 rounded-md hover:bg-green-100 transition-colors flex items-center ${
                isMobile ? 'min-h-[44px] min-w-[44px] justify-center' : ''
              }`}
              title="現在時刻にスクロール"
            >
              <ClockIcon className={`w-3 h-3 sm:w-4 sm:h-4 ${!isMobile ? 'mr-1' : ''}`} />
              {!isMobile && <span>現在時刻</span>}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-1">
        <button
          onClick={onPrevious}
          className={`p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors ${
            isMobile ? 'min-h-[44px] min-w-[44px] flex items-center justify-center' : ''
          }`}
          aria-label={isMobile ? "前の日" : "前の週"}
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
        <button
          onClick={onNext}
          className={`p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors ${
            isMobile ? 'min-h-[44px] min-w-[44px] flex items-center justify-center' : ''
          }`}
          aria-label={isMobile ? "次の日" : "次の週"}
        >
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
})

export default function WeeklyGrid({ 
  schedules, 
  categories,
  onScheduleClick, 
  onTimeSlotClick,
  onDayClick,
  onScheduleUpdate,
  onScheduleMove,
  initialSettings
}: WeeklyGridProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [currentDay, setCurrentDay] = useState(new Date()) // モバイル用の現在日
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  // 🚀 キーボードショートカットヘルプの状態
  const [showShortcutHelp, setShowShortcutHelp] = useState(false)
  
  // レスポンシブ検出
  const isMobile = useMediaQuery('(max-width: 768px)')
  const isTablet = useMediaQuery('(max-width: 1024px)')
  const orientation = useOrientation()
  
  // スケール状態（ピンチズーム用）
  const [scale, setScale] = useState(1)
  const [isPinching, setIsPinching] = useState(false)
  
  // カレンダー設定管理
  const {
    settings,
    updateSettings,
    timeSlots,
    getItemHeight,
    calculateScheduleDensity,
    getCurrentTimeSlotIndex
  } = useCalendarSettings(initialSettings)
  
  // ドラッグ&ドロップ状態
  const [dragState, setDragState] = useState<{
    isDragging: boolean
    schedule: Schedule | null
    startPosition: { x: number; y: number } | null
    originalStartTime: string | null
    originalEndTime: string | null
  }>({
    isDragging: false,
    schedule: null,
    startPosition: null,
    originalStartTime: null,
    originalEndTime: null
  })

  // 色彩システムでスケジュールを拡張
  const coloredSchedules = useColoredSchedules(schedules, categories)
  
  // 重複処理（各日ごと）
  const scheduleOverlapHook = useScheduleOverlap(coloredSchedules, currentWeek)
  const getScheduleOverlapsForDay = useCallback((date: Date) => {
    return scheduleOverlapHook.getOverlapInfo
  }, [scheduleOverlapHook.getOverlapInfo])
  
  // アイテム高さ計算
  const itemHeight = getItemHeight(isMobile)

  // timeSlotsはフックから取得（設定に応じた動的生成）

  // コンテンツの総高さ計算
  const totalContentHeight = timeSlots.length * itemHeight
  const maxScrollHeight = Math.max(600, totalContentHeight + 100)
  
  const virtualScrollData = useVirtualScrolling({
    itemHeight,
    containerHeight: maxScrollHeight,
    itemCount: timeSlots.length,
    overscan: 5
  })

  // 週の日付を生成 - メモ化で最適化
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 0 }) // 日曜日開始
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [currentWeek])
  
  // モバイル用の表示対象日を決定
  const displayDays = useMemo(() => {
    if (isMobile) {
      return [currentDay]
    }
    return weekDays
  }, [isMobile, currentDay, weekDays])
  
  // モバイルでcurrentDayが週の範囲外の場合、週を調整
  useEffect(() => {
    if (isMobile) {
      const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 })
      const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 })
      
      if (currentDay < weekStart || currentDay > weekEnd) {
        setCurrentWeek(currentDay)
      }
    }
  }, [isMobile, currentDay, currentWeek])

  // 各日のスケジュールをフィルタリング - メモ化で最適化
  const getSchedulesForDay = useCallback((date: Date) => {
    return coloredSchedules.filter(schedule => 
      isSameDay(new Date(schedule.date), date)
    )
  }, [coloredSchedules])
  
  // モバイル用のナビゲーション情報
  const mobileNavInfo = useMemo(() => {
    if (!isMobile) return null
    
    return {
      currentDate: currentDay,
      dayOfWeek: format(currentDay, 'E', { locale: ja }),
      dayOfMonth: format(currentDay, 'd'),
      monthYear: format(currentDay, 'yyyy年M月', { locale: ja }),
      isToday: isToday(currentDay)
    }
  }, [isMobile, currentDay])

  // リアルタイム更新のトリガー
  useEffect(() => {
    if (onScheduleUpdate) {
      const interval = setInterval(() => {
        // 必要に応じてリアルタイム更新をトリガー
        onScheduleUpdate()
      }, 30000) // 30秒間隔

      return () => clearInterval(interval)
    }
  }, [onScheduleUpdate])

  // 現在時刻にスクロールする関数
  const scrollToCurrentTime = useCallback(() => {
    if (!scrollContainerRef.current) return
    
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    
    // 現在時刻の位置を計算
    const dayStartInMinutes = settings.startHour * 60
    const currentTimeInMinutes = currentHour * 60 + currentMinute
    const minutesFromStart = currentTimeInMinutes - dayStartInMinutes
    
    if (minutesFromStart < 0) return // 表示範囲外
    
    const itemHeight = getItemHeight(isMobile)
    const pixelsPerMinute = itemHeight / settings.timeInterval
    const position = minutesFromStart * pixelsPerMinute
    
    // 画面中央に来るように調整
    const containerHeight = scrollContainerRef.current.clientHeight
    const scrollPosition = Math.max(0, position - containerHeight / 2)
    
    scrollContainerRef.current.scrollTo({
      top: scrollPosition,
      behavior: 'smooth'
    })
  }, [settings.startHour, settings.timeInterval, isMobile])

  // ナビゲーション関数群を先に定義
  const goToPreviousWeek = useCallback(() => {
    setCurrentWeek(prev => addDays(prev, -7))
  }, [])

  const goToNextWeek = useCallback(() => {
    setCurrentWeek(prev => addDays(prev, 7))
  }, [])
  
  const goToPreviousDay = useCallback(() => {
    setCurrentDay(prev => addDays(prev, -1))
  }, [])
  
  const goToNextDay = useCallback(() => {
    setCurrentDay(prev => addDays(prev, 1))
  }, [])

  const goToToday = useCallback(() => {
    const today = new Date()
    setCurrentWeek(today)
    setCurrentDay(today)
    scrollToCurrentTime()
  }, [scrollToCurrentTime])

  // ピンチズーム用の状態
  const initialPinchDistance = useRef<number | null>(null)
  const initialScale = useRef<number>(1)
  const lastTapTime = useRef<number>(0)
  
  // ダブルタップでスケールリセット
  const handleDoubleTap = useCallback(() => {
    setScale(1)
    initialScale.current = 1
  }, [])
  
  // ピンチ距離を計算
  const getPinchDistance = (touches: React.TouchList) => {
    const touch1 = touches[0]
    const touch2 = touches[1]
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    )
  }
  
  // スワイプジェスチャーハンドラー（関数定義後に配置）
  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: isMobile ? goToNextDay : goToNextWeek,
    onSwipeRight: isMobile ? goToPreviousDay : goToPreviousWeek,
    threshold: 80
  })
  
  // ピンチズーム対応
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const now = Date.now()
    
    if (e.touches.length === 2) {
      setIsPinching(true)
      initialPinchDistance.current = getPinchDistance(e.touches)
      initialScale.current = scale
      e.preventDefault() // ブラウザのデフォルトズームを防ぐ
    } else if (e.touches.length === 1) {
      // ダブルタップ検出
      if (now - lastTapTime.current < 300) {
        handleDoubleTap()
        e.preventDefault()
      }
      lastTapTime.current = now
      swipeHandlers.onTouchStart(e)
    }
  }, [swipeHandlers, scale, handleDoubleTap])
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && isPinching && initialPinchDistance.current) {
      e.preventDefault()
      const currentDistance = getPinchDistance(e.touches)
      const scaleRatio = currentDistance / initialPinchDistance.current
      const newScale = Math.min(Math.max(initialScale.current * scaleRatio, 0.5), 3) // 0.5x～3xの範囲
      setScale(newScale)
    } else {
      // スワイプジェスチャーの処理
      swipeHandlers.onTouchMove?.(e)
    }
  }, [isPinching, swipeHandlers])
  
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      setIsPinching(false)
      initialPinchDistance.current = null
      initialScale.current = scale
    }
    if (e.touches.length === 0) {
      swipeHandlers.onTouchEnd(e)
    }
  }, [swipeHandlers, scale])

  // 初回レンダリング時に現在時刻にスクロール
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToCurrentTime()
    }, 100) // レンダリング完了後にスクロール

    return () => clearTimeout(timer)
  }, [scrollToCurrentTime])

  // 🔧 スクロールバー幅を検出してCSS変数に設定
  useEffect(() => {
    const updateScrollbarWidth = () => {
      if (scrollContainerRef.current) {
        const container = scrollContainerRef.current
        const scrollbarWidth = container.offsetWidth - container.clientWidth
        document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`)
      }
    }

    // 初期設定
    updateScrollbarWidth()

    // リサイズ時にも更新
    const handleResize = () => {
      updateScrollbarWidth()
    }

    window.addEventListener('resize', handleResize)
    
    // MutationObserver for dynamic content changes
    const observer = new MutationObserver(updateScrollbarWidth)
    if (scrollContainerRef.current) {
      observer.observe(scrollContainerRef.current, { 
        childList: true, 
        subtree: true,
        attributes: true 
      })
    }

    return () => {
      window.removeEventListener('resize', handleResize)
      observer.disconnect()
    }
  }, [])

  // 現在時刻インジケーターの計算
  const currentTimeIndicator = useMemo(() => {
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    
    // 表示範囲内かチェック
    if (currentHour < settings.startHour || currentHour > settings.endHour) return null
    
    // 開始時刻からの経過分数を計算
    const minutesFromStart = (currentHour - settings.startHour) * 60 + currentMinute
    const position = (minutesFromStart / settings.timeInterval) * itemHeight
    
    return {
      position,
      time: `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`
    }
  }, [itemHeight, settings])

  // 現在時刻インジケーターの更新
  useEffect(() => {
    const updateInterval = setInterval(() => {
      // 強制再レンダリングで現在時刻インジケーターを更新
      setCurrentWeek(prev => new Date(prev))
    }, 60000) // 1分ごと

    return () => clearInterval(updateInterval)
  }, [])

  // 🚀 キーボードショートカット用のヘルパー関数群
  const scrollByHours = (hours: number) => {
    if (!scrollContainerRef.current) return
    
    const container = scrollContainerRef.current
    const itemHeight = getItemHeight(isMobile)
    const slotsPerHour = 60 / settings.timeInterval
    const scrollAmount = hours * slotsPerHour * itemHeight
    
    container.scrollBy({
      top: scrollAmount,
      behavior: 'smooth'
    })
  }
  
  const createNewSchedule = () => {
    // 現在時刻ベースで新しいスケジュール作成
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = Math.floor(now.getMinutes() / settings.timeInterval) * settings.timeInterval
    
    const startTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`
    const endHour = currentMinute + settings.timeInterval >= 60 ? currentHour + 1 : currentHour
    const endMinute = (currentMinute + settings.timeInterval) % 60
    const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`
    
    // 今日の日付か、モバイルの場合は選択中の日付
    const targetDate = isMobile ? currentDay : new Date()
    
    onTimeSlotClick?.(targetDate, startTime)
  }

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // モーダルが開いている時は無効化
      if (document.querySelector('[role="dialog"]')) return
      
      // 🚀 キーボードショートカット機能追加
      switch (e.key) {
        case 'ArrowLeft':
          // 左矢印: 前の週/日
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            if (isMobile) {
              goToPreviousDay()
            } else {
              goToPreviousWeek()
            }
          }
          break
          
        case 'ArrowRight':
          // 右矢印: 次の週/日
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            if (isMobile) {
              goToNextDay()
            } else {
              goToNextWeek()
            }
          }
          break
          
        case 'ArrowUp':
          // 上矢印: 1時間前にスクロール
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            scrollByHours(-1)
          }
          break
          
        case 'ArrowDown':
          // 下矢印: 1時間後にスクロール
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            scrollByHours(1)
          }
          break
          
        case 't':
        case 'T':
          // T: 今日に移動
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            goToToday()
          }
          break
          
        case 'n':
        case 'N':
          // Ctrl+N: 新しいスケジュール作成（現在時刻）
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            createNewSchedule()
          }
          break
          
        case 'g':
        case 'G':
          // G: 現在時刻にスクロール
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            scrollToCurrentTime()
          }
          break
          
        case 'Escape':
          // ESC: フォーカスをクリア、選択解除
          e.preventDefault()
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur()
          }
          // ヘルプモーダルが開いている場合は閉じる
          if (showShortcutHelp) {
            setShowShortcutHelp(false)
          }
          break
          
        case '?':
          // ?: キーボードショートカットヘルプを表示
          if (!e.shiftKey) break // Shift+?のみ反応
          e.preventDefault()
          setShowShortcutHelp(true)
          break
          
        case '1':
        case '2':
        case '3':
          // 数字キー: 時間間隔変更（Ctrl押下時）
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            const intervals = [15, 30, 60] as const
            const newInterval = intervals[parseInt(e.key) - 1]
            if (newInterval) {
              updateSettings({ timeInterval: newInterval })
            }
          }
          break
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goToPreviousWeek, goToNextWeek, goToToday, scrollToCurrentTime, isMobile, goToPreviousDay, goToNextDay, updateSettings, scrollByHours, createNewSchedule, showShortcutHelp, setShowShortcutHelp])

  // スクロール位置の記憶
  const [lastScrollPosition, setLastScrollPosition] = useState(0)
  
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setLastScrollPosition(e.currentTarget.scrollTop)
  }, [])

  // 週変更時に適切なスクロール位置を復元
  useEffect(() => {
    if (scrollContainerRef.current && lastScrollPosition > 0) {
      scrollContainerRef.current.scrollTop = lastScrollPosition
    }
  }, [currentWeek, lastScrollPosition])

  // ドラッグ&ドロップ処理
  const handleScheduleDragStart = useCallback((schedule: Schedule, e: React.MouseEvent | React.TouchEvent) => {
    setDragState({
      isDragging: true,
      schedule,
      startPosition: 'touches' in e 
        ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
        : { x: e.clientX, y: e.clientY },
      originalStartTime: schedule.startTime,
      originalEndTime: schedule.endTime
    })
  }, [])
  
  // 🚀 スナップ機能：時間を最寄りの間隔に調整
  const snapToTimeInterval = (timeString: string): string => {
    const [hours, minutes] = timeString.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes
    
    // 現在の時間間隔に合わせてスナップ
    const snappedMinutes = Math.round(totalMinutes / settings.timeInterval) * settings.timeInterval
    const snappedHours = Math.floor(snappedMinutes / 60)
    const snappedMins = snappedMinutes % 60
    
    // 範囲チェック（5:00-23:30）
    const clampedHours = Math.max(settings.startHour, Math.min(settings.endHour, snappedHours))
    const clampedMins = clampedHours === settings.endHour ? Math.min(30, snappedMins) : snappedMins
    
    return `${clampedHours.toString().padStart(2, '0')}:${clampedMins.toString().padStart(2, '0')}`
  }
  
  const handleScheduleDragEnd = useCallback(() => {
    if (dragState.schedule && onScheduleMove) {
      // 🚀 スナップ機能：新しい時刻を最寄りの間隔に調整
      const originalStart = dragState.originalStartTime || ''
      const originalEnd = dragState.originalEndTime || ''
      const tempStart = dragState.schedule.tempStartTime || originalStart
      const tempEnd = dragState.schedule.tempEndTime || originalEnd
      
      // 時間間隔にスナップ
      const snappedStartTime = snapToTimeInterval(tempStart)
      const snappedEndTime = snapToTimeInterval(tempEnd)
      
      // 継続時間を保持（必要に応じて調整）
      const originalDuration = calculateDuration(originalStart, originalEnd)
      const newEndTime = addMinutesToTime(snappedStartTime, originalDuration)
      
      onScheduleMove(
        dragState.schedule,
        snappedStartTime,
        newEndTime
      )
    }
    
    setDragState({
      isDragging: false,
      schedule: null,
      startPosition: null,
      originalStartTime: null,
      originalEndTime: null
    })
  }, [dragState, onScheduleMove])
  
  // 🚀 ヘルパー関数：継続時間を計算
  const calculateDuration = useCallback((startTime: string, endTime: string): number => {
    const [startHour, startMinute] = startTime.split(':').map(Number)
    const [endHour, endMinute] = endTime.split(':').map(Number)
    
    const startMinutes = startHour * 60 + startMinute
    const endMinutes = endHour * 60 + endMinute
    
    return endMinutes - startMinutes
  }, [])
  
  // 🚀 ヘルパー関数：時刻に分を加算
  const addMinutesToTime = useCallback((timeString: string, minutesToAdd: number): string => {
    const [hours, minutes] = timeString.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes + minutesToAdd
    
    const newHours = Math.floor(totalMinutes / 60)
    const newMinutes = totalMinutes % 60
    
    // 範囲チェック
    const clampedHours = Math.max(settings.startHour, Math.min(settings.endHour, newHours))
    const clampedMins = clampedHours === settings.endHour ? Math.min(30, newMinutes) : newMinutes
    
    return `${clampedHours.toString().padStart(2, '0')}:${clampedMins.toString().padStart(2, '0')}`
  }, [settings.startHour, settings.endHour])

  return (
    <div 
      className={`w-full h-full bg-white ${isMobile ? 'overflow-hidden' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'manipulation' }}
    >
      {/* 📅 ヘッダー: 週ナビゲーション + 日付 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <WeekNavigation
          currentWeek={currentWeek}
          currentDay={currentDay}
          isMobile={isMobile}
          mobileNavInfo={mobileNavInfo}
          onPrevious={goToPreviousWeek}
          onNext={goToNextWeek}
          onToday={goToToday}
          onScrollToNow={scrollToCurrentTime}
        />
        
        {/* 📅 日付ヘッダー部分（時間カラムのスペース + 日付列） */}
        <div className="flex bg-gray-50">
          {/* 時間列のスペースを空ける */}
          <div className="w-16 sm:w-20 flex-shrink-0">
            {/* 空のスペース */}
          </div>
          
          {/* 💫 動的なスクロールバー幅を確保するスペーサー */}
          <div style={{ width: 'var(--scrollbar-width, 0px)' }}></div>
          
          {/* 日付ヘッダー */}
          <div className={`flex flex-1 ${isMobile ? 'justify-center' : ''}`}>
            {displayDays.map((date, index) => {
              const dayOfWeek = date.toLocaleDateString('ja-JP', { weekday: 'short' })
              const dayOfMonth = date.getDate().toString()
              const isToday_ = isToday(date)
              const holidayColor = getHolidayColor(date)
              const holidayBgColor = getHolidayBackgroundColor(date)
              const specialDay = isSpecialDay(date)
              
              return (
                <div
                  key={`header-${index}`}
                  className={`
                    flex-1 min-w-0 text-center py-3 cursor-pointer border-r border-gray-200 last:border-r-0
                    ${isToday_ ? 'bg-blue-50 text-blue-700' : holidayBgColor || 'hover:bg-gray-100'}
                  `}
                  onClick={() => onDayClick?.(date)}
                  title={specialDay.holidayName || ''}
                >
                  <div className={`text-xs mb-1 ${holidayColor || 'text-gray-500'}`}>{dayOfWeek}</div>
                  <div className={`text-lg font-bold ${
                    isToday_ ? 'text-blue-700' : holidayColor || 'text-gray-900'
                  }`}>
                    {dayOfMonth}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 📊 カレンダーメインコンテンツ */}
      <div className="flex-1 flex flex-col">
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-auto relative"
          style={{ minHeight: 0, height: '100%', maxHeight: 'none' }}
          onDragOver={(e) => {
            e.preventDefault()
          }}
          onDrop={(e) => {
            e.preventDefault()
          }}
          onScroll={handleScroll}
        >
          {/* 🔧 適切なコンテナ高さに調整（23時台を他と同じ高さに） */}
          <div className="flex relative" style={{ 
            minHeight: `${totalContentHeight + 40}px` // 20px -> 40pxに調整
          }}>
            {/* 時間列 - スクロールと同期 */}
            <div className="w-16 sm:w-20 bg-gray-50 border-r border-gray-200 flex-shrink-0 sticky left-0 z-10">
              <div className="relative">
                {timeSlots.map((slot, index) => (
                  <div
                    key={slot.display}
                    className={`flex items-start justify-center pt-1 ${
                      // 🔧 修正: 次のスロットが正時の場合に濃いボーダーを適用（1メモリ上にシフト）
                      (() => {
                        const nextIndex = index + 1;
                        if (nextIndex >= timeSlots.length) {
                          // 最後のスロットの場合は薄いボーダー
                          return 'border-b border-gray-100';
                        }
                        const nextSlot = timeSlots[nextIndex];
                        return nextSlot.minute === 0 
                          ? 'border-b border-gray-200'  // 次が正時なら濃いボーダー
                          : 'border-b border-gray-100'; // 次が30分なら薄いボーダー
                      })()
                    }`}
                    style={{
                      // 🔧 DayColumnと同じitemHeight計算を使用（グリッド線の完全一致）
                      height: `${itemHeight}px`,
                      minHeight: `${itemHeight}px`,
                      boxSizing: 'border-box'
                    }}
                  >
                    {/* 正時のみ表示、30分は非表示 */}
                    {slot.minute === 0 && (
                      <span className="text-xs text-gray-600 font-medium">
                        {slot.display}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 日付列とスケジュール */}
            <div className={`flex flex-1 min-w-0 relative ${
              isMobile ? 'justify-center' : ''
            }`}>
              {/* 現在時刻インジケーター */}
              {currentTimeIndicator && (
                <div
                  className="absolute left-0 right-0 z-40 pointer-events-none"
                  style={{ top: `${currentTimeIndicator.position}px` }}
                >
                  <div className="flex items-center">
                    <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-md shadow-lg font-medium z-50">
                      {currentTimeIndicator.time}
                    </div>
                    <div className="flex-1 h-0.5 bg-red-500 shadow-lg"></div>
                  </div>
                </div>
              )}
              
              {displayDays.map((date, index) => {
                const getOverlapForSchedule = getScheduleOverlapsForDay(date)
                return (
                  <DayColumn
                    key={`${date.toISOString()}-${index}`}
                    date={date}
                    timeSlots={timeSlots}
                    schedules={getSchedulesForDay(date)}
                    isToday={isToday(date)}
                    isMobile={isMobile}
                    getItemHeight={getItemHeight}
                    settings={settings}
                    dragState={dragState}
                    handleScheduleDragStart={handleScheduleDragStart}
                    handleScheduleDragEnd={handleScheduleDragEnd}
                    getScheduleOverlap={getOverlapForSchedule}
                    onScheduleClick={onScheduleClick}
                    onTimeSlotClick={onTimeSlotClick}
                    onDayClick={onDayClick}
                  />
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 🚀 キーボードショートカットヘルプモーダル */}
      {showShortcutHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" role="dialog">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full m-4 max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">キーボードショートカット</h2>
                <button
                  onClick={() => setShowShortcutHelp(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-900">ナビゲーション</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">前の週/日へ移動</span>
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Ctrl + ←</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">次の週/日へ移動</span>
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Ctrl + →</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">今日に移動</span>
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Ctrl + T</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">現在時刻にスクロール</span>
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Ctrl + G</kbd>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-900">スクロール</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">1時間前にスクロール</span>
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Ctrl + ↑</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">1時間後にスクロール</span>
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Ctrl + ↓</kbd>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-900">スケジュール</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">新しいスケジュール作成</span>
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Ctrl + N</kbd>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-900">表示設定</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">15分間隔</span>
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Ctrl + 1</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">30分間隔</span>
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Ctrl + 2</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">60分間隔</span>
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Ctrl + 3</kbd>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-900">その他</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">このヘルプを表示</span>
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Shift + ?</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">フォーカス解除/モーダル閉じる</span>
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Esc</kbd>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="sticky bottom-0 bg-gray-50 px-6 py-3 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                💡 これらのショートカットでカレンダーをより効率的に操作できます
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 