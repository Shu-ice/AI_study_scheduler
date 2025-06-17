'use client'

import { useState, useCallback } from 'react'
import { Schedule, ScheduleCategory } from '@/types'
import DeleteConfirmDialog from './DeleteConfirmDialog'

interface ScheduleBulkActionsProps {
  selectedSchedules: Schedule[]
  onDeselectAll: () => void
  onDelete: (scheduleIds: string[], options: any) => void
  onMove: (scheduleIds: string[], targetDate: Date) => void
  onCategoryChange: (scheduleIds: string[], categoryId: string) => void
  categories: ScheduleCategory[]
  isVisible: boolean
}

type BulkAction = 'delete' | 'move' | 'category' | 'export' | null

export default function ScheduleBulkActions({
  selectedSchedules,
  onDeselectAll,
  onDelete,
  onMove,
  onCategoryChange,
  categories,
  isVisible
}: ScheduleBulkActionsProps) {
  const [activeAction, setActiveAction] = useState<BulkAction>(null)
  const [targetDate, setTargetDate] = useState('')
  const [targetCategoryId, setTargetCategoryId] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleDeleteConfirm = async (options: any) => {
    setIsProcessing(true)
    try {
      await onDelete(selectedSchedules.map(s => s.id), options)
      onDeselectAll()
      setActiveAction(null)
    } catch (error) {
      console.error('一括削除エラー:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleMove = async () => {
    if (!targetDate) return
    
    setIsProcessing(true)
    try {
      await onMove(selectedSchedules.map(s => s.id), new Date(targetDate))
      onDeselectAll()
      setActiveAction(null)
      setTargetDate('')
    } catch (error) {
      console.error('一括移動エラー:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCategoryChange = async () => {
    if (!targetCategoryId) return
    
    setIsProcessing(true)
    try {
      await onCategoryChange(selectedSchedules.map(s => s.id), targetCategoryId)
      onDeselectAll()
      setActiveAction(null)
      setTargetCategoryId('')
    } catch (error) {
      console.error('一括カテゴリ変更エラー:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleExport = useCallback(() => {
    const csvContent = [
      ['タイトル', '開始時間', '終了時間', '日付', 'カテゴリ', '説明'],
      ...selectedSchedules.map(schedule => [
        schedule.title,
        schedule.startTime,
        schedule.endTime,
        schedule.date.toISOString().split('T')[0],
        schedule.category.name,
        schedule.description || ''
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `schedules_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    
    onDeselectAll()
  }, [selectedSchedules, onDeselectAll])

  const getTotalDuration = () => {
    return selectedSchedules.reduce((total, schedule) => {
      const start = new Date(`2000-01-01 ${schedule.startTime}`)
      const end = new Date(`2000-01-01 ${schedule.endTime}`)
      return total + (end.getTime() - start.getTime()) / (1000 * 60)
    }, 0)
  }

  if (!isVisible || selectedSchedules.length === 0) return null

  return (
    <>
      {/* 一括操作バー */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 min-w-96">
          {/* 選択情報 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  {selectedSchedules.length}件のスケジュールを選択中
                </h3>
                <p className="text-xs text-gray-500">
                  合計時間: {Math.round(getTotalDuration())}分
                </p>
              </div>
            </div>
            <button
              onClick={onDeselectAll}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100"
              title="選択を解除"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* アクション選択 */}
          {!activeAction && (
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => setActiveAction('delete')}
                className="flex flex-col items-center gap-1 p-3 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="text-xs font-medium">削除</span>
              </button>

              <button
                onClick={() => setActiveAction('move')}
                className="flex flex-col items-center gap-1 p-3 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-xs font-medium">移動</span>
              </button>

              <button
                onClick={() => setActiveAction('category')}
                className="flex flex-col items-center gap-1 p-3 rounded-lg border border-green-200 text-green-600 hover:bg-green-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span className="text-xs font-medium">カテゴリ</span>
              </button>

              <button
                onClick={handleExport}
                className="flex flex-col items-center gap-1 p-3 rounded-lg border border-purple-200 text-purple-600 hover:bg-purple-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-xs font-medium">エクスポート</span>
              </button>
            </div>
          )}

          {/* 日付移動 */}
          {activeAction === 'move' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveAction(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h4 className="text-sm font-medium text-gray-900">日付を移動</h4>
              </div>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleMove}
                  disabled={!targetDate || isProcessing}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isProcessing ? '移動中...' : '移動'}
                </button>
              </div>
            </div>
          )}

          {/* カテゴリ変更 */}
          {activeAction === 'category' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveAction(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h4 className="text-sm font-medium text-gray-900">カテゴリを変更</h4>
              </div>
              <div className="flex gap-2">
                <select
                  value={targetCategoryId}
                  onChange={(e) => setTargetCategoryId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">カテゴリを選択</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleCategoryChange}
                  disabled={!targetCategoryId || isProcessing}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isProcessing ? '変更中...' : '変更'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 削除確認ダイアログ */}
      <DeleteConfirmDialog
        isOpen={activeAction === 'delete'}
        onClose={() => setActiveAction(null)}
        onConfirm={handleDeleteConfirm}
        schedules={selectedSchedules}
        isDeleting={isProcessing}
      />
    </>
  )
} 