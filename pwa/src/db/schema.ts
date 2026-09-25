import { Dexie, type Table } from "dexie";

export interface LogEntry {
  id: string;
  timestamp: number;
  taskId: string;
  title?: string;
  action?: string;
  category?: string;
  state?: string;
  duration?: number;
  notes?: string;
}

export interface Dashboard {
  taskId: string;
  title?: string;
  source?: string;
  notes?: string;
  startAt?: number;
  endAt?: number;
  systemStatus?: string;
  totalFocusToday?: number;
}

export interface ProjectItem {
  id: string              // 主鍵 e.g. 'proj_health_01' 或 UUID
  name: string            // 專案/分類名稱 e.g. '運動健康'
  parentId?: string | null// 父專案 ID (根目錄則為 null 或 undefined)
  color?: string          // 可選：用於 UI 標籤顏色/圖示
  sortOrder?: number      // 可選：同階層排序
  updatedAt: number       // 異動時間戳 (利於同步)
}

export interface InboxItem {
  taskId: string;
  title?: string;
  receivedAt?: number;
  updatedAt?: number;
  url?: string;
}

export interface TaskPoolItem {
  taskId: string;
  title?: string;
  status?: string;
  focusTime?: number;
  project?: string;
  spentTodayMins?: number;
  usedTodayCount?: number;
  dailyLimitMins?: number;
  priority?: number;
  lastRunDate?: number;
  totalSpentMins?: number;
  updatedAt?: number;
  note?: string;
  url?: string;
  deadline?: number;
}

export interface ScheduledItem {
  taskId: string;
  title?: string;
  status?: string;
  focusTime?: number;
  cronExpr?: string;
  projectIds?: string[]   // 存放 Project ID 陣列 (e.g. ['proj_exercise', 'proj_personal'])
  remindBefore?: string | number;
  remindAfter?: string | number;
  reminderOffsets?: string | number[];
  callback?: string;
  lastRun?: number;
  note?: string;
  nextRun?: number;
  updatedAt?: number;
  url?: string;
  deadline?: number;
}

export interface IcsSourceItem {
  sourceId: string; // 主鍵, e.g. 'SRC_GOOGLE_WORK'
  name: string; // 日曆名稱
  type: "url" | "file"; // 網址訂閱 或 手動上傳
  url?: string; // 訂閱網址
  color?: string; // UI 標籤顏色 (例如 '#4285F4')
  enabled: boolean; // 是否啟用 (true/false)
  lastSyncedAt?: number; // 上次成功同步時間戳
  updatedAt: number; // 異動時間戳
}

export interface IcsEventItem {
  eventId: string; // 本地主鍵, e.g. 'ICS_xxx'
  sourceId: string; // 關聯 ics_sources.sourceId
  uid: string; // ics 規範原生 UID (用來比對與更新)
  title: string; // 事件標題 (SUMMARY)
  status?: string; // 本地狀態 (WAITING, DONE, IGNORED 等)
  startAt: number; // 開始時間戳 (DTSTART)
  endAt?: number; // 結束時間戳 (DTEND)
  isAllDay: boolean; // 是否為全天事件
  reminderOffsets?: string | number[]; // 提醒的偏移量 (例如提前 10 分鐘)
  projectIds?: string[]; // 存放 Project ID 陣列 (e.g. ['proj_exercise', 'proj_personal'])
  location?: string; // 地點
  description?: string; // 描述 (DESCRIPTION)
  url?: string; // 事件連結 (URL)
  rrule?: string; // 原始 RRULE 規則字串 (若為重複事件)
  rawIcs?: string; // 保留該 VEVENT 區塊的原始 ics 文字
  updatedAt: number;
}

export interface SelectionCacheItem {
  taskId: string;
  title?: string;
  score?: number;
  source?: string;
  status?: string;
  totalMinsInPool?: number;
  url?: string;
  deadline?: number;
  usedTodayCount?: number;
}

export interface MicroTaskItem {
  taskId: string;
  title?: string;
  status?: string;
  focusTime?: number;
  lastRunDate?: number;
  updatedAt?: number;
  url?: string;
  deadline?: number;
}

// Tracks whether this queue entry has been (or needs to be) sent to the Android TWA for the given
// target; 'not_applicable' means the user hasn't asked to sync this entry to that target.
export type AlarmSyncState = "not_applicable" | "pending" | "set" | "failed";

export interface AlarmQueueItem {
  id?: number;
  title?: string;
  taskId: string;
  alarmAt: number;
  offsetMinutes: number;
  state: "pending" | "triggered" | "expired" | "dismissed";
  clockState: AlarmSyncState;
  exactState: AlarmSyncState | "forbidden" | "wrong_time";
  dedupeKey: string;
  createdAt: number;
  updatedAt: number;
}

export type ChangeLogStatus = "pending" | "synced" | "failed";

export interface ResourceItem {
  taskId: string;
  title?: string;
  category?: string;
  receivedAt?: number;
  url?: string;
  note?: string;
  updatedAt?: number;
}

export interface ChangeLogEntry {
  id: string;
  clientId?: string;
  table: string;
  recordId: string;
  op: "add" | "update" | "put" | "delete" | "bulkdelete";
  patch?: Record<string, unknown>;
  createdAt: number;
  status: ChangeLogStatus;
  retryCount: number;
  syncedAt: number | null;
  option?: Record<string, unknown>;
}

export interface SyncState {
  key: string;
  value?: unknown;
}

export interface MacroItem {
  taskId: string;
  name: string;
  description?: string;
  commands: string;
  updatedAt?: number;
  createdAt?: number;
}

export type MacroExecutionStatus =
  | "idle"
  | "running"
  | "paused"
  | "failed"
  | "completed"
  | "aborted";

export interface MacroExecution {
  macroId: string;
  status: MacroExecutionStatus;
  commandIndex: number;
  lockOwner?: string;
  lockExpiresAt?: number;
  context?: Record<string, unknown>;
  lastError?: string;
  updatedAt: number;
}

export type AppLogLevel = "info" | "warn" | "error";

export interface AppLogEntry {
  id: string;
  timestamp: number;
  level: AppLogLevel;
  scope: string;
  message: string;
  payload?: Record<string, unknown>;
}

export class AppDB extends Dexie {
  log!: Table<LogEntry, string>;
  dashboard!: Table<Dashboard, string>;
  inbox!: Table<InboxItem, string>;
  task_pool!: Table<TaskPoolItem, string>;
  scheduled!: Table<ScheduledItem, string>;
  selection_cache!: Table<SelectionCacheItem, string>;
  micro_tasks!: Table<MicroTaskItem, string>;
  alarm_queue!: Table<AlarmQueueItem, number>;
  change_log!: Table<ChangeLogEntry, string>;
  sync_state!: Table<SyncState, string>;
  resource!: Table<ResourceItem, string>;
  macro!: Table<MacroItem, string>;
  macro_execution!: Table<MacroExecution, string>;
  app_log!: Table<AppLogEntry, string>;
  // 🆕 新增 ics 相關 Table 宣告
  ics_sources!: Table<IcsSourceItem, string>;
  ics_events!: Table<IcsEventItem, string>;
  projects!: Table<ProjectItem, string>;

  constructor() {
    super("NonBlockingLife");
    this.version(1).stores({
      log: "id, timestamp, taskId, action, state, title",
      dashboard: "taskId, systemStatus",
      inbox: "taskId, receivedAt, title",
      task_pool:
        "taskId, status, project, priority, lastRunDate, title, note, url",
      scheduled: "taskId, status, nextRun, title",
      selection_cache: "taskId, score, source, title",
      micro_tasks: "taskId, status, lastRunDate, title",
      change_log: "id, table, recordId, op, status, createdAt",
      sync_state: "key",
      resource: "taskId, category, receivedAt, title",
    });

    this.version(2)
      .stores({
        log: "id, timestamp, taskId, action, state, title",
        dashboard: "taskId, systemStatus",
        inbox: "taskId, receivedAt, title",
        task_pool:
          "taskId, status, project, priority, lastRunDate, title, note, url",
        scheduled: "taskId, status, nextRun, title",
        selection_cache: "taskId, score, source, title",
        micro_tasks: "taskId, status, lastRunDate, title",
        change_log: "id, table, recordId, op, status, createdAt",
        sync_state: "key",
        resource: "taskId, category, receivedAt, title",
        macro: "taskId, name, updatedAt, createdAt",
        macro_execution: "macroId, status, lockOwner, lockExpiresAt, updatedAt",
        app_log: "id, timestamp, level, scope",
      })
      .upgrade(() => {
        // Reserved for future data backfill if macro-related defaults are needed.
      });

    this.version(3)
      .stores({
        log: "id, timestamp, taskId, action, state, title",
        dashboard: "taskId, systemStatus",
        inbox: "taskId, receivedAt, title",
        task_pool:
          "taskId, status, project, priority, lastRunDate, title, note, url",
        scheduled: "taskId, status, nextRun, title",
        selection_cache: "taskId, score, source, title",
        micro_tasks: "taskId, status, lastRunDate, title",
        alarm_queue:
          "++id, taskId, alarmAt, dedupeKey, state, createdAt, updatedAt",
        change_log: "id, table, recordId, op, status, createdAt",
        sync_state: "key",
        resource: "taskId, category, receivedAt, title",
        macro: "taskId, name, updatedAt, createdAt",
        macro_execution: "macroId, status, lockOwner, lockExpiresAt, updatedAt",
        app_log: "id, timestamp, level, scope",
      })
      .upgrade(() => {
        // Reserved for future alarm queue data backfill.
      });

    this.version(4)
      .stores({
        log: "id, timestamp, taskId, action, state, title",
        dashboard: "taskId, systemStatus",
        inbox: "taskId, receivedAt, title",
        task_pool:
          "taskId, status, project, priority, lastRunDate, title, note, url",
        scheduled: "taskId, status, nextRun, title, reminderOffsets",
        selection_cache: "taskId, score, source, title",
        micro_tasks: "taskId, status, lastRunDate, title",
        alarm_queue:
          "++id, taskId, alarmAt, dedupeKey, state, clockState, exactState, createdAt, updatedAt",
        change_log: "id, table, recordId, op, status, createdAt",
        sync_state: "key",
        resource: "taskId, category, receivedAt, title",
        macro: "taskId, name, updatedAt, createdAt",
        macro_execution: "macroId, status, lockOwner, lockExpiresAt, updatedAt",
        app_log: "id, timestamp, level, scope",
      })
      .upgrade((tx) => {
        // Pre-existing rows predate the TWA clock/exact-alarm sync feature, so nothing was ever sent.
        return tx
          .table("alarm_queue")
          .toCollection()
          .modify((item) => {
            item.clockState = item.clockState ?? "not_applicable";
            item.exactState = item.exactState ?? "not_applicable";
          });
      });

    this.version(5)
      .stores({
        log: "id, timestamp, taskId, action, state, title",
        dashboard: "taskId, systemStatus",
        inbox: "taskId, receivedAt, title",
        task_pool:
          "taskId, status, project, priority, lastRunDate, title, note, url",
        scheduled: "taskId, status, nextRun, title, reminderOffsets",
        selection_cache: "taskId, score, source, title",
        micro_tasks: "taskId, status, lastRunDate, title",
        alarm_queue:
          "++id, taskId, alarmAt, dedupeKey, state, clockState, exactState, createdAt, updatedAt",
        change_log: "id, table, recordId, op, status, createdAt",
        sync_state: "key",
        resource: "taskId, category, receivedAt, title",
        macro: "taskId, name, updatedAt, createdAt",
        macro_execution: "macroId, status, lockOwner, lockExpiresAt, updatedAt",
        app_log: "id, timestamp, level, scope",
        // 🆕 新增 ics 相關資料表
        ics_sources: "sourceId, enabled, updatedAt",
        ics_events: "eventId, sourceId, uid, startAt, [sourceId+uid]",
      })
      .upgrade(() => {
        // Reserved for future ics data backfill.
      });

    this.version(6)
      .stores({
        log: "id, timestamp, taskId, action, state, title",
        dashboard: "taskId, systemStatus",
        inbox: "taskId, receivedAt, title",
        task_pool:
          "taskId, status, project, priority, lastRunDate, title, note, url",
        scheduled: "taskId, status, nextRun, title, reminderOffsets",
        selection_cache: "taskId, score, source, title",
        micro_tasks: "taskId, status, lastRunDate, title",
        alarm_queue:
          "++id, taskId, alarmAt, dedupeKey, state, clockState, exactState, createdAt, updatedAt",
        change_log: "id, table, recordId, op, status, createdAt",
        sync_state: "key",
        resource: "taskId, category, receivedAt, title",
        macro: "taskId, name, updatedAt, createdAt",
        macro_execution: "macroId, status, lockOwner, lockExpiresAt, updatedAt",
        app_log: "id, timestamp, level, scope",
        // 🆕 新增 ics 相關資料表
        ics_sources: "sourceId, enabled, updatedAt",
        ics_events: "eventId, sourceId, title, uid, startAt, [sourceId+uid]",
        projects: "id, name, parentId, updatedAt",
      })
      .upgrade(() => {
        // Reserved for future ics data backfill.
      });
    
  }
}

export const db = new AppDB();

export const TASK_PREFIX = {
  task_pool: "T",
  micro_tasks: "t",
  scheduled: "S",
  resource: "R",
  ics_events: "ICS_",
};

export const LOG_ID_PREFIX = "log";
