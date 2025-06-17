'use client'

interface OptimizationMetrics {
  renderCount: number
  averageRenderTime: number
  memoryUsage: number
  scheduleCount: number
  lastMeasurement: number
}

interface OptimizationReport {
  before: OptimizationMetrics
  after: OptimizationMetrics
  improvements: {
    renderTimeImprovement: number // %
    memoryReduction: number // %
    renderCountReduction: number // %
  }
  recommendations: string[]
  score: number // 0-100
}

// 最適化前後の計測データを保存
const optimizationHistory = new Map<string, OptimizationMetrics[]>()

/**
 * パフォーマンス計測を開始
 */
export function startPerformanceMeasurement(componentId: string): void {
  const metrics: OptimizationMetrics = {
    renderCount: 0,
    averageRenderTime: 0,
    memoryUsage: getMemoryUsage(),
    scheduleCount: 0,
    lastMeasurement: Date.now()
  }

  if (!optimizationHistory.has(componentId)) {
    optimizationHistory.set(componentId, [])
  }
  
  optimizationHistory.get(componentId)!.push(metrics)
}

/**
 * レンダリング情報を記録
 */
export function recordRender(componentId: string, renderTime: number): void {
  const history = optimizationHistory.get(componentId)
  if (!history || history.length === 0) return

  const latest = history[history.length - 1]
  latest.renderCount++
  
  // 移動平均でレンダリング時間を更新
  const alpha = 0.2 // 平滑化係数
  latest.averageRenderTime = latest.averageRenderTime === 0 
    ? renderTime 
    : latest.averageRenderTime * (1 - alpha) + renderTime * alpha
}

/**
 * スケジュール数を更新
 */
export function updateScheduleCount(componentId: string, count: number): void {
  const history = optimizationHistory.get(componentId)
  if (!history || history.length === 0) return

  const latest = history[history.length - 1]
  latest.scheduleCount = count
}

/**
 * メモリ使用量を取得
 */
function getMemoryUsage(): number {
  if (!('memory' in performance)) return 0
  const memory = (performance as any).memory
  return memory.usedJSHeapSize / (1024 * 1024) // MB
}

/**
 * 最適化レポートを生成
 */
export function generateOptimizationReport(componentId: string): OptimizationReport | null {
  const history = optimizationHistory.get(componentId)
  if (!history || history.length < 2) return null

  const before = history[0]
  const after = history[history.length - 1]

  // 改善率を計算
  const renderTimeImprovement = before.averageRenderTime > 0 
    ? ((before.averageRenderTime - after.averageRenderTime) / before.averageRenderTime) * 100
    : 0

  const memoryReduction = before.memoryUsage > 0
    ? ((before.memoryUsage - after.memoryUsage) / before.memoryUsage) * 100
    : 0

  const renderCountReduction = before.renderCount > 0
    ? ((before.renderCount - after.renderCount) / before.renderCount) * 100
    : 0

  // 推奨事項を生成
  const recommendations: string[] = []
  
  if (after.averageRenderTime > 16) {
    recommendations.push('レンダリング時間が16msを超えています。React.memo()の追加を検討してください。')
  }
  
  if (after.memoryUsage > 100) {
    recommendations.push('メモリ使用量が100MBを超えています。不要なオブジェクトの削除を検討してください。')
  }

  if (renderTimeImprovement < 0) {
    recommendations.push('レンダリング性能が悪化しています。最適化の見直しが必要です。')
  }

  if (after.renderCount > before.renderCount * 1.5) {
    recommendations.push('レンダリング回数が増加しています。useMemo/useCallbackの活用を検討してください。')
  }

  // スコア計算（0-100）
  let score = 100
  if (after.averageRenderTime > 16) score -= 20
  if (after.memoryUsage > 100) score -= 15
  if (renderTimeImprovement < 0) score -= 25
  if (memoryReduction < 0) score -= 20
  if (renderCountReduction < 0) score -= 20

  score = Math.max(0, score)

  return {
    before,
    after,
    improvements: {
      renderTimeImprovement,
      memoryReduction,
      renderCountReduction
    },
    recommendations,
    score
  }
}

/**
 * レポートをコンソールに出力
 */
export function logOptimizationReport(componentId: string): void {
  const report = generateOptimizationReport(componentId)
  if (!report) {
    console.log(`[Optimization] No data available for ${componentId}`)
    return
  }

  console.group(`🚀 Optimization Report: ${componentId}`)
  console.log(`📊 Score: ${report.score}/100`)
  console.log(`⏱️  Render Time: ${report.before.averageRenderTime.toFixed(2)}ms → ${report.after.averageRenderTime.toFixed(2)}ms (${report.improvements.renderTimeImprovement.toFixed(1)}% improvement)`)
  console.log(`🧠 Memory: ${report.before.memoryUsage.toFixed(1)}MB → ${report.after.memoryUsage.toFixed(1)}MB (${report.improvements.memoryReduction.toFixed(1)}% reduction)`)
  console.log(`🔄 Renders: ${report.before.renderCount} → ${report.after.renderCount} (${report.improvements.renderCountReduction.toFixed(1)}% reduction)`)
  
  if (report.recommendations.length > 0) {
    console.log('💡 Recommendations:')
    report.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`)
    })
  }
  console.groupEnd()
}

/**
 * 全コンポーネントのサマリーレポート
 */
export function generateSummaryReport(): { [componentId: string]: OptimizationReport } {
  const summary: { [componentId: string]: OptimizationReport } = {}
  
  Array.from(optimizationHistory.keys()).forEach(componentId => {
    const report = generateOptimizationReport(componentId)
    if (report) {
      summary[componentId] = report
    }
  })
  
  return summary
}

/**
 * 履歴データをクリア
 */
export function clearOptimizationHistory(componentId?: string): void {
  if (componentId) {
    optimizationHistory.delete(componentId)
  } else {
    optimizationHistory.clear()
  }
}

/**
 * 履歴データをエクスポート
 */
export function exportOptimizationData(): string {
  const data = Object.fromEntries(optimizationHistory)
  return JSON.stringify(data, null, 2)
} 