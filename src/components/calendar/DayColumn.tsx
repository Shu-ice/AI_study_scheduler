import React, { memo, useMemo } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Schedule, TimeSlot } from '@/types'
import ScheduleBlock from './ScheduleBlock'

interface DayColumnProps {
  date: Date
  timeSlots: TimeSlot[]
  schedules: Schedule[]
  isToday: boolean
  onScheduleClick?: (schedule: Schedule) => void
  onTimeSlotClick?: (date: Date, time: string) => void
  onDayClick?: (date: Date) => void
}

function DayColumn({
  date,
  timeSlots,
  schedules,
  isToday,
  onScheduleClick,
  onTimeSlotClick,
  onDayClick
}: DayColumnProps) {
  // メモ化で最適化
  const { dayOfWeek, dayOfMonth, isWeekend } = useMemo(() => ({
    dayOfWeek: format(date, 'E', { locale: ja }),
    dayOfMonth: format(date, 'd'),
    isWeekend: date.getDay() === 0 || date.getDay() === 6
  }), [date])

  const handleTimeSlotClick = (timeSlot: TimeSlot) => {
    onTimeSlotClick?.(date, timeSlot.display)
  }

  const handleDayClick = () => {
    onDayClick?.(date)
  }

  return (
    <div className={`flex-1 min-w-32 sm:min-w-40 border-r border-gray-200 last:border-r-0 ${
      isWeekend ? 'bg-gray-25' : 'bg-white'
    }`}>
      {/* 日付ヘッダー */}
      <div 
        className={`h-16 border-b border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-25 transition-colors ${
          isToday ? 'bg-blue-50' : isWeekend ? 'bg-gray-50' : 'bg-white'
        }`}
        onClick={handleDayClick}
        title="日別詳細を表示"
      >
        <div className={`text-xs sm:text-sm font-medium ${
          isToday ? 'text-blue-600' : 'text-gray-600'
        }`}>
          {dayOfWeek}
        </div>
        <div className={`text-lg sm:text-xl font-bold ${
          isToday ? 'text-blue-600 bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center' : 'text-gray-900'
        }`}>
          {dayOfMonth}
        </div>
      </div>

      {/* タイムスロット */}
      <div className="relative">
        {timeSlots.map((slot, index) => {
          // この時間帯のスケジュールを検索（30分の精度で）
          const scheduleInSlot = schedules.find(schedule => {
            const [startHour, startMinute] = schedule.startTime.split(':').map(Number)
            return startHour === slot.hour && 
                   (slot.minute === 0 ? startMinute < 30 : startMinute >= 30)
          })

          return (
            <div
              key={slot.display}
              className={`h-6 relative cursor-pointer hover:bg-gray-50 transition-colors ${
                slot.minute === 0 
                  ? 'border-b border-gray-200' 
                  : 'border-b border-gray-100'
              } ${isWeekend ? 'bg-gray-25' : ''}`}
              onClick={() => handleTimeSlotClick(slot)}
            >
              {scheduleInSlot && slot.minute === 0 && (
                <ScheduleBlock
                  schedule={scheduleInSlot}
                  category={scheduleInSlot.category}
                  onClick={() => onScheduleClick?.(scheduleInSlot)}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// メモ化でパフォーマンス最適化
export default memo(DayColumn) 