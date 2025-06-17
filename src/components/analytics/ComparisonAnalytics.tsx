'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  AnalyticsResponse, 
  AnalyticsFilter,
  TimeComparisonData,
  CategoryAnalyticsData 
} from '@/types'
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Target, 
  Calendar,
  Filter,
  RefreshCw,
  Info
} from 'lucide-react'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, subDays } from 'date-fns'

interface ComparisonAnalyticsProps {
  className?: string
}

export default function ComparisonAnalytics({ className = '' }: ComparisonAnalyticsProps) {
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<AnalyticsFilter>({
    period: 'week',
    includeWeekends: true
  })

  // 期間の計算
  const dateRange = useMemo(() => {
    const now = new Date()
    
    switch (filter.period) {
      case 'today':
        return { start: now, end: now }
      case 'week':
        return { 
          start: startOfWeek(now, { weekStartsOn: 1 }), 
          end: endOfWeek(now, { weekStartsOn: 1 }) 
        }
      case 'month':
        return { 
          start: startOfMonth(now), 
          end: endOfMonth(now) 
        }
      case 'custom':
        return { 
          start: filter.startDate || subDays(now, 7), 
          end: filter.endDate || now 
        }
      default:
        return { start: now, end: now }
    }
  }, [filter])

  // データ取得
  const fetchAnalytics = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        startDate: format(dateRange.start, 'yyyy-MM-dd'),
        endDate: format(dateRange.end, 'yyyy-MM-dd'),
        periodType: filter.period
      })

      if (filter.categories && filter.categories.length > 0) {
        params.append('includeCategories', filter.categories.join(','))
      }

      const response = await fetch(`/api/analytics?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '分析データの取得に失敗しました')
      }

      const analyticsData = await response.json()
      setData(analyticsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [filter.period, dateRange, fetchAnalytics])

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">分析データを読み込み中...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`p-6 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <div className="flex items-center text-red-700">
          <Info className="w-5 h-5 mr-2" />
          エラー: {error}
        </div>
        <button 
          onClick={fetchAnalytics}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          再試行
        </button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className={`p-6 text-center text-gray-500 ${className}`}>
        分析データがありません
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* ヘッダーとフィルター */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">計画・実績比較分析</h2>
          <p className="text-gray-600">
            {format(dateRange.start, 'yyyy/MM/dd')} - {format(dateRange.end, 'yyyy/MM/dd')}
          </p>
        </div>
        
        <div className="flex gap-2">
          <select
            value={filter.period}
            onChange={(e) => setFilter(prev => ({ 
              ...prev, 
              period: e.target.value as AnalyticsFilter['period'] 
            }))}
            className="px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="today">今日</option>
            <option value="week">今週</option>
            <option value="month">今月</option>
            <option value="custom">カスタム</option>
          </select>
          
          <button
            onClick={fetchAnalytics}
            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            更新
          </button>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="完了率"
          value={`${Math.round((data.summary.completedSchedules / data.summary.totalSchedules) * 100) || 0}%`}
          subtitle={`${data.summary.completedSchedules}/${data.summary.totalSchedules}件`}
          icon={Target}
          color="green"
        />
        <SummaryCard
          title="時間効率"
          value={`${Math.round(data.summary.efficiencyRate * 100)}%`}
          subtitle="実績/計画時間"
          icon={Clock}
          color="blue"
        />
        <SummaryCard
          title="平均満足度"
          value={data.summary.averageSatisfaction.toFixed(1)}
          subtitle="5段階評価"
          icon={TrendingUp}
          color="purple"
        />
        <SummaryCard
          title="総計画時間"
          value={`${data.summary.totalPlannedHours.toFixed(1)}h`}
          subtitle={`実績 ${data.summary.totalActualHours.toFixed(1)}h`}
          icon={BarChart3}
          color="orange"
        />
      </div>

      {/* 時間比較グラフ */}
      <TimeComparisonChart data={data.timeComparison} />

      {/* 効率性指標 */}
      <EfficiencyMetrics metrics={data.efficiencyMetrics} />

      {/* カテゴリ別分析 */}
      <CategoryBreakdown categories={data.categoryBreakdown} />

      {/* 満足度トレンド */}
      <SatisfactionTrend data={data.satisfactionTrend} />

      {/* インサイト */}
      <InsightsPanel insights={data.insights} />
    </div>
  )
}

// サマリーカードコンポーネント
function SummaryCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color 
}: {
  title: string
  value: string
  subtitle: string
  icon: any
  color: 'green' | 'blue' | 'purple' | 'orange'
}) {
  const colorClasses = {
    green: 'bg-green-50 text-green-700 border-green-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200'
  }

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs opacity-70">{subtitle}</p>
        </div>
        <Icon className="w-8 h-8 opacity-60" />
      </div>
    </div>
  )
}

// 時間比較グラフコンポーネント
function TimeComparisonChart({ data }: { data: TimeComparisonData[] }) {
  const maxMinutes = Math.max(...data.map(d => Math.max(d.plannedMinutes, d.actualMinutes)), 1)

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
        日別時間比較
      </h3>
      
      <div className="space-y-4">
        {data.map((item) => (
          <div key={item.date} className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium">{format(new Date(item.date), 'MM/dd (E)')}</span>
              <span className="text-gray-500">
                完了率 {item.completionRate}%
              </span>
            </div>
            
            <div className="space-y-1">
              {/* 計画時間バー */}
              <div className="flex items-center">
                <span className="w-12 text-xs text-gray-500">計画</span>
                <div className="flex-1 bg-gray-100 rounded-full h-3 relative">
                  <div 
                    className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${(item.plannedMinutes / maxMinutes) * 100}%` }}
                  />
                </div>
                <span className="w-16 text-xs text-right">
                  {Math.round(item.plannedMinutes / 60 * 10) / 10}h
                </span>
              </div>
              
              {/* 実績時間バー */}
              <div className="flex items-center">
                <span className="w-12 text-xs text-gray-500">実績</span>
                <div className="flex-1 bg-gray-100 rounded-full h-3 relative">
                  <div 
                    className={`h-3 rounded-full transition-all duration-300 ${
                      item.actualMinutes > item.plannedMinutes ? 'bg-red-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${(item.actualMinutes / maxMinutes) * 100}%` }}
                  />
                </div>
                <span className="w-16 text-xs text-right">
                  {Math.round(item.actualMinutes / 60 * 10) / 10}h
                </span>
              </div>
            </div>
            
            {item.difference !== 0 && (
              <div className="text-xs text-right">
                <span className={item.difference > 0 ? 'text-red-600' : 'text-green-600'}>
                  {item.difference > 0 ? '+' : ''}{Math.round(item.difference / 60 * 10) / 10}h
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// 効率性指標コンポーネント
function EfficiencyMetrics({ metrics }: { metrics: any }) {
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Target className="w-5 h-5 mr-2 text-green-500" />
        効率性指標
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{metrics.timeEfficiency}%</div>
          <div className="text-sm text-green-700">時間通り完了</div>
        </div>
        
        <div className="text-center p-4 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold text-red-600">{metrics.overrunPercentage}%</div>
          <div className="text-sm text-red-700">予定オーバー</div>
          {metrics.averageOverrun > 0 && (
            <div className="text-xs text-red-600">平均 +{metrics.averageOverrun}分</div>
          )}
        </div>
        
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{metrics.underrunPercentage}%</div>
          <div className="text-sm text-blue-700">予定より短縮</div>
          {metrics.averageUnderrun > 0 && (
            <div className="text-xs text-blue-600">平均 -{metrics.averageUnderrun}分</div>
          )}
        </div>
      </div>
      
      {(metrics.mostEfficientCategory || metrics.leastEfficientCategory) && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {metrics.mostEfficientCategory && (
              <div className="text-green-700">
                <span className="font-medium">最効率カテゴリ:</span> {metrics.mostEfficientCategory}
              </div>
            )}
            {metrics.leastEfficientCategory && (
              <div className="text-red-700">
                <span className="font-medium">改善対象カテゴリ:</span> {metrics.leastEfficientCategory}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// カテゴリ別分析コンポーネント
function CategoryBreakdown({ categories }: { categories: CategoryAnalyticsData[] }) {
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Filter className="w-5 h-5 mr-2 text-purple-500" />
        カテゴリ別分析
      </h3>
      
      <div className="space-y-4">
        {categories.map((category) => (
          <div key={category.categoryId} className="border-l-4 pl-4" style={{ borderColor: category.color }}>
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium">{category.categoryName}</h4>
                <p className="text-sm text-gray-600">
                  完了 {category.completedCount}/{category.totalCount}件
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">
                  効率率 {Math.round(category.efficiencyRate * 100)}%
                </div>
                <div className="text-xs text-gray-500">
                  満足度 {category.averageSatisfaction.toFixed(1)}
                </div>
              </div>
            </div>
            
            <div className="mt-2 grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-500">計画:</span> {Math.round(category.plannedMinutes / 60 * 10) / 10}h
              </div>
              <div>
                <span className="text-gray-500">実績:</span> {Math.round(category.actualMinutes / 60 * 10) / 10}h
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// 満足度トレンドコンポーネント
function SatisfactionTrend({ data }: { data: any[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">満足度トレンド</h3>
        <p className="text-gray-500 text-center">満足度データがありません</p>
      </div>
    )
  }

  const maxSatisfaction = 5
  const avgSatisfaction = data.reduce((sum, item) => sum + item.averageSatisfaction, 0) / data.length

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <TrendingUp className="w-5 h-5 mr-2 text-purple-500" />
        満足度トレンド
      </h3>
      
      <div className="mb-4">
        <div className="text-2xl font-bold text-purple-600">
          {avgSatisfaction.toFixed(1)} / 5.0
        </div>
        <div className="text-sm text-gray-600">期間平均満足度</div>
      </div>
      
      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.date} className="flex items-center space-x-3">
            <span className="w-16 text-xs text-gray-500">
              {format(new Date(item.date), 'MM/dd')}
            </span>
            <div className="flex-1 bg-gray-100 rounded-full h-2">
              <div 
                className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(item.averageSatisfaction / maxSatisfaction) * 100}%` }}
              />
            </div>
            <span className="w-8 text-xs text-gray-700">{item.averageSatisfaction.toFixed(1)}</span>
            <span className="w-8 text-xs text-gray-500">({item.scheduleCount})</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// インサイトパネルコンポーネント
function InsightsPanel({ insights }: { insights: string[] }) {
  if (insights.length === 0) {
    return null
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200">
      <h3 className="text-lg font-semibold mb-4 flex items-center text-blue-800">
        <Info className="w-5 h-5 mr-2" />
        分析インサイト
      </h3>
      
      <div className="space-y-3">
        {insights.map((insight, index) => (
          <div key={index} className="flex items-start space-x-3 p-3 bg-white/60 rounded-lg">
            <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
              {index + 1}
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{insight}</p>
          </div>
        ))}
      </div>
    </div>
  )
}