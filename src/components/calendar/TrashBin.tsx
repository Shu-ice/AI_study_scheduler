'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Schedule } from '@/types'

interface DeletedSchedule extends Schedule {
  deletedAt: Date
  deleteReason?: string
  autoDeleteAt: Date
}

interface TrashBinProps {
  isOpen: boolean
  onClose: () => void
  onRestore: (scheduleIds: string[]) => void
  onPermanentDelete: (scheduleIds: string[]) => void
}

export default function TrashBin({
  isOpen,
  onClose,
  onRestore,
  onPermanentDelete
}: TrashBinProps) {
  const [deletedSchedules, setDeletedSchedules] = useState<DeletedSchedule[]>([])
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'deletedAt' | 'title' | 'autoDeleteAt'>('deletedAt')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [showConfirmPermanentDelete, setShowConfirmPermanentDelete] = useState(false)

  // ダミーデータ（実際の実装では API から取得）
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      // TODO: API から削除済みスケジュールを取得
      setTimeout(() => {
        setDeletedSchedules([
          // ここにサンプルデータを追加
        ])
        setIsLoading(false)
      }, 500)
    }
  }, [isOpen])

  const handleSelectAll = () => {
    if (selectedItems.length === deletedSchedules.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(deletedSchedules.map(s => s.id))
    }
  }

  const handleSelectItem = (scheduleId: string) => {
    setSelectedItems(prev => 
      prev.includes(scheduleId)
        ? prev.filter(id => id !== scheduleId)
        : [...prev, scheduleId]
    )
  }

  const handleRestore = () => {
    if (selectedItems.length === 0) return
    onRestore(selectedItems)
    setSelectedItems([])
  }

  const handlePermanentDelete = () => {
    if (selectedItems.length === 0) return
    setShowConfirmPermanentDelete(true)
  }

  const confirmPermanentDelete = () => {
    onPermanentDelete(selectedItems)
    setSelectedItems([])
    setShowConfirmPermanentDelete(false)
  }

  const getDaysUntilAutoDelete = (autoDeleteAt: Date) => {
    const days = Math.ceil((autoDeleteAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, days)
  }

  const sortedSchedules = [...deletedSchedules].sort((a, b) => {
    switch (sortBy) {
      case 'deletedAt':
        return b.deletedAt.getTime() - a.deletedAt.getTime()
      case 'title':
        return a.title.localeCompare(b.title)
      case 'autoDeleteAt':
        return a.autoDeleteAt.getTime() - b.autoDeleteAt.getTime()
      default:
        return 0
    }
  })

  const filteredSchedules = sortedSchedules.filter(schedule => 
    filterCategory === 'all' || schedule.category.id === filterCategory
  )

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="trash-bin-title"
    >
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* 背景オーバーレイ */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* モーダルコンテンツ */}
        <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full border">
          {/* ヘッダー */}
          <div className="bg-gray-50 px-6 pt-6 pb-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h3 id="trash-bin-title" className="text-lg font-semibold text-gray-900">
                    ごみ箱
                  </h3>
                  <p className="text-sm text-gray-500">
                    削除済みのスケジュール - 30日後に自動削除されます
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100"
                aria-label="ごみ箱を閉じる"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* コントロール */}
            <div className="mt-4 flex flex-wrap items-center gap-4">
              {/* 並び替え */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="deletedAt">削除日時順</option>
                <option value="title">タイトル順</option>
                <option value="autoDeleteAt">自動削除日順</option>
              </select>

              {/* カテゴリフィルター */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">すべてのカテゴリ</option>
                {/* カテゴリオプションは実際のデータから生成 */}
              </select>

              {/* 選択済みアクション */}
              {selectedItems.length > 0 && (
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-sm text-gray-600">
                    {selectedItems.length}件選択中
                  </span>
                  <button
                    onClick={handleRestore}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                  >
                    復元
                  </button>
                  <button
                    onClick={handlePermanentDelete}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                  >
                    完全削除
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* コンテンツ */}
          <div className="px-6 py-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                <span className="ml-2 text-gray-600">読み込み中...</span>
              </div>
            ) : filteredSchedules.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <h4 className="text-lg font-medium text-gray-900 mb-2">ごみ箱は空です</h4>
                <p className="text-gray-500">削除されたスケジュールはここに表示されます</p>
              </div>
            ) : (
              <div className="space-y-1">
                {/* ヘッダー行 */}
                <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={selectedItems.length === filteredSchedules.length}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="flex-1">タイトル</div>
                  <div className="w-24">削除日</div>
                  <div className="w-24">自動削除まで</div>
                  <div className="w-20">アクション</div>
                </div>

                {/* スケジュールリスト */}
                <div className="max-h-96 overflow-y-auto">
                  {filteredSchedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className={`flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-50 transition-colors ${
                        selectedItems.includes(schedule.id) ? 'bg-blue-50 border border-blue-200' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(schedule.id)}
                        onChange={() => handleSelectItem(schedule.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span 
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: schedule.category.color }}
                          />
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {schedule.title}
                          </h4>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                          <span>{format(schedule.date, 'M/d', { locale: ja })} {schedule.startTime}-{schedule.endTime}</span>
                          <span>{schedule.category.name}</span>
                          {schedule.deleteReason && (
                            <span title={schedule.deleteReason}>理由: {schedule.deleteReason.substring(0, 20)}...</span>
                          )}
                        </div>
                      </div>

                      <div className="w-24 text-xs text-gray-500">
                        {format(schedule.deletedAt, 'M/d HH:mm', { locale: ja })}
                      </div>

                      <div className="w-24 text-xs">
                        {(() => {
                          const days = getDaysUntilAutoDelete(schedule.autoDeleteAt)
                          return (
                            <span className={`px-2 py-1 rounded-full ${
                              days <= 3 ? 'bg-red-100 text-red-700' :
                              days <= 7 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {days}日後
                            </span>
                          )
                        })()}
                      </div>

                      <div className="w-20 flex gap-1">
                        <button
                          onClick={() => handleSelectItem(schedule.id)}
                          className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                          title="復元"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleSelectItem(schedule.id)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                          title="完全削除"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* フッター */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>合計 {filteredSchedules.length} 件の削除済みスケジュール</span>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 完全削除確認ダイアログ */}
      {showConfirmPermanentDelete && (
        <div className="fixed inset-0 z-60 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowConfirmPermanentDelete(false)}
            />
            <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border">
              <div className="bg-white px-6 pt-6 pb-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 15c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">完全削除の確認</h3>
                    <p className="text-sm text-red-600">この操作は取り消せません</p>
                  </div>
                </div>
                <p className="text-gray-700 mb-6">
                  選択した{selectedItems.length}件のスケジュールを完全に削除しますか？
                  この操作を実行すると、これらのスケジュールは二度と復元できません。
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowConfirmPermanentDelete(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={confirmPermanentDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    完全削除
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 