import _ from "lodash";
import type { ScheduledItem, IcsEventItem, IcsSourceItem } from "../db/schema";
import { parseAlarmOffsets } from "./candidateUtils";

/**
 * 統一用於 ScheduledTable 等日曆檢視 UI 的統一資料結構
 */
export type UnifiedCalendarItem = ScheduledItem & {
  itemType: "scheduled" | "ics_event";
  sourceName?: string;
  sourceColor?: string;
  isReadOnly: boolean;
};

export type UnifiedTypeName = "Scheduled" | "ICS_Event";
/**
 * 將 IcsEventItem 轉成 ScheduledTable 相容的 UnifiedCalendarItem
 */
export function mapIcsToUnifiedItem(
  ics: IcsEventItem,
  source?: IcsSourceItem,
): UnifiedCalendarItem {
  const reminderOffsets = parseAlarmOffsets(ics.reminderOffsets);
  const remindBefore = Math.max(...reminderOffsets, 30);
  return {
    taskId: ics.eventId, // 保持 taskId 欄位相容性[cite: 1, 2]
    title: ics.title || "(無標題)",
    status: ics.status || "WAITING",
    nextRun: ics.startAt, // 核心對應：將開始時間對應到 nextRun 用於排序[cite: 1, 2]
    deadline: ics.endAt, // 結束時間對應到 deadline[cite: 1, 2]
    focusTime:
      ics.endAt && ics.startAt
        ? Math.floor((ics.endAt - ics.startAt) / 60000)
        : 0, // 持續時間 (分鐘)
    note: ics.description, // 描述對應到 note[cite: 1, 2]
    url: ics.url || "",
    cronExpr: ics.rrule ? `RRULE:${ics.rrule}` : "", // 僅供 UI 展示說明用[cite: 1, 2]
    reminderOffsets: ics.reminderOffsets || "",
    remindBefore,
    // 擴充特有屬性
    itemType: "ics_event",
    sourceName: source?.name || "外部日曆",
    sourceColor: source?.color || "#9E9E9E",
    isReadOnly: true, // 🔒 標記唯讀
  };
}

export function mapUnifiedPatchToIcsEventPatch(
  patch: Partial<UnifiedCalendarItem>,
): Partial<IcsEventItem> {
  const icsPatch: Partial<IcsEventItem> = {};
  if (patch.taskId !== undefined) icsPatch.eventId = patch.taskId;
  if (patch.title !== undefined) icsPatch.title = patch.title;
  if (patch.status !== undefined) icsPatch.status = patch.status;
  if (patch.nextRun !== undefined) icsPatch.startAt = patch.nextRun;
  if (patch.deadline !== undefined) icsPatch.endAt = patch.deadline;
  if (patch.note !== undefined) icsPatch.description = patch.note;
  if (patch.url !== undefined) icsPatch.url = patch.url;
  if (patch.cronExpr !== undefined) icsPatch.rrule = patch.cronExpr; //保持原樣看看//.replace(/^RRULE:/, '');
  return icsPatch;
}

/**
 * 將原生 ScheduledItem 轉成 UnifiedCalendarItem
 */
export function mapScheduledToUnifiedItem(
  item: ScheduledItem,
): UnifiedCalendarItem {
  return {
    ...item,
    itemType: "scheduled",
    isReadOnly: false,
  };
}
