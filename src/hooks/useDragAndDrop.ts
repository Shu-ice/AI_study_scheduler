'use client'

import { useState, useCallback } from 'react'
import { Schedule } from '@/types'

interface DragDropState {
  isDragging: boolean
  draggedSchedule: Schedule | null
  dropTarget: { date: Date; time: string } | null
}

interface UseDragAndDropReturn {
  dragState: DragDropState
  handleDragStart: (schedule: Schedule) => void
  handleDragOver: (date: Date, time: string) => void
  handleDragEnd: () => void
  handleDrop: (onDrop: (schedule: Schedule, newDate: Date, newTime: string) => void) => void
}

export function useDragAndDrop(): UseDragAndDropReturn {
  const [dragState, setDragState] = useState<DragDropState>({
    isDragging: false,
    draggedSchedule: null,
    dropTarget: null
  })

  const handleDragStart = useCallback((schedule: Schedule) => {
    setDragState(prev => ({
      ...prev,
      isDragging: true,
      draggedSchedule: schedule
    }))
  }, [])

  const handleDragOver = useCallback((date: Date, time: string) => {
    setDragState(prev => ({
      ...prev,
      dropTarget: { date, time }
    }))
  }, [])

  const handleDragEnd = useCallback(() => {
    setDragState({
      isDragging: false,
      draggedSchedule: null,
      dropTarget: null
    })
  }, [])

  const handleDrop = useCallback((onDrop: (schedule: Schedule, newDate: Date, newTime: string) => void) => {
    if (dragState.draggedSchedule && dragState.dropTarget) {
      onDrop(
        dragState.draggedSchedule,
        dragState.dropTarget.date,
        dragState.dropTarget.time
      )
    }
    handleDragEnd()
  }, [dragState, handleDragEnd])

  return {
    dragState,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDrop
  }
}

export default useDragAndDrop 