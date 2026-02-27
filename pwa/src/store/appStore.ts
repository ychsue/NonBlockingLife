import { create } from 'zustand'
import type { SheetName } from '../hooks/useUrlAction'

interface AppState {
  // 当前选中的页签
  currentSheet: SheetName | 'selection_cache' | 'log'
  setCurrentSheet: (sheet: SheetName | 'selection_cache' | 'log') => void

  // Selection Cache 对话框状态
  showStartDialog: boolean
  setShowStartDialog: (show: boolean) => void

  // 当前编辑的候选任务
  editingCandidate: any | null
  setEditingCandidate: (item: any | null) => void

  // 中断模式状态
  isInterruptMode: boolean
  setIsInterruptMode: (isMode: boolean) => void

  // 显示 End Dialog（强制停止当前任务）
  showEndDialog: boolean
  setShowEndDialog: (show: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentSheet: 'inbox',
  setCurrentSheet: (sheet) => set({ currentSheet: sheet }),

  showStartDialog: false,
  setShowStartDialog: (show) => set({ showStartDialog: show }),

  editingCandidate: null,
  setEditingCandidate: (item) => set({ editingCandidate: item }),

  isInterruptMode: false,
  setIsInterruptMode: (isMode) => set({ isInterruptMode: isMode }),

  showEndDialog: false,
  setShowEndDialog: (show) => set({ showEndDialog: show }),
}))
