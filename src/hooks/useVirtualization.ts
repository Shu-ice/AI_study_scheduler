'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'

interface VirtualizationOptions {
  itemHeight: number
  containerHeight: number
  overscan?: number
}

interface VirtualItem {
  index: number
  start: number
  end: number
}

interface UseVirtualizationReturn {
  virtualItems: VirtualItem[]
  totalHeight: number
  scrollElementProps: {
    onScroll: (e: React.UIEvent<HTMLElement>) => void
    style: React.CSSProperties
  }
}

export function useVirtualization(
  itemCount: number,
  options: VirtualizationOptions
): UseVirtualizationReturn {
  const { itemHeight, containerHeight, overscan = 5 } = options
  const [scrollTop, setScrollTop] = useState(0)

  const totalHeight = itemCount * itemHeight

  const virtualItems = useMemo(() => {
    const visibleStart = Math.floor(scrollTop / itemHeight)
    const visibleEnd = Math.min(
      itemCount - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight)
    )

    const start = Math.max(0, visibleStart - overscan)
    const end = Math.min(itemCount - 1, visibleEnd + overscan)

    const items: VirtualItem[] = []
    for (let i = start; i <= end; i++) {
      items.push({
        index: i,
        start: i * itemHeight,
        end: (i + 1) * itemHeight
      })
    }

    return items
  }, [scrollTop, itemHeight, containerHeight, itemCount, overscan])

  const handleScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  const scrollElementProps = {
    onScroll: handleScroll,
    style: {
      height: containerHeight,
      overflow: 'auto' as const
    }
  }

  return {
    virtualItems,
    totalHeight,
    scrollElementProps
  }
}

export default useVirtualization 