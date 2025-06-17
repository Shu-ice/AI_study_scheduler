'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Schedule } from '@/types'

interface DeleteConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (options: DeleteOptions) => void
  schedules: Schedule[]
  isDeleting?: boolean
}

interface DeleteOptions {
  scheduleIds: string[]
  deleteType: 'soft' | 'hard'
  reason?: string
  deleteRelated?: boolean
}

export default function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  schedules,
  isDeleting = false
}: DeleteConfirmDialogProps) {
  const [deleteType, setDeleteType] = useState<'soft' | 'hard'>('soft')
  const [reason, setReason] = useState('')
  const [deleteRelated, setDeleteRelated] = useState(false)
  const [confirmationText, setConfirmationText] = useState('')

  const isMultipleDelete = schedules.length > 1
  const requiredConfirmText = isMultipleDelete ? '複数削除' : '削除実行'
  const isConfirmationValid = confirmationText === requiredConfirmText

  const handleConfirm = () => {
    if (!isConfirmationValid || isDeleting) return

    onConfirm({
      scheduleIds: schedules.map(s => s.id),
      deleteType,
      reason: reason.trim() || undefined,
      deleteRelated
    })
  }

  const handleClose = () => {
    if (isDeleting) return
    setReason('')
    setConfirmationText('')
    setDeleteType('soft')
    setDeleteRelated(false)
    onClose()
  }

  const getTotalDuration = () => {
    return schedules.reduce((total, schedule) => {
      const start = new Date(`2000-01-01 ${schedule.startTime}`)
      const end = new Date(`2000-01-01 ${schedule.endTime}`)
      return total + (end.getTime() - start.getTime()) / (1000 * 60)
    }, 0)
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* 背景オーバーレイ */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity backdrop-blur-sm"
          onClick={handleClose}
          aria-hidden="true"
        />

        {/* ダイアログコンテンツ */}
        <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full border">
          {/* ヘッダー */}
          <div className="bg-red-50 px-6 pt-6 pb-4 border-b border-red-100">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 
                  id="delete-dialog-title"
                  className="text-lg font-semibold text-gray-900"
                >
                  {isMultipleDelete 
                    ? `${schedules.length}件のスケジュールを削除`
                    : 'スケジュールを削除'
                  }
                </h3>
                <p className="text-sm text-red-600 mt-1">
                  この操作は慎重に行ってください
                </p>
              </div>
              {!isDeleting && (
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* スケジュールプレビュー */}
          <div className="px-6 py-4 max-h-64 overflow-y-auto bg-gray-50">
            <h4 className="text-sm font-medium text-gray-900 mb-3">削除対象のスケジュール:</h4>
            <div className="space-y-3">
              {schedules.map((schedule) => (
                <div key={schedule.id} className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span 
                      className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                      style={{ backgroundColor: schedule.category.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="text-sm font-medium text-gray-900 truncate">
                            {schedule.title}
                          </h5>
                          <p className="text-xs text-gray-500 mt-1">
                            {format(schedule.date, 'M月d日(E)', { locale: ja })} {schedule.startTime} - {schedule.endTime}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {schedule.category.icon} {schedule.category.name}
                          </p>
                        </div>
                        {schedule.isFixed && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            固定
                          </span>
                        )}
                      </div>
                      {schedule.description && (
                        <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                          {schedule.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 削除サマリー */}
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-yellow-800">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">削除サマリー:</span>
              </div>
              <ul className="mt-2 text-xs text-yellow-700 space-y-1">
                <li>• 合計: {schedules.length}件のスケジュール</li>
                <li>• 総時間: 約{Math.round(getTotalDuration())}分</li>
                {schedules.some(s => s.isFixed) && (
                  <li>• 固定スケジュール: {schedules.filter(s => s.isFixed).length}件含む</li>
                )}
              </ul>
            </div>
          </div>

          {/* 削除オプション */}
          <div className="px-6 py-4 space-y-4">
            {/* 削除タイプ */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-3 block">削除方法</label>
              <div className="space-y-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="deleteType"
                    value="soft"
                    checked={deleteType === 'soft'}
                    onChange={(e) => setDeleteType(e.target.value as 'soft')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 mt-0.5"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900">ソフト削除（推奨）</span>
                    <p className="text-xs text-gray-500 mt-1">
                      スケジュールを非表示にし、30日後に完全削除。復旧可能です。
                    </p>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="deleteType"
                    value="hard"
                    checked={deleteType === 'hard'}
                    onChange={(e) => setDeleteType(e.target.value as 'hard')}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 mt-0.5"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900">完全削除</span>
                    <p className="text-xs text-gray-500 mt-1">
                      即座に完全削除。この操作は取り消せません。
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* 関連データ削除 */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="deleteRelated"
                checked={deleteRelated}
                onChange={(e) => setDeleteRelated(e.target.checked)}
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded mt-0.5"
              />
              <div className="flex-1">
                <label htmlFor="deleteRelated" className="text-sm font-medium text-gray-900 cursor-pointer">
                  関連データも削除
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  実績記録、メモ、添付ファイルなども一緒に削除します
                </p>
              </div>
            </div>

            {/* 削除理由 */}
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                削除理由（任意）
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                maxLength={200}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                placeholder="削除の理由を記録しておくと後で参照できます"
              />
              <div className="mt-1 text-xs text-gray-500 text-right">
                {reason.length}/200
              </div>
            </div>

            {/* 確認テキスト入力 */}
            <div>
              <label htmlFor="confirmText" className="block text-sm font-medium text-gray-700 mb-2">
                確認のため「{requiredConfirmText}」と入力してください
              </label>
              <input
                id="confirmText"
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all ${
                  confirmationText && !isConfirmationValid
                    ? 'border-red-300 focus:ring-red-500 bg-red-50'
                    : isConfirmationValid
                    ? 'border-green-300 focus:ring-green-500 bg-green-50'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder={requiredConfirmText}
                autoComplete="off"
              />
              {confirmationText && !isConfirmationValid && (
                <p className="mt-1 text-xs text-red-600">
                  「{requiredConfirmText}」と正確に入力してください
                </p>
              )}
            </div>
          </div>

          {/* フッター */}
          <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row gap-3 sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={isDeleting}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!isConfirmationValid || isDeleting}
              className={`inline-flex items-center justify-center px-6 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                deleteType === 'hard'
                  ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                  : 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500'
              }`}
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  削除中...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {deleteType === 'hard' ? '完全削除' : 'ソフト削除'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 