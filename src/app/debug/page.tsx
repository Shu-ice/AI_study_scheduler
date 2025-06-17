'use client'

import { useState, useEffect } from 'react'
import WeeklyGrid from '@/components/calendar/WeeklyGrid'
import PerformanceMonitor from '@/components/debug/PerformanceMonitor'
import MemoryLeakDetector from '@/components/debug/MemoryLeakDetector'
import { getColorCacheStats, precomputeColors, clearColorCache } from '@/utils/colorOptimization'
import { Schedule, ScheduleCategory } from '@/types'

// デバッグ用のダミーデータ生成
function generateTestSchedules(count: number): Schedule[] {
  const schedules: Schedule[] = []
  const categories = ['仕事', '会議', '個人', '運動', '学習']
  const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6']

  for (let i = 0; i < count; i++) {
    const startHour = Math.floor(Math.random() * 15) + 5 // 5-19時
    const startMinute = Math.random() > 0.5 ? 0 : 30
    const duration = Math.floor(Math.random() * 4) + 1 // 1-4時間
    const endHour = startHour + Math.floor(duration)
    const endMinute = startHour + duration > endHour ? 30 : startMinute

    const categoryIndex = Math.floor(Math.random() * categories.length)
    
    schedules.push({
      id: `schedule-${i}`,
      userId: 'debug-user',
      title: `テストスケジュール ${i + 1}`,
      description: `説明 ${i + 1}`,
      startTime: `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`,
      endTime: `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`,
      date: new Date(),
      color: colors[categoryIndex],
      category: {
        id: `cat-${categoryIndex}`,
        userId: 'debug-user',
        name: categories[categoryIndex],
        color: colors[categoryIndex]
      },
      isFixed: false,
      createdAt: new Date(),
      updatedAt: new Date()
    })
  }

  return schedules
}

function generateTestCategories(): ScheduleCategory[] {
  return [
    { id: 'work', userId: 'debug-user', name: '仕事', color: '#3B82F6' },
    { id: 'meeting', userId: 'debug-user', name: '会議', color: '#EF4444' },
    { id: 'personal', userId: 'debug-user', name: '個人', color: '#10B981' },
    { id: 'exercise', userId: 'debug-user', name: '運動', color: '#F59E0B' },
    { id: 'study', userId: 'debug-user', name: '学習', color: '#8B5CF6' }
  ]
}

export default function DebugPage() {
  const [scheduleCount, setScheduleCount] = useState(50)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [categories, setCategories] = useState<ScheduleCategory[]>([])
  const [performanceEnabled, setPerformanceEnabled] = useState(true)
  const [memoryMonitorEnabled, setMemoryMonitorEnabled] = useState(true)
  const [colorCacheStats, setColorCacheStats] = useState<any>(null)
  const [renderCount, setRenderCount] = useState(0)

  // データ初期化
  useEffect(() => {
    const testCategories = generateTestCategories()
    const testSchedules = generateTestSchedules(scheduleCount)
    
    setCategories(testCategories)
    setSchedules(testSchedules)
    
    // 色の事前計算
    precomputeColors(testCategories)
    setColorCacheStats(getColorCacheStats())
  }, [scheduleCount])

  // レンダー回数カウント
  useEffect(() => {
    setRenderCount(prev => prev + 1)
  }, [])

  const handleScheduleCountChange = (count: number) => {
    setScheduleCount(count)
  }

  const handleClearColorCache = () => {
    clearColorCache()
    setColorCacheStats(getColorCacheStats())
  }

  const forceRerender = () => {
    setSchedules([...schedules])
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* パフォーマンス監視 */}
      {performanceEnabled && (
        <PerformanceMonitor
          enabled={true}
          componentName="WeeklyGrid Debug"
        />
      )}

      {/* メモリリーク検出 */}
      {memoryMonitorEnabled && (
        <MemoryLeakDetector
          enabled={true}
          threshold={80}
          sampleInterval={2000}
        />
      )}

      {/* デバッグコントロール */}
      <div className="fixed top-4 left-4 bg-white p-4 rounded-lg shadow-lg z-40 max-w-sm">
        <h2 className="text-lg font-bold mb-4 text-gray-900">🔧 デバッグコントロール</h2>
        
        <div className="space-y-4">
          {/* スケジュール数調整 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              スケジュール数: {scheduleCount}
            </label>
            <input
              type="range"
              min="10"
              max="500"
              step="10"
              value={scheduleCount}
              onChange={(e) => handleScheduleCountChange(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>10</span>
              <span>500</span>
            </div>
          </div>

          {/* パフォーマンス監視切替 */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="performance"
              checked={performanceEnabled}
              onChange={(e) => setPerformanceEnabled(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="performance" className="text-sm text-gray-700">
              パフォーマンス監視
            </label>
          </div>

          {/* メモリ監視切替 */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="memory"
              checked={memoryMonitorEnabled}
              onChange={(e) => setMemoryMonitorEnabled(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="memory" className="text-sm text-gray-700">
              メモリ監視
            </label>
          </div>

          {/* 統計情報 */}
          <div className="text-sm text-gray-600 space-y-1">
            <div>レンダー回数: {renderCount}</div>
            <div>現在のスケジュール数: {schedules.length}</div>
            {colorCacheStats && (
              <>
                <div>色キャッシュサイズ: {colorCacheStats.size}</div>
                <div>メモリ使用量: {colorCacheStats.memoryEstimate}KB</div>
              </>
            )}
          </div>

          {/* アクション */}
          <div className="space-y-2">
            <button
              onClick={forceRerender}
              className="w-full px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              強制再レンダー
            </button>
            <button
              onClick={handleClearColorCache}
              className="w-full px-3 py-2 bg-red-500 text-white rounded text-sm hover:bg-red-600"
            >
              色キャッシュクリア
            </button>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="ml-64 mr-64">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          📊 カレンダーパフォーマンステスト
        </h1>
        
        <div className="bg-white rounded-lg shadow-sm">
          <WeeklyGrid
            schedules={schedules}
            categories={categories}
            onScheduleClick={(schedule) => console.log('Schedule clicked:', schedule)}
            onTimeSlotClick={(date, time) => console.log('Time slot clicked:', date, time)}
            onDayClick={(date) => console.log('Day clicked:', date)}
            onScheduleUpdate={() => console.log('Schedule update triggered')}
          />
        </div>
      </div>

      {/* フッター統計 */}
      <div className="fixed bottom-4 left-4 bg-black/80 text-white text-xs p-3 rounded-lg font-mono">
        <div className="text-green-400 font-bold mb-1">System Stats</div>
        <div>DOM Elements: {document.querySelectorAll('*').length}</div>
        <div>Date: {new Date().toLocaleTimeString()}</div>
      </div>
    </div>
  )
} 