'use client'

import { useMemo } from 'react'
import { Schedule, ScheduleCategory } from '@/types'
import { createColorVariants, getContrastColor } from '@/lib/colors'

interface ColoredSchedule extends Schedule {
  colorVariants: ReturnType<typeof createColorVariants>
  contrastColor: string
  category: ScheduleCategory
}

export function useColoredSchedule(
  schedule: Schedule,
  category: ScheduleCategory
): ColoredSchedule {
  return useMemo(() => {
    const effectiveColor = schedule.color || category.color
    const colorVariants = createColorVariants(effectiveColor)
    const contrastColor = getContrastColor(effectiveColor)

    return {
      ...schedule,
      colorVariants,
      contrastColor,
      category
    }
  }, [schedule, category])
}

export function useColoredSchedules(
  schedules: Schedule[],
  categories: ScheduleCategory[]
): ColoredSchedule[] {
  return useMemo(() => {
    // デフォルトカテゴリーを作成
    const defaultCategory: ScheduleCategory = {
      id: 'default',
      userId: 'default',
      name: 'その他',
      color: '#6B7280'
    }

    return schedules.map(schedule => {
      // scheduleが既にcategoryを持っている場合はそれを使用
      let category = schedule.category
      
      // カテゴリーが存在しない場合はデフォルトを使用
      if (!category) {
        console.warn(`Category not found for schedule ${schedule.id}, using default category`)
        category = defaultCategory
      }

      const effectiveColor = schedule.color || category.color
      const colorVariants = createColorVariants(effectiveColor)
      const contrastColor = getContrastColor(effectiveColor)

      return {
        ...schedule,
        colorVariants,
        contrastColor,
        category
      }
    })
  }, [schedules])
}

export function getScheduleStyles(coloredSchedule: ColoredSchedule) {
  return {
    backgroundColor: coloredSchedule.colorVariants.base,
    color: coloredSchedule.contrastColor,
    borderColor: coloredSchedule.colorVariants.dark,
  }
}

export function getScheduleBorderStyles(coloredSchedule: ColoredSchedule) {
  return {
    borderLeftColor: coloredSchedule.colorVariants.base,
    borderLeftWidth: '4px',
    borderLeftStyle: 'solid' as const,
  }
}

export function getScheduleHoverStyles(coloredSchedule: ColoredSchedule) {
  return {
    backgroundColor: coloredSchedule.colorVariants.light,
    borderColor: coloredSchedule.colorVariants.darker,
  }
}

export function getScheduleOpacityStyles(
  coloredSchedule: ColoredSchedule,
  opacity: keyof ColoredSchedule['colorVariants']['opacity'] = 20
) {
  return {
    backgroundColor: coloredSchedule.colorVariants.opacity[opacity],
    color: coloredSchedule.colorVariants.base,
    borderColor: coloredSchedule.colorVariants.opacity[30],
  }
}