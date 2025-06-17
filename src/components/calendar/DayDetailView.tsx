'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, isSameDay, isToday } from 'date-fns'
import { ja } from 'date-fns/locale'
import { 
  Calendar, 
  Clock, 
  Edit3, 
  Save, 
  X, 
  Plus, 
  Target, 
  ChevronLeft, 
  ChevronRight,
  Star,
  CheckCircle,
  AlertCircle,
  Timer
} from 'lucide-react'
import { Schedule, ActualRecord } from '@/types'

interface DayDetailViewProps {
  date: Date
  schedules: Schedule[]
  onClose: () => void
  onScheduleUpdate: () => void
  onActualRecordSave: (scheduleId: string, actualRecord: Partial<ActualRecord>) => void
  className?: string
}

interface ScheduleWithActual extends Schedule {
  actualRecord?: ActualRecord
}

export default function DayDetailView({
  date,
  schedules,
  onClose,
  onScheduleUpdate,
  onActualRecordSave,
  className = ''
}: DayDetailViewProps) {
  const [editingRecord, setEditingRecord] = useState<string | null>(null)
  const [actualRecords, setActualRecords] = useState<Record<string, Partial<ActualRecord>>>({})
  const [selectedDate, setSelectedDate] = useState(date)

  // その日のスケジュールをフィルタリング
  const daySchedules = schedules.filter(schedule => 
    isSameDay(schedule.date, selectedDate)
  ).sort((a, b) => a.startTime.localeCompare(b.startTime))

  // 実績記録の読み込み
  const loadActualRecords = useCallback(async () => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const response = await fetch(`/api/actual-records?date=${dateStr}`)
      
      if (response.ok) {
        const records = await response.json()
        const recordsMap: Record<string, ActualRecord> = {}
        records.forEach((record: ActualRecord) => {
          recordsMap[record.scheduleId] = record
        })
        setActualRecords(recordsMap)
      }
    } catch (error) {
      console.error('実績記録の読み込みエラー:', error)
    }
  }, [selectedDate])

  useEffect(() => {
    loadActualRecords()
  }, [selectedDate, loadActualRecords])

  // 実績記録の保存
  const handleActualRecordSave = async (scheduleId: string) => {
    const actualRecord = actualRecords[scheduleId]
    if (!actualRecord) return

    try {
      const payload = {
        ...actualRecord,
        scheduleId
      }

      const response = await fetch('/api/actual-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        onActualRecordSave(scheduleId, actualRecord)
        setEditingRecord(null)
        await loadActualRecords()
      }
    } catch (error) {
      console.error('実績記録の保存エラー:', error)
    }
  }

  // 実績記録の更新
  const updateActualRecord = (scheduleId: string, updates: Partial<ActualRecord>) => {
    setActualRecords(prev => ({
      ...prev,
      [scheduleId]: { ...prev[scheduleId], ...updates }
    }))
  }

  // 日付変更
  const handleDateChange = (newDate: Date) => {
    setSelectedDate(newDate)
    setEditingRecord(null)
  }

  // 前日・翌日への移動
  const moveToPreviousDay = () => {
    const prevDay = new Date(selectedDate)
    prevDay.setDate(prevDay.getDate() - 1)
    handleDateChange(prevDay)
  }

  const moveToNextDay = () => {
    const nextDay = new Date(selectedDate)
    nextDay.setDate(nextDay.getDate() + 1)
    handleDateChange(nextDay)
  }

  // 完了率計算
  const calculateCompletionRate = () => {
    if (daySchedules.length === 0) return 0
    const completedCount = daySchedules.filter(schedule => 
      actualRecords[schedule.id]?.actualEndTime
    ).length
    return Math.round((completedCount / daySchedules.length) * 100)
  }

  // 総計画時間と実績時間
  const calculateTotalTimes = () => {
    let plannedMinutes = 0
    let actualMinutes = 0

    daySchedules.forEach(schedule => {
      const [startHour, startMin] = schedule.startTime.split(':').map(Number)
      const [endHour, endMin] = schedule.endTime.split(':').map(Number)
      plannedMinutes += (endHour * 60 + endMin) - (startHour * 60 + startMin)

      const actual = actualRecords[schedule.id]
      if (actual?.actualStartTime && actual?.actualEndTime) {
        const [actualStartHour, actualStartMin] = actual.actualStartTime.split(':').map(Number)
        const [actualEndHour, actualEndMin] = actual.actualEndTime.split(':').map(Number)
        actualMinutes += (actualEndHour * 60 + actualEndMin) - (actualStartHour * 60 + actualStartMin)
      }
    })

    return {
      planned: plannedMinutes,
      actual: actualMinutes
    }
  }

  const { planned, actual } = calculateTotalTimes()
  const completionRate = calculateCompletionRate()

  // 時間フォーマット
  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return mins > 0 ? `${hours}時間${mins}分` : `${hours}時間`
    }
    return `${mins}分`
  }

  // 満足度の星表示
  const renderStars = (rating: number, onChange?: (rating: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onClick={() => onChange?.(star)}
            className={`transition-colors ${
              star <= rating 
                ? 'text-yellow-500' 
                : 'text-gray-300 hover:text-yellow-400'
            } ${onChange ? 'cursor-pointer' : 'cursor-default'}`}
            disabled={!onChange}
          >
            <Star className="w-4 h-4 fill-current" />
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg border ${className}`}>
      {/* ヘッダー */}
      <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={moveToPreviousDay}
              className="p-2 rounded-lg bg-white border hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">
                {format(selectedDate, 'M月d日', { locale: ja })}
              </h2>
              <p className="text-sm text-gray-600">
                {format(selectedDate, 'EEEE', { locale: ja })}
                {isToday(selectedDate) && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    今日
                  </span>
                )}
              </p>
            </div>
            
            <button
              onClick={moveToNextDay}
              className="p-2 rounded-lg bg-white border hover:bg-gray-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white border hover:bg-gray-50"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* 統計情報 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{daySchedules.length}</div>
            <div className="text-xs text-gray-600">スケジュール</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{completionRate}%</div>
            <div className="text-xs text-gray-600">完了率</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {formatMinutes(actual)}
            </div>
            <div className="text-xs text-gray-600">実績時間</div>
            <div className="text-xs text-gray-500">
              (計画: {formatMinutes(planned)})
            </div>
          </div>
        </div>
      </div>

      {/* スケジュール一覧 */}
      <div className="p-6">
        {daySchedules.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">この日のスケジュールはありません</h3>
            <p className="text-sm">新しいスケジュールを追加してください</p>
          </div>
        ) : (
          <div className="space-y-4">
            {daySchedules.map(schedule => {
              const actual = actualRecords[schedule.id]
              const isEditing = editingRecord === schedule.id
              const isCompleted = !!actual?.actualEndTime

              return (
                <div
                  key={schedule.id}
                  className={`border rounded-lg p-4 transition-all ${
                    isCompleted ? 'border-green-200 bg-green-50' : 'border-gray-200'
                  } ${isEditing ? 'ring-2 ring-blue-300' : ''}`}
                >
                  {/* スケジュール基本情報 */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: schedule.category.color }}
                        />
                        <h3 className="font-semibold text-gray-900">{schedule.title}</h3>
                        {isCompleted && (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          計画: {schedule.startTime} - {schedule.endTime}
                        </div>
                        {actual?.actualStartTime && actual?.actualEndTime && (
                          <div className="flex items-center text-green-600">
                            <Timer className="w-4 h-4 mr-1" />
                            実績: {actual.actualStartTime} - {actual.actualEndTime}
                          </div>
                        )}
                      </div>
                      
                      {schedule.description && (
                        <p className="text-sm text-gray-700 mb-2">{schedule.description}</p>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      {!isEditing ? (
                        <button
                          onClick={() => {
                            setEditingRecord(schedule.id)
                            if (!actualRecords[schedule.id]) {
                              updateActualRecord(schedule.id, {
                                actualStartTime: schedule.startTime,
                                actualEndTime: schedule.endTime,
                                satisfactionRating: 3
                              })
                            }
                          }}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="実績を入力"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleActualRecordSave(schedule.id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="保存"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingRecord(null)}
                            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                            title="キャンセル"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 実績入力フォーム */}
                  {isEditing && (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            実際の開始時間
                          </label>
                          <input
                            type="time"
                            value={actualRecords[schedule.id]?.actualStartTime || ''}
                            onChange={(e) => updateActualRecord(schedule.id, { actualStartTime: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            実際の終了時間
                          </label>
                          <input
                            type="time"
                            value={actualRecords[schedule.id]?.actualEndTime || ''}
                            onChange={(e) => updateActualRecord(schedule.id, { actualEndTime: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          満足度
                        </label>
                        {renderStars(
                          actualRecords[schedule.id]?.satisfactionRating || 3,
                          (rating) => updateActualRecord(schedule.id, { satisfactionRating: rating })
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          メモ
                        </label>
                        <textarea
                          value={actualRecords[schedule.id]?.notes || ''}
                          onChange={(e) => updateActualRecord(schedule.id, { notes: e.target.value })}
                          placeholder="実際の作業内容や気づいたことを記入..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          rows={3}
                        />
                      </div>
                    </div>
                  )}

                  {/* 保存済み実績の表示 */}
                  {!isEditing && actual && (
                    <div className="bg-green-50 rounded-lg p-3 mt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-green-800">
                          <strong>実績:</strong> {actual.actualStartTime} - {actual.actualEndTime}
                        </div>
                        {actual.satisfactionRating && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-green-700">満足度:</span>
                            {renderStars(actual.satisfactionRating)}
                          </div>
                        )}
                      </div>
                      {actual.notes && (
                        <p className="text-sm text-green-700">
                          <strong>メモ:</strong> {actual.notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
} 