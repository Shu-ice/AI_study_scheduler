'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Area, AreaChart, Legend
} from 'recharts'
import { Calendar, Clock, Target, TrendingUp, Star, Award, Activity } from 'lucide-react'

interface StatisticsData {
  period: string
  dateRange: {
    start: Date
    end: Date
  }
  overview: {
    totalSchedules: number
    completedSchedules: number
    scheduleCompletionRate: number
    totalTasks: number
    completedTasks: number
    taskCompletionRate: number
  }
  timeEfficiency: {
    totalPlannedHours: number
    totalActualHours: number
    efficiency: number
    timeAccuracy: number
  }
  satisfaction: {
    averageRating: number
    totalRatings: number
    distribution: number[]
  }
  categories: Array<{
    id: string
    name: string
    color: string
    completionRate: number
    averageHours: number
    efficiency: number
    averageSatisfaction: number
  }>
  weeklyTrend: Array<{
    weekStart: Date
    weekEnd: Date
    totalSchedules: number
    completedSchedules: number
    averageSatisfaction: number
  }>
  productivity: {
    totalFocusHours: number
    averageSessionMinutes: number
    tasksPerHour: number
    productivityScore: number
  }
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

export default function StatisticsDashboard() {
  const [statistics, setStatistics] = useState<StatisticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('week')
  const [customDateRange, setCustomDateRange] = useState({
    start: '',
    end: ''
  })

  const fetchStatistics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      let url = `/api/statistics?period=${period}`
      
      if (period === 'custom' && customDateRange.start && customDateRange.end) {
        url += `&startDate=${customDateRange.start}&endDate=${customDateRange.end}`
      }

      const response = await fetch(url)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: 統計データの取得に失敗しました`)
      }
      
      const data = await response.json()
      setStatistics(data)
    } catch (error) {
      console.error('統計データ取得エラー:', error)
      const errorMessage = error instanceof Error ? error.message : '統計データの取得に失敗しました'
      setError(errorMessage)
      setStatistics(null)
    } finally {
      setLoading(false)
    }
  }, [period, customDateRange.start, customDateRange.end])

  useEffect(() => {
    fetchStatistics()
  }, [fetchStatistics])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">統計データを読み込み中...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-4">
          <svg className="mx-auto h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-lg font-medium">エラーが発生しました</p>
          <p className="text-sm text-gray-600 mt-1">{error}</p>
        </div>
        <button
          onClick={fetchStatistics}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          再試行
        </button>
      </div>
    )
  }

  if (!statistics) {
    return (
      <div className="text-center text-gray-500 py-8">
        <svg className="mx-auto h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p>統計データがありません</p>
        <p className="text-sm mt-1">データが蓄積されると統計情報が表示されます</p>
      </div>
    )
  }

  // 満足度分布用のデータ
  const satisfactionData = statistics.satisfaction.distribution.map((count, index) => ({
    rating: `${index + 1}★`,
    count,
    percentage: statistics.satisfaction.totalRatings > 0 
      ? Math.round((count / statistics.satisfaction.totalRatings) * 100) 
      : 0
  }))

  // 週次トレンドデータの整形
  const weeklyData = statistics.weeklyTrend.map((week, index) => ({
    week: `第${index + 1}週`,
    完了率: week.totalSchedules > 0 ? Math.round((week.completedSchedules / week.totalSchedules) * 100) : 0,
    満足度: Math.round(week.averageSatisfaction * 10) / 10,
    スケジュール数: week.totalSchedules,
    期間: `${new Date(week.weekStart).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })} - ${new Date(week.weekEnd).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}`
  }))

  // カテゴリ別パフォーマンスデータ
  const categoryData = statistics.categories.map(cat => ({
    name: cat.name.length > 8 ? `${cat.name.substring(0, 8)}...` : cat.name,
    fullName: cat.name,
    完了率: Math.round(cat.completionRate),
    効率性: Math.round(cat.efficiency),
    満足度: Math.round(cat.averageSatisfaction * 10) / 10,
    時間: Math.round(cat.averageHours * 10) / 10,
    color: cat.color
  }))

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">統計・分析ダッシュボード</h1>
          <p className="text-gray-600 mt-1">
            {new Date(statistics.dateRange.start).toLocaleDateString()} 〜 {new Date(statistics.dateRange.end).toLocaleDateString()}
          </p>
        </div>
        
        {/* 期間選択 */}
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          >
            <option value="week">過去1週間</option>
            <option value="month">過去1ヶ月</option>
            <option value="year">過去1年</option>
            <option value="custom">カスタム期間</option>
          </select>
          
          {period === 'custom' && (
            <div className="flex gap-2">
              <input
                type="date"
                value={customDateRange.start}
                onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="border rounded-md px-3 py-2 text-sm"
              />
              <input
                type="date"
                value={customDateRange.end}
                onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="border rounded-md px-3 py-2 text-sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* 概要メトリクス */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">スケジュール完了率</p>
              <p className="text-2xl font-bold text-blue-600">{statistics.overview.scheduleCompletionRate}%</p>
              <p className="text-xs text-gray-500">{statistics.overview.completedSchedules}/{statistics.overview.totalSchedules}</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">タスク完了率</p>
              <p className="text-2xl font-bold text-green-600">{statistics.overview.taskCompletionRate}%</p>
              <p className="text-xs text-gray-500">{statistics.overview.completedTasks}/{statistics.overview.totalTasks}</p>
            </div>
            <Target className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">時間効率性</p>
              <p className="text-2xl font-bold text-orange-600">{statistics.timeEfficiency.efficiency}%</p>
              <p className="text-xs text-gray-500">{statistics.timeEfficiency.totalActualHours}h / {statistics.timeEfficiency.totalPlannedHours}h</p>
            </div>
            <Clock className="h-8 w-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">生産性スコア</p>
              <p className="text-2xl font-bold text-purple-600">{statistics.productivity.productivityScore}</p>
              <p className="text-xs text-gray-500">/ 100点</p>
            </div>
            <Award className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* 詳細メトリクス */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">平均満足度</p>
              <div className="flex items-center gap-1">
                <p className="text-2xl font-bold text-yellow-600">{statistics.satisfaction.averageRating}</p>
                <Star className="h-5 w-5 text-yellow-400 fill-current" />
              </div>
              <p className="text-xs text-gray-500">{statistics.satisfaction.totalRatings}件の評価</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">時間精度</p>
              <p className="text-2xl font-bold text-indigo-600">{statistics.timeEfficiency.timeAccuracy}%</p>
              <p className="text-xs text-gray-500">予定時間との誤差</p>
            </div>
            <Activity className="h-8 w-8 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">集中時間</p>
              <p className="text-2xl font-bold text-teal-600">{statistics.productivity.totalFocusHours}h</p>
              <p className="text-xs text-gray-500">実際の作業時間</p>
            </div>
            <TrendingUp className="h-8 w-8 text-teal-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">平均セッション</p>
              <p className="text-2xl font-bold text-rose-600">{statistics.productivity.averageSessionMinutes}分</p>
              <p className="text-xs text-gray-500">1回あたりの作業時間</p>
            </div>
          </div>
        </div>
      </div>

      {/* チャートセクション */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 週次トレンド */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">週次トレンド</h3>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="week" 
                  fontSize={12}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  fontSize={12}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="完了率" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="満足度" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 満足度分布 */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">満足度分布</h3>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={satisfactionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="rating" 
                  fontSize={12}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  fontSize={12}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                  formatter={(value, name) => [
                    `${value}件 (${satisfactionData.find(d => d.count === value)?.percentage || 0}%)`,
                    '評価数'
                  ]}
                />
                <Bar 
                  dataKey="count" 
                  fill="#fbbf24"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* カテゴリ別パフォーマンス */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">カテゴリ別パフォーマンス</h3>
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                fontSize={12}
                tick={{ fontSize: 12 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                fontSize={12}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
              <Legend />
              <Bar dataKey="完了率" fill="#3b82f6" name="完了率 (%)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="効率性" fill="#10b981" name="効率性 (%)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="満足度" fill="#f59e0b" name="満足度" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* カテゴリ別詳細テーブル */}
      <div className="bg-white rounded-lg shadow border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">カテゴリ別詳細分析</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  カテゴリ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  完了率
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  平均時間
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  効率性
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  満足度
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {statistics.categories.map((category) => (
                <tr key={category.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-3"
                        style={{ backgroundColor: category.color }}
                      ></div>
                      <span className="text-sm font-medium text-gray-900">
                        {category.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${category.completionRate}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-900">{category.completionRate}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {category.averageHours}時間
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      category.efficiency >= 100 
                        ? 'bg-green-100 text-green-800'
                        : category.efficiency >= 80
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {category.efficiency}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.floor(category.averageSatisfaction)
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                      <span className="ml-2 text-sm text-gray-600">
                        {category.averageSatisfaction}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
} 