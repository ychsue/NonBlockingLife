import { useEffect } from 'react'
import { applyChange, db } from '../db/index'
import Utils from '../../../gas/src/Utils'
import { interruptTask } from '../utils/taskFlow'

export type SheetName = 'inbox' | 'scheduled' | 'task_pool' | 'micro_tasks'

interface UseUrlActionOptions {
  onNavigate: (sheet: SheetName) => void
  onSuccess?: (message: string) => void
  onError?: (message: string) => void
  clientId?: string
}

/**
 * 監聽 URL Query 參數，自動將 iPhone Shortcut 的新增請求寫入 Dexie
 * 
 * 使用範例：
 * useUrlAction({
 *   onNavigate: setCurrentSheet,
 *   onSuccess: setToast,
 *   clientId: 'iphone-shortcut'
 * })
 * 
 * URL 格式：
 * ?sheet=inbox&action=add&title=Buy%20milk
 * ?sheet=scheduled&action=add&title=Morning%20Run&cronExpr=0%209%20*%20*%20*
 */
export function useUrlAction(options: UseUrlActionOptions) {
  const { onNavigate, onSuccess, onError, clientId = 'iphone-shortcut' } =
    options

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sheet = params.get('sheet') as SheetName | null
    const action = params.get('action')

    // 處理中斷動作
    if (action === 'interrupt') {
      handleInterruptAction(params)
      return
    }

    // 若沒有參數或 action 不是 'add'，不處理
    if (!sheet || action !== 'add') return

    // 允許的 sheet
    const validSheets: SheetName[] = [
      'inbox',
      'scheduled',
      'task_pool',
      'micro_tasks',
    ]
    if (!validSheets.includes(sheet)) {
      console.warn(`Invalid sheet: ${sheet}`)
      return
    }

    // 提取所有參數為 record patch（排除 sheet 和 action）
    const patch: Record<string, unknown> = {}
    params.forEach((value, key) => {
      if (key !== 'sheet' && key !== 'action') {
        // 嘗試解析數字
        if (!isNaN(Number(value))) {
          patch[key] = Number(value)
        } else {
          patch[key] = value
        }
      }
    })

    // 補預設值，避免欄位顯示空白
    if (sheet === 'inbox' && patch.receivedAt == null) {
      patch.receivedAt = Date.now()
    }

    // 生成 recordId
    const recordId = generateRecordId(sheet, patch)

    // 寫入 Dexie
    applyChange({
      table: sheet,
      recordId,
      op: 'add',
      patch,
      clientId,
    })
      .then(() => {
        // 導航到該頁籤
        onNavigate(sheet)

        // 顯示成功提示
        const sheetLabel: Record<SheetName, string> = {
          inbox: 'Inbox',
          scheduled: 'Scheduled',
          task_pool: 'Task Pool',
          micro_tasks: 'Micro Tasks',
        }
        onSuccess?.(
          `✅ 已新增到 ${sheetLabel[sheet]}: ${patch.title || recordId}`
        )

        // 清除 URL（避免重複新增）
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        )
      })
      .catch((err) => {
        const errorMsg = err instanceof Error ? err.message : String(err)
        console.error('Failed to add from URL action:', err)
        onError?.(`❌ 新增失敗：${errorMsg}`)
      })
  }, [onNavigate, onSuccess, onError, clientId])
}

/**
 * 處理中斷動作
 */
function handleInterruptAction(params: URLSearchParams) {
  const note = params.get('note') || ''
  
  interruptTask(note)
    .then((result) => {
      if (result.status === 'success') {
        console.log('✅ 已進入中斷模式')
      } else {
        console.error('❌ 中斷失敗：', result.message)
      }
      
      // 清除 URL（避免重複執行）
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      )
    })
    .catch((err) => {
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.error('Failed to interrupt:', err)
      console.error('❌ 中斷失敗：', errorMsg)
    })
}

/**
 * 根據 sheet 類型生成 recordId，使用 GAS 的 ID 生成器
 */
function generateRecordId(
  sheet: SheetName,
  _patch: Record<string, unknown>
): string {
  switch (sheet) {
    case 'inbox':
      return Utils.generateId('I')
    case 'task_pool':
      return Utils.generateId('T')
    case 'micro_tasks':
      return Utils.generateId('t')
    case 'scheduled':
      return Utils.generateId('S')
    default:
      return Utils.generateId('X')
  }
}
