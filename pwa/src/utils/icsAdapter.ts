import type { ScheduledItem, IcsEventItem, IcsSourceItem } from '../db/schema'

/**
 * 統一用於 ScheduledTable 等日曆檢視 UI 的統一資料結構
 */
export type UnifiedCalendarItem = ScheduledItem & {
  itemType: 'scheduled' | 'ics_event'
  sourceName?: string
  sourceColor?: string
  isReadOnly: boolean
}

/**
 * 將 IcsEventItem 轉成 ScheduledTable 相容的 UnifiedCalendarItem
 */
export function mapIcsToUnifiedItem(
  ics: IcsEventItem,
  source?: IcsSourceItem
): UnifiedCalendarItem {
  return {
    taskId: ics.eventId,               // 保持 taskId 欄位相容性[cite: 1, 2]
    title: ics.title || '(無標題)',
    status: ics.status || 'WAITING',
    nextRun: ics.startAt,               // 核心對應：將開始時間對應到 nextRun 用於排序[cite: 1, 2]
    deadline: ics.endAt,                // 結束時間對應到 deadline[cite: 1, 2]
    note: ics.description,              // 描述對應到 note[cite: 1, 2]
    url: ics.url || '',
    cronExpr: ics.rrule ? `RRULE:${ics.rrule}` : '', // 僅供 UI 展示說明用[cite: 1, 2]
    // 擴充特有屬性
    itemType: 'ics_event',
    sourceName: source?.name || '外部日曆',
    sourceColor: source?.color || '#9E9E9E',
    isReadOnly: true,                  // 🔒 標記唯讀
  }
}

/**
 * 將原生 ScheduledItem 轉成 UnifiedCalendarItem
 */
export function mapScheduledToUnifiedItem(
  item: ScheduledItem
): UnifiedCalendarItem {
  return {
    ...item,
    itemType: 'scheduled',
    isReadOnly: false,
  }
}