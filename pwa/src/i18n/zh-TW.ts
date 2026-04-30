import type { en } from './en'

type TranslationMap = Record<keyof typeof en, string>

// Traditional Chinese — must cover every key defined in en.ts
export const zhTW: TranslationMap = {
  // ── EditDialog ────────────────────────────────────────────────
  'dialog.cancel':     '取消',
  'dialog.save':       '保存',
  'dialog.saving':     '保存中...',
  'dialog.saveFailed': '保存失敗',
  'dialog.select':     '選擇',

  // ── Toolbar / status ─────────────────────────────────────────
  'candidates.refresh':    '刷新候選',
  'candidates.refreshing': '刷新中...',
  'candidates.interrupt':  '中斷任務',
  'candidates.help':       '說明',
  'candidates.count':      '共 {n} 個候選任務',
  'candidates.loading':    '載入中...',
  'candidates.empty':      '暫無候選任務，請點擊「刷新候選」按鈕',
  'candidates.warnAlreadyRunning': '請先結束目前任務後再開始新的任務。',

  // ── Column headers ───────────────────────────────────────────
  'col.taskId':  '任務 ID',
  'col.title':   '任務標題',
  'col.score':   '評分',
  'col.source':  '來源',
  'col.unknown': '未知',

  // ── Deadline / count badges ───────────────────────────────────
  'badge.overdue':    '逾期 {n} 天',
  'badge.dueToday':   '今天到期',
  'badge.dueDays':    '{n} 天後',
  'badge.todayCount': '今日 {n} 次',

  // ── Conflict warning ──────────────────────────────────────────
  'conflict.warning': '{n} 個 Scheduled 任務的排程時間晚於截止日',
  'conflict.hint':    '(點擊條目前往編輯)',

  // ── End Task dialog ───────────────────────────────────────────
  'endTask.title':           '結束任務',
  'endTask.nowRunning':      '目前執行中：',
  'endTask.elapsed':         '已執行 {time}',
  'endTask.noteLabel':       '結束備註 (選填)',
  'endTask.notePlaceholder': '輸入結束任務的備註...',
  'endTask.confirmBtn':      '結束任務',
  'endTask.noTask':          '目前沒有執行中的任務',

  // ── Start Task dialog ─────────────────────────────────────────
  'startTask.title':           '開始任務',
  'startTask.taskId':          '任務 ID',
  'startTask.taskTitle':       '任務標題',
  'startTask.noteLabel':       '備註 (選填)',
  'startTask.notePlaceholder': '輸入開始該任務的備註...',
  'startTask.cancelBtn':       '取消',
  'startTask.logOnlyBtn':      '只記錄',
  'startTask.confirmBtn':      '開始任務',

  // ── Log-only (record) dialog ──────────────────────────────────
  'recordOnly.title':           '只記錄事件',
  'recordOnly.task':            '任務',
  'recordOnly.durationLabel':   '補記時長 (分鐘, 選填)',
  'recordOnly.noteLabel':       '備註 (選填)',
  'recordOnly.backBtn':         '返回',
  'recordOnly.confirmBtn':      '確認記錄',

  // ── SyncStatus ────────────────────────────────────────────────
  'sync.cancel':               '取消',
  'sync.confirmRestore':       '確認還原',
  'sync.confirmRestoreWithLog':'確認還原（含 Log）',

  // ── TableCard ────────────────────────────────────────────────
  'tableCard.edit':                '編輯',
  'tableCard.delete':              '刪除',
  'tableCard.openLink':            '開啟連結',
  'tableCard.swipeDeleteConfirm':  '再左滑一次以確認刪除',
  'tableCard.confirmDelete':       '確認刪除',

  // ── Inbox move/toast ─────────────────────────────────────────
  'inbox.movedTo':            '已移動到 {target}',
  'inbox.moveRestored':       '已復原移動',
  'inbox.undoFailed':         'Undo 失敗：{msg}',
  'inbox.moveFailed':         'Move 失敗：{msg}',

  // ── LogTable ─────────────────────────────────────────────────
  'log.confirmClear':         '確定要清除所有 Log 相關的 change_log 記錄嗎？',
  'log.clearedCount':         '已清除 {count} 筆 Log change_log 記錄',
  'log.clearFailed':          '清除失敗，請查看 console',
  'log.dayOption':            '{n} 天',

  // ── SetupWizard alerts ───────────────────────────────────────
  'setup.invalidGasUrl':      '請輸入有效的 GAS Web App URL',
  'setup.connectFailed':      '連接失敗，請檢查 URL 是否正確',
  'setup.codeCopied':         '完整的 Apps Script 代碼已複製到剪貼板！現在請到 Google Sheets 中打開 Apps Script 編輯器並貼上。',

  // ── Table pages (common) ─────────────────────────────────────
  'table.help':               '說明',
  'table.open':               '開啟',
  'table.loading':            '載入中...',
  'table.add':                '+ 新增',
  'table.noItemsYet':         '尚無項目。',
  'table.noMatchingItems':    '沒有符合條件的項目。',
  'table.empty':              '(空白)',
  'table.notSet':             '(未設定)',
  'table.notRun':             '(未執行)',

  // ── Table card labels ────────────────────────────────────────
  'card.receivedAt':          '接收時間',
  'card.lastRun':             '上次執行',
  'card.focusTime':           '專注時長',
  'card.status':              '狀態',
  'card.priority':            '優先序',
  'card.dailyLimit':          '每日上限',
  'card.spentToday':          '今日已用',
  'card.cron':                'Cron',
  'card.nextRun':             '下次執行',
  'card.category':            '分類',
  'card.received':            '接收時間',
  'card.note':                '備註',
  'card.default30Mins':       '(預設 30)',
  'card.default30MinsUnit':   '{n} 分鐘',
  'card.untitled':            '(未命名)',
  'card.noCategory':          '(無分類)',
  'card.noDate':              '(無日期)',
  'card.noNote':              '(無備註)',

  // ── InboxTable ───────────────────────────────────────────────
  'inbox.subtitle':           '新增想法與待辦項目',
  'inbox.empty':              '尚無項目',
  'inbox.editTitle':          '編輯 Inbox 項目',
  'inbox.titlePlaceholder':   '輸入任務標題',
  'inbox.movePlaceholder':    '移動到...',
  'inbox.helpTitle':          'Inbox 使用說明',

  // ── MicroTasksTable ──────────────────────────────────────────
  'micro.subtitle':           '小型任務快速完成',
  'micro.searchPlaceholder':  '搜尋 Title、URL...',
  'micro.hideDone':           '隱藏 Done',
  'micro.editTitle':          '編輯微任務',
  'micro.titlePlaceholder':   '輸入任務標題',
  'micro.helpTitle':          'Micro Tasks 使用說明',

  // ── ResourceTable ────────────────────────────────────────────
  'resource.subtitle':            '外部參考資源庫',
  'resource.searchPlaceholder':   '搜尋 Title、Category、Note、URL...',
  'resource.editTitle':           '編輯資源',
  'resource.titlePlaceholder':    '輸入資源標題',
  'resource.categoryPlaceholder': '例如: Tutorial, Reference',
  'resource.notePlaceholder':     '添加備註',
  'resource.helpTitle':           'Resources 使用說明',
  'resource.empty':               '尚無資源。',
  'resource.noMatch':             '沒有符合條件的資源。',

  // ── TaskPoolTable ────────────────────────────────────────────
  'taskPool.subtitle':         '任務優先序與時間管理',
  'taskPool.searchPlaceholder':'搜尋 Title、Note、Project、URL...',
  'taskPool.hideDone':         '隱藏 Done',
  'taskPool.editTitle':        '編輯 Task Pool 項目',
  'taskPool.titlePlaceholder': '輸入任務標題',
  'taskPool.helpTitle':        'Task Pool 使用說明',

  // ── ScheduledTable ───────────────────────────────────────────
  'scheduled.subtitle':          '定期執行的任務設定',
  'scheduled.searchPlaceholder': '搜尋 Title、Note、Callback、URL...',
  'scheduled.hideDone':          '隱藏 Done',
  'scheduled.editTitle':         '編輯排程任務',
  'scheduled.titlePlaceholder':  '輸入任務標題',
  'scheduled.cronPlaceholder':   '例: 0 9 * * *',
  'scheduled.helpTitle':         'Scheduled 使用說明',
  'scheduled.cronHeader':        'Cron (分 時 日 月 週)',
  'scheduled.cronMinute':        '分鐘',
  'scheduled.cronHour':          '小時',
  'scheduled.cronDay':           '日',
  'scheduled.cronMonth':         '月',
  'scheduled.cronWeekday':       '週',

  // ── LogTable ─────────────────────────────────────────────────
  'log.total':                '共 {n} 筆記錄',
  'log.clearing':             '清除中...',
  'log.clearBtn':             '清除 Log ChangeLog',
  'log.recent':               '顯示最近：',
  'log.search':               '搜索：',
  'log.searchPlaceholder':    '標題、任務ID、動作、備註...',
  'log.clearSearch':          '清除搜索',
  'log.empty':                '暫無紀錄',

  // ── Language toggle (shows the OTHER language label) ──────────
  'lang.toggle': 'EN',
}
