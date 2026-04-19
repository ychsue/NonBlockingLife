import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react'

interface TableCardProps<T> {
  item: T
  fields: Array<{
    label: string
    value: ReactNode
  }>
  onEdit: (item: T) => void
  onDelete: (item: T) => void
}

function isUsableUrl(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '' && value !== 'None'
}

export function TableCard<T extends { taskId?: string | number; url?: string }>({
  item,
  fields,
  onEdit,
  onDelete,
}: TableCardProps<T>) {
  const [offsetX, setOffsetX] = useState(0)
  const [pendingDeleteConfirm, setPendingDeleteConfirm] = useState(false)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const swipingRef = useRef(false)
  const confirmTimerRef = useRef<number | null>(null)

  const SWIPE_MAX = 110
  const SWIPE_TRIGGER = 70
  const CONFIRM_WINDOW_MS = 3000
  const itemUrl = isUsableUrl(item.url) ? item.url.trim() : null
  const [isTouch] = useState(() => window.matchMedia('(hover: none) and (pointer: coarse)').matches)

  useEffect(() => {
    return () => {
      if (confirmTimerRef.current != null) {
        window.clearTimeout(confirmTimerRef.current)
      }
    }
  }, [])

  const clearDeleteConfirmTimer = () => {
    if (confirmTimerRef.current != null) {
      window.clearTimeout(confirmTimerRef.current)
      confirmTimerRef.current = null
    }
  }

  const beginDeleteConfirmation = () => {
    setPendingDeleteConfirm(true)
    clearDeleteConfirmTimer()
    confirmTimerRef.current = window.setTimeout(() => {
      setPendingDeleteConfirm(false)
      confirmTimerRef.current = null
    }, CONFIRM_WINDOW_MS)
  }

  const cancelDeleteConfirmation = () => {
    setPendingDeleteConfirm(false)
    clearDeleteConfirmTimer()
  }

  const resetSwipe = () => {
    setOffsetX(0)
    startRef.current = null
    swipingRef.current = false
  }

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0]
    startRef.current = { x: touch.clientX, y: touch.clientY }
    swipingRef.current = false
  }

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    const start = startRef.current
    if (!start) return

    const touch = event.touches[0]
    const deltaX = touch.clientX - start.x
    const deltaY = touch.clientY - start.y

    if (!swipingRef.current) {
      if (Math.abs(deltaX) < 10) return
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        return
      }
      swipingRef.current = true
    }

    if (event.cancelable) {
      event.preventDefault()
    }

    const clamped = Math.max(-SWIPE_MAX, Math.min(SWIPE_MAX, deltaX))
    setOffsetX(clamped)
  }

  const handleTouchEnd = () => {
    if (offsetX >= SWIPE_TRIGGER) {
      resetSwipe()
      cancelDeleteConfirmation()
      onEdit(item)
      return
    }

    if (offsetX <= -SWIPE_TRIGGER) {
      resetSwipe()
      if (pendingDeleteConfirm) {
        cancelDeleteConfirmation()
        onDelete(item)
      } else {
        beginDeleteConfirmation()
      }
      return
    }

    resetSwipe()
  }

  return (
    <div
      className={`relative overflow-hidden rounded-lg border ${pendingDeleteConfirm ? 'border-red-300' : 'border-gray-200'}`}
    >
      <div className="absolute inset-0 flex text-white text-sm font-semibold">
        <div className="flex-1 bg-blue-500 flex items-center justify-start pl-4">
          編輯
        </div>
        <div className="flex-1 bg-red-500 flex items-center justify-end pr-4">
          刪除
        </div>
      </div>

      <div
        className="relative bg-white p-4 shadow-sm transition-transform duration-150"
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={resetSwipe}
      >
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={index} className="flex justify-between items-start gap-2">
              <span className="text-sm font-medium text-gray-600">{field.label}</span>
              <span className="text-sm text-gray-900 text-right flex-1">{field.value}</span>
            </div>
          ))}
        </div>

        {itemUrl && (
          <div className="mt-4 flex justify-end">
            <a
              href={itemUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-md bg-blue-500 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600"
              onClick={(event) => event.stopPropagation()}
              onTouchStart={(event) => event.stopPropagation()}
              onTouchMove={(event) => event.stopPropagation()}
              onTouchEnd={(event) => event.stopPropagation()}
            >
              開啟連結
            </a>
          </div>
        )}

        {pendingDeleteConfirm && (
          <div className="mt-3 text-xs text-red-600 text-right">再左滑一次以確認刪除</div>
        )}

        {!isTouch && (
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => { cancelDeleteConfirmation(); onEdit(item) }}
              className="px-3 py-1 text-xs font-medium rounded bg-blue-500 text-white hover:bg-blue-600"
            >
              編輯
            </button>
            <button
              onClick={() => {
                if (pendingDeleteConfirm) {
                  cancelDeleteConfirmation()
                  onDelete(item)
                } else {
                  beginDeleteConfirmation()
                }
              }}
              className={`px-3 py-1 text-xs font-medium rounded text-white ${
                pendingDeleteConfirm ? 'bg-red-600 hover:bg-red-700' : 'bg-red-400 hover:bg-red-500'
              }`}
            >
              {pendingDeleteConfirm ? '確認刪除' : '刪除'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
