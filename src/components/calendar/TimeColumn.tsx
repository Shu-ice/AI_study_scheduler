import { TimeSlot } from '@/types'

interface TimeColumnProps {
  timeSlots: TimeSlot[]
}

export default function TimeColumn({ timeSlots }: TimeColumnProps) {
  return (
    <div className="w-16 sm:w-20 bg-gray-50 border-r border-gray-200 flex-shrink-0">
      {/* ヘッダー部分（日付行と同じ高さ） */}
      <div className="h-16 border-b border-gray-200"></div>
      
      {/* 時間スロット */}
      <div className="relative">
        {timeSlots.map((slot, index) => (
          <div
            key={slot.display}
            className={`h-6 flex items-start justify-center pt-1 ${
              slot.minute === 0 
                ? 'border-b border-gray-200' 
                : 'border-b border-gray-100'
            }`}
          >
            {/* 正時のみ表示、30分は非表示 */}
            {slot.minute === 0 && (
              <span className="text-xs text-gray-600 font-medium">
                {slot.display}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
} 