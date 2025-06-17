declare module 'japanese-holidays' {
  export function isHoliday(date: Date): boolean
  export function getHolidayName(date: Date): string | null
} 