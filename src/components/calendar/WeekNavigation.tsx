import { format, startOfWeek, endOfWeek } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ChevronLeftIcon, ChevronRightIcon, ClockIcon } from '@heroicons/react/24/outline'

interface WeekNavigationProps {
  currentWeek: Date
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
  onScrollToNow?: () => void
}

export default function WeekNavigation({
  currentWeek,
  onPrevious,
  onNext,
  onToday,
  onScrollToNow
}: WeekNavigationProps) {
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 })
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 })

  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
      <div className="flex items-center space-x-4">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
          {format(weekStart, 'yyyy年M月d日', { locale: ja })} - {format(weekEnd, 'M月d日', { locale: ja })}
        </h2>
        <button
          onClick={onToday}
          className="px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
        >
          今日
        </button>
        {onScrollToNow && (
          <button
            onClick={onScrollToNow}
            className="px-3 py-1 text-sm font-medium text-green-600 bg-green-50 rounded-md hover:bg-green-100 transition-colors flex items-center"
            title="現在時刻にスクロール"
          >
            <ClockIcon className="w-4 h-4 mr-1" />
            現在時刻
          </button>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={onPrevious}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          aria-label="前の週"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
        <button
          onClick={onNext}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          aria-label="次の週"
        >
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
} 