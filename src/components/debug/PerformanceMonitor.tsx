'use client'

import { useState, useEffect, useRef, memo } from 'react'

interface PerformanceData {
  renderTime: number
  frameRate: number
  memoryUsage?: number
  componentRenderCount: number
  lastUpdate: number
}

interface PerformanceMonitorProps {
  enabled?: boolean
  componentName?: string
  className?: string
}

export const PerformanceMonitor = memo(function PerformanceMonitor({
  enabled = false,
  componentName = 'Component',
  className = ''
}: PerformanceMonitorProps) {
  const [performanceData, setPerformanceData] = useState<PerformanceData>({
    renderTime: 0,
    frameRate: 0,
    componentRenderCount: 0,
    lastUpdate: Date.now()
  })

  const renderCountRef = useRef(0)
  const frameTimeRef = useRef<number[]>([])
  const lastFrameTimeRef = useRef(Date.now())
  const startTimeRef = useRef(Date.now())

  useEffect(() => {
    if (!enabled) return

    renderCountRef.current += 1
    const renderTime = Date.now() - startTimeRef.current

    // フレームレート計算
    const now = Date.now()
    frameTimeRef.current.push(now)
    
    // 過去1秒のフレームタイムのみ保持
    frameTimeRef.current = frameTimeRef.current.filter(time => now - time <= 1000)
    
    const frameRate = frameTimeRef.current.length

    // メモリ使用量（可能な場合）
    let memoryUsage: number | undefined
    if ('memory' in performance) {
      const memory = (performance as any).memory
      memoryUsage = Math.round(memory.usedJSHeapSize / 1024 / 1024 * 100) / 100
    }

    setPerformanceData({
      renderTime,
      frameRate,
      memoryUsage,
      componentRenderCount: renderCountRef.current,
      lastUpdate: now
    })

    lastFrameTimeRef.current = now
  }, [enabled])

  useEffect(() => {
    startTimeRef.current = Date.now()
  }, [])

  if (!enabled) return null

  return (
    <div className={`fixed top-4 right-4 bg-black/80 text-white text-xs p-3 rounded-lg font-mono z-50 min-w-[200px] ${className}`}>
      <div className="text-yellow-400 font-bold mb-2">{componentName} Performance</div>
      <div className="space-y-1">
        <div>
          <span className="text-gray-300">Render Time:</span>
          <span className={`ml-2 ${performanceData.renderTime > 16 ? 'text-red-400' : 'text-green-400'}`}>
            {performanceData.renderTime.toFixed(2)}ms
          </span>
        </div>
        <div>
          <span className="text-gray-300">Frame Rate:</span>
          <span className={`ml-2 ${performanceData.frameRate < 30 ? 'text-red-400' : 'text-green-400'}`}>
            {performanceData.frameRate} FPS
          </span>
        </div>
        <div>
          <span className="text-gray-300">Renders:</span>
          <span className="ml-2 text-blue-400">{performanceData.componentRenderCount}</span>
        </div>
        {performanceData.memoryUsage && (
          <div>
            <span className="text-gray-300">Memory:</span>
            <span className={`ml-2 ${performanceData.memoryUsage > 50 ? 'text-red-400' : 'text-green-400'}`}>
              {performanceData.memoryUsage}MB
            </span>
          </div>
        )}
        <div className="text-xs text-gray-400 mt-2">
          Last: {new Date(performanceData.lastUpdate).toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
})

export default PerformanceMonitor 