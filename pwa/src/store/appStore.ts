import { create } from 'zustand'
import type { SheetName } from '../hooks/useUrlAction'
import { Dashboard, db } from '../db/schema'

export interface GlobalToast {
  id: number
  message: string
  duration?: number
  actionLabel?: string
  onAction?: () => void
}

interface AppState {
  // 当前选中的页签
  currentSheet: SheetName | 'selection_cache' | 'log' | 'guide'
  setCurrentSheet: (sheet: SheetName | 'selection_cache' | 'log' | 'guide') => void

  // Selection Cache 对话框状态
  showStartDialog: boolean
  setShowStartDialog: (show: boolean) => void

  // 当前编辑的候选任务
  editingCandidate: any | null
  setEditingCandidate: (item: any | null) => void

  // 跨表移動後的待編輯目標
  pendingEditIntent: { sheet: SheetName; taskId: string } | null
  setPendingEditIntent: (intent: { sheet: SheetName; taskId: string } | null) => void
  clearPendingEditIntent: () => void

  // 全域 Toast（可附帶 action）
  globalToast: GlobalToast | null
  showGlobalToast: (toast: Omit<GlobalToast, 'id'>) => number
  clearGlobalToast: () => void

  // 中断模式状态
  isInterruptMode: boolean
  setIsInterruptMode: (isMode: boolean) => void

  // 显示 End Dialog（强制停止当前任务）
  showEndDialog: boolean
  setShowEndDialog: (show: boolean) => void

  // 当前正在运行的任务
  runningTask: Dashboard | null
  setRunningTask: (task: Dashboard | null) => void
  loadRunningTask: () => Promise<void>
}

export const useAppStore = create<AppState>((set) => ({
  currentSheet: 'guide',
  setCurrentSheet: (sheet) => set({ currentSheet: sheet }),

  showStartDialog: false,
  setShowStartDialog: (show) => set({ showStartDialog: show }),

  editingCandidate: null,
  setEditingCandidate: (item) => set({ editingCandidate: item }),

  pendingEditIntent: null,
  setPendingEditIntent: (intent) => set({ pendingEditIntent: intent }),
  clearPendingEditIntent: () => set({ pendingEditIntent: null }),

  globalToast: null,
  showGlobalToast: (toast) => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    set({ globalToast: { ...toast, id } })
    return id
  },
  clearGlobalToast: () => set({ globalToast: null }),

  isInterruptMode: false,
  setIsInterruptMode: (isMode) => set({ isInterruptMode: isMode }),

  showEndDialog: false,
  setShowEndDialog: (show) => set({ showEndDialog: show }),

  runningTask: null,
  setRunningTask: (task) => set({ runningTask: task }),
  loadRunningTask: async () => {
    const rows = await db.dashboard.toArray();
    const current = rows[0] ?? null;
    set({ runningTask: current });
  },
}))
