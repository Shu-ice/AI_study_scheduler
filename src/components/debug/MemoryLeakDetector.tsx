'use client'

import { useState, useEffect, useRef, memo } from 'react'

interface MemoryStats {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
  timestamp: number
}

interface MemoryLeakDetectorProps {
  enabled?: boolean
  threshold?: number // MB単位での警告閾値
  sampleInterval?: number // ミリ秒
  maxSamples?: number
}

export const MemoryLeakDetector = memo(function MemoryLeakDetector({
  enabled = false,
  threshold = 100, // 100MB
  sampleInterval = 1000, // 1秒
  maxSamples = 60 // 60サンプル（1分間）
}: MemoryLeakDetectorProps) {
  const [memoryHistory, setMemoryHistory] = useState<MemoryStats[]>([])
  const [isLeakDetected, setIsLeakDetected] = useState(false)
  const [currentMemory, setCurrentMemory] = useState<MemoryStats | null>(null)
  const intervalRef = useRef<NodeJS.Timeout>()

  // メモリ情報を取得
  const getMemoryInfo = (): MemoryStats | null => {
    if (!('memory' in performance)) {
      return null
    }

    const memory = (performance as any).memory
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      timestamp: Date.now()
    }
  }

  // メモリリークを検出
  const detectMemoryLeak = (history: MemoryStats[]): boolean => {
    if (history.length < 10) return false

    // 直近10サンプルの平均増加率を計算
    const recent10 = history.slice(-10)
    const increases = recent10.slice(1).map((curr, index) => 
      curr.usedJSHeapSize - recent10[index].usedJSHeapSize
    )

    const positiveIncreases = increases.filter(inc => inc > 0)
    const avgIncrease = positiveIncreases.length > 0 
      ? positiveIncreases.reduce((sum, inc) => sum + inc, 0) / positiveIncreases.length 
      : 0

    // 継続的に増加している場合はリーク疑い
    const consistentIncreases = increases.filter(inc => inc > 1024 * 1024).length // 1MB以上の増加
    return consistentIncreases >= 6 && avgIncrease > 2 * 1024 * 1024 // 平均2MB以上増加
  }

  // 現在のメモリ使用量（MB）
  const getCurrentMemoryMB = (): number => {
    return currentMemory ? currentMemory.usedJSHeapSize / (1024 * 1024) : 0
  }

  // メモリ増加率（％）
  const getMemoryGrowthRate = (): number => {
    if (memoryHistory.length < 2) return 0
    const first = memoryHistory[0]
    const last = memoryHistory[memoryHistory.length - 1]
    return ((last.usedJSHeapSize - first.usedJSHeapSize) / first.usedJSHeapSize) * 100
  }

  // メモリサンプリング
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      return
    }

    intervalRef.current = setInterval(() => {
      const memInfo = getMemoryInfo()
      if (!memInfo) return

      setCurrentMemory(memInfo)

      setMemoryHistory(prev => {
        const newHistory = [...prev, memInfo].slice(-maxSamples)
        setIsLeakDetected(detectMemoryLeak(newHistory))
        return newHistory
      })
    }, sampleInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [enabled, sampleInterval, maxSamples])

  if (!enabled || !currentMemory) return null

  const memoryMB = getCurrentMemoryMB()
  const isOverThreshold = memoryMB > threshold
  const growthRate = getMemoryGrowthRate()

  return (
    <div className={`fixed top-20 right-4 p-3 rounded-lg font-mono text-xs z-50 min-w-[200px] ${
      isLeakDetected || isOverThreshold 
        ? 'bg-red-900/90 text-red-100' 
        : 'bg-gray-900/90 text-gray-100'
    }`}>
      <div className="flex items-center mb-2">
        <span className="text-orange-400 font-bold">🧠 Memory Monitor</span>
        {(isLeakDetected || isOverThreshold) && (
          <span className="ml-2 text-red-400 animate-pulse">⚠️</span>
        )}
      </div>
      
      <div className="space-y-1">
        <div>
          <span className="text-gray-300">Used:</span>
          <span className={`ml-2 font-bold ${
            memoryMB > threshold ? 'text-red-400' : 
            memoryMB > threshold * 0.8 ? 'text-yellow-400' : 'text-green-400'
          }`}>
            {memoryMB.toFixed(1)} MB
          </span>
        </div>

        <div>
          <span className="text-gray-300">Limit:</span>
          <span className="ml-2 text-blue-400">
            {(currentMemory.jsHeapSizeLimit / (1024 * 1024)).toFixed(0)} MB
          </span>
        </div>

        <div>
          <span className="text-gray-300">Growth:</span>
          <span className={`ml-2 ${
            growthRate > 50 ? 'text-red-400' : 
            growthRate > 20 ? 'text-yellow-400' : 'text-green-400'
          }`}>
            {growthRate.toFixed(1)}%
          </span>
        </div>

        <div>
          <span className="text-gray-300">Samples:</span>
          <span className="ml-2 text-cyan-400">{memoryHistory.length}</span>
        </div>

        {isLeakDetected && (
          <div className="mt-2 p-2 bg-red-800/50 rounded border-red-600 border">
            <div className="text-red-200 font-bold text-xs">⚠️ Memory Leak Detected!</div>
            <div className="text-red-300 text-xs mt-1">
              Consistent memory growth detected
            </div>
          </div>
        )}

        {isOverThreshold && (
          <div className="mt-2 p-2 bg-yellow-800/50 rounded border-yellow-600 border">
            <div className="text-yellow-200 font-bold text-xs">📈 High Memory Usage</div>
            <div className="text-yellow-300 text-xs mt-1">
              Over {threshold}MB threshold
            </div>
          </div>
        )}
      </div>

      {/* メモリ使用量のミニグラフ */}
      <div className="mt-3">
        <div className="text-gray-400 text-xs mb-1">Usage History:</div>
        <div className="h-8 flex items-end space-x-px">
          {memoryHistory.slice(-20).map((stat, index) => {
            const height = Math.min((stat.usedJSHeapSize / currentMemory.jsHeapSizeLimit) * 100, 100)
            return (
              <div
                key={`${stat.timestamp}-${index}`}
                className={`w-1 ${
                  height > 80 ? 'bg-red-400' : 
                  height > 60 ? 'bg-yellow-400' : 'bg-green-400'
                }`}
                style={{ height: `${Math.max(height, 2)}%` }}
                title={`${(stat.usedJSHeapSize / (1024 * 1024)).toFixed(1)}MB`}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
})

export default MemoryLeakDetector 