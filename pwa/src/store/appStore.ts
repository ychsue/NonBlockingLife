import { create } from 'zustand'
import type { SheetName } from '../hooks/useUrlAction'
import { Dashboard, db } from '../db/schema'
import type { SupportedLocale } from '../i18n'
import { getInitialLocale } from '../i18n'

type AppSheet = SheetName | 'selection_cache' | 'log' | 'guide'
export type StartupPreference = 'guide' | 'selection_cache' | 'last_visited'

const STARTUP_PREFERENCE_KEY = 'nbl_startup_preference'
const LAST_VISITED_SHEET_KEY = 'nbl_last_visited_sheet'

function isAppSheet(value: string | null): value is AppSheet {
  return value === 'inbox'
    || value === 'scheduled'
    || value === 'task_pool'
    || value === 'micro_tasks'
    || value === 'resource'
    || value === 'selection_cache'
    || value === 'log'
    || value === 'guide'
}

function getInitialStartupPreference(): StartupPreference {
  const stored = localStorage.getItem(STARTUP_PREFERENCE_KEY)
  if (stored === 'guide' || stored === 'selection_cache' || stored === 'last_visited') {
    return stored
  }
  return 'guide'
}

function getLastVisitedSheet(): AppSheet | null {
  const stored = localStorage.getItem(LAST_VISITED_SHEET_KEY)
  if (isAppSheet(stored)) return stored
  return null
}

function getInitialCurrentSheet(): AppSheet {
  const startupPreference = getInitialStartupPreference()

  if (startupPreference === 'selection_cache') {
    return 'selection_cache'
  }

  if (startupPreference === 'last_visited') {
    return getLastVisitedSheet() ?? 'guide'
  }

  return 'guide'
}

export interface GlobalToast {
  id: number
  message: string
  duration?: number
  actionLabel?: string
  onAction?: () => void
}

interface AppState {
  // 当前选中的页签
  currentSheet: AppSheet
  setCurrentSheet: (sheet: AppSheet) => void

  // 啟動偏好
  startupPreference: StartupPreference
  setStartupPreference: (preference: StartupPreference) => void

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

  // i18n
  locale: SupportedLocale
  setLocale: (locale: SupportedLocale) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentSheet: getInitialCurrentSheet(),
  setCurrentSheet: (sheet) => {
    localStorage.setItem(LAST_VISITED_SHEET_KEY, sheet)
    set({ currentSheet: sheet })
  },

  startupPreference: getInitialStartupPreference(),
  setStartupPreference: (preference) => {
    localStorage.setItem(STARTUP_PREFERENCE_KEY, preference)
    set({ startupPreference: preference })
  },

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

  locale: getInitialLocale(),
  setLocale: (locale) => {
    localStorage.setItem('nbl_locale', locale)
    set({ locale })
  },
}))
