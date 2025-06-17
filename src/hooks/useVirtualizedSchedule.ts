'use client'

import { useMemo, useEffect, useState, useCallback, useRef } from 'react'
import { Schedule } from '@/types'

interface VirtualizedConfig {
  itemHeight: number
  containerHeight: number
  overscan?: number
  schedules: Schedule[]
  visibleRange: { start: number; end: number }
}

interface VirtualizedItem {
  index: number
  top: number
  height: number
  schedule?: Schedule
  isTimeSlot: boolean
  timeLabel?: string
  date?: Date
}

export function useVirtualizedSchedule({
  itemHeight,
  containerHeight,
  overscan = 3,
  schedules,
  visibleRange
}: VirtualizedConfig) {
  const [scrollTop, setScrollTop] = useState(0)
  const [isScrolling, setIsScrolling] = useState(false)
  const scrollingTimeoutRef = useRef<NodeJS.Timeout>()
  
  // 仮想化された表示アイテムの計算
  const virtualItems = useMemo(() => {
    const totalItems = visibleRange.end - visibleRange.start
    const startIndex = Math.floor(scrollTop / itemHeight)
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight),
      totalItems
    )
    
    // オーバースキャン適用
    const overscanStart = Math.max(0, startIndex - overscan)
    const overscanEnd = Math.min(totalItems, endIndex + overscan)
    
    const items: VirtualizedItem[] = []
    
    for (let i = overscanStart; i < overscanEnd; i++) {
      const actualIndex = visibleRange.start + i
      const top = i * itemHeight
      
      // スケジュールの検索（最適化済み）
      const schedule = schedules.find(s => {
        // インデックスベースの効率的な検索
        return s.timeSlotIndex === actualIndex
      })
      
      items.push({
        index: i,
        top,
        height: itemHeight,
        schedule,
        isTimeSlot: !schedule,
        timeLabel: !schedule ? formatTimeLabel(actualIndex) : undefined
      })
    }
    
    return items
  }, [scrollTop, itemHeight, containerHeight, overscan, schedules, visibleRange])
  
  // スクロール状態管理（デバウンス付き）
  const handleScroll = useCallback((scrollTop: number) => {
    setScrollTop(scrollTop)
    setIsScrolling(true)
    
    // スクロール終了の検出
    if (scrollingTimeoutRef.current) {
      clearTimeout(scrollingTimeoutRef.current)
    }
    
    scrollingTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false)
    }, 150)
  }, [])
  
  // 総高さ計算
  const totalHeight = useMemo(() => {
    return (visibleRange.end - visibleRange.start) * itemHeight
  }, [visibleRange, itemHeight])
  
  // 特定のインデックスにスクロール
  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    const targetScrollTop = index * itemHeight
    return { top: targetScrollTop, behavior }
  }, [itemHeight])
  
  // 時刻ベースでのスクロール
  const scrollToTime = useCallback((hour: number, minute: number = 0) => {
    const timeInMinutes = hour * 60 + minute
    const index = Math.floor(timeInMinutes / 30) // 30分間隔想定
    return scrollToIndex(index)
  }, [scrollToIndex])
  
  // クリーンアップ
  useEffect(() => {
    return () => {
      if (scrollingTimeoutRef.current) {
        clearTimeout(scrollingTimeoutRef.current)
      }
    }
  }, [])
  
  return {
    virtualItems,
    totalHeight,
    isScrolling,
    handleScroll,
    scrollToIndex,
    scrollToTime,
    // デバッグ情報
    metrics: {
      visibleItemCount: virtualItems.length,
      totalItemCount: visibleRange.end - visibleRange.start,
      scrollTop,
      containerHeight
    }
  }
}

// 効率的なスケジュール検索用フック
export function useScheduleIndex(schedules: Schedule[]) {
  // スケジュールを時間インデックスでマップ化
  const scheduleIndex = useMemo(() => {
    const index = new Map<number, Schedule[]>()
    
    schedules.forEach(schedule => {
      if (schedule.timeSlotIndex !== undefined) {
        const existing = index.get(schedule.timeSlotIndex) || []
        existing.push(schedule)
        index.set(schedule.timeSlotIndex, existing)
      }
    })
    
    return index
  }, [schedules])
  
  const getSchedulesAtIndex = useCallback((timeSlotIndex: number) => {
    return scheduleIndex.get(timeSlotIndex) || []
  }, [scheduleIndex])
  
  return { getSchedulesAtIndex, scheduleIndex }
}

// インターセクション観察用フック（さらなる最適化）
export function useIntersectionObserver(
  targetRef: React.RefObject<HTMLElement>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  
  useEffect(() => {
    const target = targetRef.current
    if (!target) return
    
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting)
    }, {
      threshold: 0.1,
      rootMargin: '50px',
      ...options
    })
    
    observer.observe(target)
    
    return () => {
      observer.disconnect()
    }
  }, [targetRef, options])
  
  return isIntersecting
}

// レンダリング最適化用の項目メモ化
export function useVirtualizedItemMemo<T>(
  items: T[],
  keyExtractor: (item: T) => string | number
) {
  const memoizedItems = useMemo(() => {
    return items.map(item => ({
      key: keyExtractor(item),
      data: item
    }))
  }, [items, keyExtractor])
  
  return memoizedItems
}

// ヘルパー関数
function formatTimeLabel(timeSlotIndex: number): string {
  const totalMinutes = timeSlotIndex * 30 // 30分間隔想定
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

// パフォーマンスメトリクス計測用
export function usePerformanceMetrics() {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    itemCount: 0,
    lastUpdate: Date.now()
  })
  
  const measureRender = useCallback((itemCount: number) => {
    const start = performance.now()
    
    return () => {
      const end = performance.now()
      setMetrics({
        renderTime: end - start,
        itemCount,
        lastUpdate: Date.now()
      })
    }
  }, [])
  
  return { metrics, measureRender }
}