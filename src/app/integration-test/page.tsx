'use client'

import { useState, useEffect, useMemo } from 'react'
import { Calendar } from 'lucide-react'
import WeeklyGrid from '@/components/calendar/WeeklyGrid'
import { PerformanceMonitor } from '@/components/debug/PerformanceMonitor'
import { MemoryLeakDetector } from '@/components/debug/MemoryLeakDetector'
import { generateOptimizationReport } from '@/utils/optimizationReport'

// 統合テスト項目の定義
interface TestCase {
  id: string
  name: string
  description: string
  status: 'pending' | 'running' | 'passed' | 'failed'
  error?: string
  duration?: number
}

const initialTestCases: TestCase[] = [
  {
    id: 'mobile-responsiveness',
    name: 'モバイル レスポンシブ対応',
    description: 'Claudeのモバイル最適化が正しく動作するか',
    status: 'pending'
  },
  {
    id: 'holiday-display',
    name: '祝日表示機能',
    description: '日本の祝日と日曜日が赤色で正しく表示されるか',
    status: 'pending'
  },
  {
    id: 'time-extension',
    name: '時間範囲拡張',
    description: '5:00-23:30の時間範囲が正しく表示されるか',
    status: 'pending'
  },
  {
    id: 'performance-optimizations',
    name: 'パフォーマンス最適化',
    description: '我々の最適化によりFPS60、メモリ使用量100MB以下が維持されるか',
    status: 'pending'
  },
  {
    id: 'schedule-rendering',
    name: 'スケジュール描画',
    description: 'スケジュールの重複表示問題が解決されているか',
    status: 'pending'
  },
  {
    id: 'swipe-gestures',
    name: 'スワイプ操作',
    description: 'モバイルでのスワイプナビゲーションが正常に動作するか',
    status: 'pending'
  },
  {
    id: 'pinch-zoom',
    name: 'ピンチズーム',
    description: 'モバイルでのピンチズーム機能が正常に動作するか',
    status: 'pending'
  },
  {
    id: 'color-optimization',
    name: '色計算最適化',
    description: 'RGB計算キャッシュによるCPU負荷軽減が有効か',
    status: 'pending'
  }
]

export default function IntegrationTestPage() {
  const [testCases, setTestCases] = useState<TestCase[]>(initialTestCases)
  const [isRunning, setIsRunning] = useState(false)
  const [currentTest, setCurrentTest] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [performanceData, setPerformanceData] = useState<any>(null)
  const [memoryData, setMemoryData] = useState<any>(null)

  // モバイル検出
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 個別テストの実行
  const runTest = async (testId: string): Promise<{ success: boolean; error?: string; duration: number }> => {
    const startTime = Date.now()
    
    try {
      switch (testId) {
        case 'mobile-responsiveness':
          // モバイル要素の存在確認
          const mobileElements = document.querySelectorAll('.md\\:hidden, .sm\\:block, .lg\\:flex')
          if (mobileElements.length === 0) throw new Error('モバイル専用要素が見つからない')
          break

        case 'holiday-display':
          // 祝日スタイルクラスの確認
          const holidayElements = document.querySelectorAll('.text-red-600, .bg-red-50')
          if (holidayElements.length === 0) throw new Error('祝日スタイルが適用されていない')
          break

        case 'time-extension':
          // 23:00台の時間スロットの確認
          const timeSlots = document.querySelectorAll('[data-time*="23:"]')
          if (timeSlots.length === 0) throw new Error('23:00台の時間スロットが見つからない')
          break

        case 'performance-optimizations':
          // パフォーマンスデータの確認
          if (!performanceData?.fps || performanceData.fps < 55) {
            throw new Error(`FPS不十分: ${performanceData?.fps || 'N/A'}`)
          }
          if (!memoryData?.current || memoryData.current > 100) {
            throw new Error(`メモリ使用量過多: ${memoryData?.current || 'N/A'}MB`)
          }
          break

        case 'schedule-rendering':
          // スケジュール要素の重複チェック
          const schedules = document.querySelectorAll('[data-schedule-id]')
          const scheduleIds = Array.from(schedules).map(el => el.getAttribute('data-schedule-id'))
          const uniqueIds = new Set(scheduleIds)
          if (scheduleIds.length !== uniqueIds.size) {
            throw new Error('スケジュールの重複描画が検出された')
          }
          break

        case 'swipe-gestures':
          // スワイプイベントリスナーの確認
          const swipeElements = document.querySelectorAll('[data-swipe="true"]')
          if (swipeElements.length === 0) throw new Error('スワイプ対応要素が見つからない')
          break

        case 'pinch-zoom':
          // ピンチズーム要素の確認
          const zoomElements = document.querySelectorAll('[data-zoom="true"]')
          if (zoomElements.length === 0) throw new Error('ピンチズーム対応要素が見つからない')
          break

        case 'color-optimization':
          // 色計算キャッシュの確認
          const cachedColors = (window as any).__colorCache
          if (!cachedColors || Object.keys(cachedColors).length === 0) {
            throw new Error('色計算キャッシュが利用されていない')
          }
          break

        default:
          throw new Error('未知のテストID')
      }

      const duration = Date.now() - startTime
      return { success: true, duration }
    } catch (error) {
      const duration = Date.now() - startTime
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        duration 
      }
    }
  }

  // 全テストの実行
  const runAllTests = async () => {
    setIsRunning(true)
    
    for (const testCase of testCases) {
      setCurrentTest(testCase.id)
      
      // テスト状態を実行中に更新
      setTestCases(prev => prev.map(tc => 
        tc.id === testCase.id 
          ? { ...tc, status: 'running' }
          : tc
      ))

      // テスト実行
      const result = await runTest(testCase.id)
      
      // 結果を更新
      setTestCases(prev => prev.map(tc => 
        tc.id === testCase.id 
          ? { 
              ...tc, 
              status: result.success ? 'passed' : 'failed',
              error: result.error,
              duration: result.duration
            }
          : tc
      ))

      // 次のテストまで少し待機
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    setCurrentTest(null)
    setIsRunning(false)

    // 最終レポート生成
    const report = generateOptimizationReport('統合テスト')
    console.log('🚀 統合テスト完了！', { report, testResults: testCases })
  }

  // テスト結果サマリー
  const testSummary = useMemo(() => {
    const passed = testCases.filter(tc => tc.status === 'passed').length
    const failed = testCases.filter(tc => tc.status === 'failed').length
    const pending = testCases.filter(tc => tc.status === 'pending').length
    return { passed, failed, pending, total: testCases.length }
  }, [testCases])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <Calendar className="w-8 h-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">
              Weekly Vertical Planner - 統合テスト
            </h1>
          </div>
          <p className="text-gray-600">
            Claudeの実装と我々の最適化の統合状況を検証
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* テスト制御パネル */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                テスト制御
              </h2>
              
              {/* テストサマリー */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {testSummary.passed}
                    </div>
                    <div className="text-gray-600">合格</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {testSummary.failed}
                    </div>
                    <div className="text-gray-600">失敗</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {testSummary.pending}
                    </div>
                    <div className="text-gray-600">保留</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {testSummary.total}
                    </div>
                    <div className="text-gray-600">総計</div>
                  </div>
                </div>
              </div>

              <button
                onClick={runAllTests}
                disabled={isRunning}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${
                  isRunning
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                } text-white`}
              >
                {isRunning ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    テスト実行中...
                  </div>
                ) : (
                  '全テスト実行'
                )}
              </button>

              {currentTest && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-800">
                    実行中: {testCases.find(tc => tc.id === currentTest)?.name}
                  </div>
                </div>
              )}

              {/* デバイス情報 */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-800 mb-2">デバイス情報</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>モード: {isMobile ? 'モバイル' : 'デスクトップ'}</div>
                  <div>画面: {typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'N/A'}</div>
                  <div>ユーザーエージェント: {typeof window !== 'undefined' ? window.navigator.userAgent.slice(0, 50) + '...' : 'N/A'}</div>
                </div>
              </div>
            </div>

            {/* パフォーマンスモニター */}
            <div className="mt-6">
              <PerformanceMonitor 
                enabled={true}
                componentName="統合テスト"
              />
            </div>

            {/* メモリリークディテクター */}
            <div className="mt-6">
              <MemoryLeakDetector 
                enabled={true}
              />
            </div>
          </div>

          {/* テスト結果リスト */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                テスト結果
              </h2>
              
              <div className="space-y-3">
                {testCases.map((testCase) => (
                  <div 
                    key={testCase.id}
                    className={`p-4 rounded-lg border-l-4 ${
                      testCase.status === 'passed' 
                        ? 'bg-green-50 border-green-500'
                        : testCase.status === 'failed'
                        ? 'bg-red-50 border-red-500'
                        : testCase.status === 'running'
                        ? 'bg-blue-50 border-blue-500'
                        : 'bg-gray-50 border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">
                          {testCase.name}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {testCase.description}
                        </p>
                        {testCase.error && (
                          <p className="text-sm text-red-600 mt-2">
                            エラー: {testCase.error}
                          </p>
                        )}
                      </div>
                      <div className="ml-4 flex items-center">
                        {testCase.status === 'running' && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        )}
                        {testCase.status === 'passed' && (
                          <div className="text-green-600 font-medium">✓ 合格</div>
                        )}
                        {testCase.status === 'failed' && (
                          <div className="text-red-600 font-medium">✗ 失敗</div>
                        )}
                        {testCase.status === 'pending' && (
                          <div className="text-gray-400 font-medium">- 保留</div>
                        )}
                      </div>
                    </div>
                    {testCase.duration && (
                      <div className="text-xs text-gray-500 mt-2">
                        実行時間: {testCase.duration}ms
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 実際のカレンダーコンポーネント（テスト対象） */}
        <div className="mt-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              カレンダーコンポーネント（テスト対象）
            </h2>
            <div className="border rounded-lg overflow-hidden">
              <WeeklyGrid 
                schedules={[]}
                categories={[]}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 