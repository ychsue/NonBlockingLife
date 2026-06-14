import type { TouchEvent } from 'react'

export const clearBrowserSelection = (): void => {
  if (typeof window === 'undefined') return
  window.getSelection()?.removeAllRanges()
}

export const blurActiveElement = (): void => {
  if (typeof document === 'undefined') return
  const activeElement = document.activeElement
  if (activeElement instanceof HTMLElement) {
    activeElement.blur()
  }
}

export const resetDialogTextInteractionState = (): void => {
  clearBrowserSelection()
  blurActiveElement()
}

export const handleDialogActionTouchEnd = (
  event: TouchEvent<HTMLElement>,
  action: () => void
): void => {
  event.preventDefault()
  event.stopPropagation()
  resetDialogTextInteractionState()
  action()
}

export const handleDialogTextFieldInteractionEnd = (): void => {
  clearBrowserSelection()
}