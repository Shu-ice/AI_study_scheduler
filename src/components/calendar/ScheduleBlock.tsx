import { Schedule, ScheduleCategory, ScheduleOverlap } from '@/types'
import { useColoredSchedule, getScheduleStyles, getScheduleHoverStyles } from '@/hooks/useColoredSchedule'
import CategoryIndicator from '@/components/ui/CategoryIndicator'
import { useState, useEffect, useCallback, useRef } from 'react'

// ハプティックフィードバック（触覚）機能
const triggerHapticFeedback = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) {
    // Android用のバイブレーション
    const patterns = {
      light: 10,
      medium: 20,
      heavy: 50
    }
    navigator.vibrate(patterns[type])
  }
  
  // iOS用のハプティックフィードバック（Web API使用）
  if ('HapticFeedback' in window) {
    try {
      const feedback = (window as any).HapticFeedback
      feedback[type]()
    } catch (error) {
      // フォールバック処理
      console.debug('Haptic feedback not available')
    }
  }
}

// タッチ誤認防止のためのタップ検証
const useTouchValidation = () => {
  const touchStartTime = useRef<number>(0)
  const touchStartPosition = useRef<{ x: number; y: number } | null>(null)
  
  const isValidTap = useCallback((e: React.TouchEvent) => {
    const touchEndTime = Date.now()
    const touchDuration = touchEndTime - touchStartTime.current
    
    // 150ms未満のタップは誤タップとして無視
    if (touchDuration < 150) return false
    
    // 500ms以上のタップは長押しとして扱う
    if (touchDuration > 500) return false
    
    // タッチ位置の移動量をチェック（ドラッグの可能性）
    if (touchStartPosition.current && e.changedTouches[0]) {
      const touch = e.changedTouches[0]
      const deltaX = Math.abs(touch.clientX - touchStartPosition.current.x)
      const deltaY = Math.abs(touch.clientY - touchStartPosition.current.y)
      const movement = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      
      // 10px以上移動している場合はドラッグとして処理
      if (movement > 10) return false
    }
    
    return true
  }, [])
  
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartTime.current = Date.now()
    if (e.touches[0]) {
      touchStartPosition.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      }
    }
  }, [])
  
  return { isValidTap, handleTouchStart }
}

// モバイル検出フック
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  return isMobile
}

interface ScheduleBlockProps {
  schedule: Schedule
  category: ScheduleCategory
  onClick?: () => void
  isMobile?: boolean
  timeInterval?: number // 時間間隔（分）
  itemHeight?: number // スロットの高さ
  overlap?: ScheduleOverlap | null // 重複情報
  onDragStart?: (schedule: Schedule, e: React.MouseEvent | React.TouchEvent) => void
  onDragEnd?: () => void
  isDragging?: boolean
}

export default function ScheduleBlock({ 
  schedule, 
  category, 
  onClick, 
  isMobile: propIsMobile,
  timeInterval = 30,
  itemHeight,
  overlap,
  onDragStart,
  onDragEnd,
  isDragging = false
}: ScheduleBlockProps) {
  const coloredSchedule = useColoredSchedule(schedule, category)
  const hookIsMobile = useIsMobile()
  const isMobile = propIsMobile ?? hookIsMobile
  
  // スケジュールの継続時間を計算（動的時間間隔対応）
  const calculateDuration = () => {
    const [startHour, startMinute] = schedule.startTime.split(':').map(Number)
    const [endHour, endMinute] = schedule.endTime.split(':').map(Number)
    
    const startMinutes = startHour * 60 + startMinute
    const endMinutes = endHour * 60 + endMinute
    
    // 指定された時間間隔でスロット数を計算
    const durationMinutes = endMinutes - startMinutes
    const slotCount = durationMinutes / timeInterval
    
    return slotCount
  }

  const slotCount = calculateDuration()
  // モバイルでは最小44px、デスクトップでは最小24px
  const minHeight = isMobile ? 44 : 24
  // スロットの高さを使用（設定で指定された値またはデフォルト）
  const slotHeight = itemHeight || (isMobile ? 32 : 24)
  const baseHeight = slotCount * slotHeight
  const height = Math.max(baseHeight, minHeight)

  const baseStyles = getScheduleStyles(coloredSchedule)
  const hoverStyles = getScheduleHoverStyles(coloredSchedule)

  // タッチイベント用の状態
  const [isTouched, setIsTouched] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  const { isValidTap, handleTouchStart: validateTouchStart } = useTouchValidation()
  
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsTouched(true)
    setIsPressed(true)
    validateTouchStart(e)
    
    // 軽いハプティックフィードバック
    triggerHapticFeedback('light')
    
    e.stopPropagation()
  }, [validateTouchStart])
  
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    setIsTouched(false)
    setIsPressed(false)
    
    // タップが有効な場合のみクリック処理を実行
    if (isValidTap(e)) {
      // 中程度のハプティックフィードバック
      triggerHapticFeedback('medium')
      
      // 少し遅延してクリックイベントを発火（フィードバック完了を待つ）
      setTimeout(() => {
        onClick?.()
      }, 50)
    }
    
    e.stopPropagation()
  }, [isValidTap, onClick])
  
  const handleTouchCancel = useCallback(() => {
    setIsTouched(false)
    setIsPressed(false)
  }, [])
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isDragging) {
      onClick?.()
    }
  }
  
  // ドラッグ開始処理（Altキー押下時のみ）
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isMobile && onDragStart && e.altKey) {
      e.preventDefault()
      onDragStart(schedule, e)
    }
  }, [isMobile, onDragStart, schedule])
  
  const handleTouchStartOverride = useCallback((e: React.TouchEvent) => {
    setIsTouched(true)
    setIsPressed(true)
    validateTouchStart(e)
    
    // 軽いハプティックフィードバック
    triggerHapticFeedback('light')
    
    // モバイルでのドラッグ開始
    if (isMobile && onDragStart) {
      onDragStart(schedule, e)
    }
    
    e.stopPropagation()
  }, [validateTouchStart, isMobile, onDragStart, schedule])

  return (
    <div
      className={`
        absolute rounded-md shadow-sm cursor-pointer 
        transition-all duration-150 z-10 border border-solid
        tap-highlight-transparent touch-manipulation
        ${isMobile ? 'active:scale-95' : 'hover:shadow-md hover:scale-105'}
        ${isTouched ? 'scale-95 shadow-lg' : ''}
        ${isPressed ? 'animate-touch-feedback' : ''}
        ${isDragging ? 'opacity-80 scale-105 shadow-xl z-50' : ''}
        ${overlap ? 'border-2' : ''}
      `}
      style={{
        height: `${height}px`,
        minHeight: isMobile ? '44px' : '24px',
        minWidth: isMobile ? '44px' : 'auto',
        left: overlap ? `${overlap.column * (overlap.width * 100)}%` : '4px',
        right: overlap ? `${(overlap.totalColumns - overlap.column - 1) * (overlap.width * 100)}%` : '4px',
        width: overlap ? `${overlap.width * 100}%` : 'calc(100% - 8px)',
        ...baseStyles,
        ...(isTouched ? hoverStyles : {}),
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        cursor: isDragging ? 'grabbing' : 'pointer'
      }}
      onMouseEnter={(e) => {
        if (!isMobile) {
          Object.assign(e.currentTarget.style, hoverStyles)
        }
      }}
      onMouseLeave={(e) => {
        if (!isMobile) {
          Object.assign(e.currentTarget.style, baseStyles)
        }
      }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStartOverride}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      role="button"
      tabIndex={0}
      aria-label={`スケジュール: ${schedule.title}, ${schedule.startTime} - ${schedule.endTime}${overlap ? `, 重複${overlap.totalColumns}件の${overlap.column + 1}番目` : ''}`}
      aria-pressed={isPressed}
      aria-grabbed={isDragging}
    >
      <div className={`${
        isMobile ? 'p-2' : 'p-1'
      } h-full flex flex-col justify-start overflow-hidden`}>
        <div className="flex items-center justify-between mb-1">
          <div className={`font-medium truncate flex-1 ${
            isMobile ? 'text-sm' : 'text-xs'
          }`}>
            {schedule.title}
          </div>
          <CategoryIndicator 
            category={category} 
            size={isMobile ? "md" : "sm"}
            variant="dot" 
            showName={false}
            className="ml-1 flex-shrink-0"
          />
        </div>
        <div className={`${
          isMobile ? 'text-sm' : 'text-xs'
        } opacity-90 truncate`}>
          {schedule.startTime} - {schedule.endTime}
        </div>
        {/* 重複情報表示 */}
        {overlap && overlap.totalColumns > 1 && (
          <div className="text-xs opacity-60 truncate">
            {overlap.totalColumns}件重複
          </div>
        )}
        
        {schedule.description && (slotCount > 2 || isMobile) && !overlap && (
          <div className={`${
            isMobile ? 'text-sm' : 'text-xs'
          } opacity-75 truncate mt-1`}>
            {schedule.description}
          </div>
        )}
      </div>
    </div>
  )
} 