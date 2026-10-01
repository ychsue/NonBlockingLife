import { satisfies } from "compare-versions";
import { db } from "../db/index";
import type { ChangeLogEntry } from "../db/schema";
import { useAppStore } from "../store/appStore";

export const SYNC_TABLES = [
  "task_pool",
  "scheduled",
  "micro_tasks",
  "inbox",
  "resource",
  "log",
  "macro",
  "ics_events",
  "ics_sources",
  "projects",
  "ics_export_configs",
  "global_settings",
] as const;

export type SyncTable = (typeof SYNC_TABLES)[number];

// 定義統一的 SyncEngine 介面
export interface ISyncManager {
  push(): Promise<{ success: number; failed: number; error?: string }>;
  pull(): Promise<{ success: number; error?: string }>;
  sync(): Promise<SyncResult>;
  resetAndPull(options?: ResetAndPullOptions): Promise<SyncResult>;
}

export type SyncOp = "add" | "update" | "delete";

/**
 * 同步結果類型
 */
export interface SyncResult {
  status: "success" | "error";
  pushed: number;
  pulled: number;
  conflicts?: any[];
  message?: string;
  timestamp: number;
}

/**
 * 推送操作類型（前端 -> GAS）
 */
interface PushOperation {
  type: SyncOp;
  table: SyncTable;
  recordId: string;
  data: Record<string, unknown>;
  timestamp: number;
  deviceId: string;
  operationId: string;
}

/**
 * 拉取變更類型（GAS -> 前端）
 */
interface PulledChange {
  table: string;
  recordId: string;
  data: Record<string, unknown>;
  timestamp: number;
  deleted: boolean;
  deviceId?: string;
  operationId?: string;
}

/**
 * GAS 響應類型
 */
interface GASResponse {
  status: string;
  error?: string;
  changes?: PulledChange[];
  results?: Array<{ success: boolean }>;
  message?: string; // ping 回傳的值之一
  version?: string; // ping 回傳的值之一
  timestamp?: number;
  counts?: Record<string, number>;
}

interface ResetAndPullOptions {
  includeLog?: boolean;
}

/**
 * 同步管理器 - 負責 PWA 與 GAS 的雙向同步
 */
export abstract class SyncManagerBase implements ISyncManager {
  protected lastSyncTimestamp = 0;
  protected deviceId: string = this.getOrCreateDeviceId();

  /**
   * 獲取或創建設備 ID（用於識別同步源）
   */
  public getOrCreateDeviceId(): string {
    const stored = localStorage.getItem("device-id");
    if (stored) return stored;

    const ua = navigator.userAgent.toLowerCase();
    const deviceType = /iphone|ipad|ipod/.test(ua)
      ? "ios"
      : /mac/.test(ua)
        ? "mac"
        : /win/.test(ua)
          ? "windows"
          : /android/.test(ua)
            ? "android"
            : "other";

    const newId = `device-${deviceType}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem("device-id", newId);
    return newId;
  }

  /**
   * 載入上次同步時間戳
   */
  public loadLastSyncTimestamp(): void {
    const stored = useAppStore.getState().lastRemoteSyncTime;
    this.lastSyncTimestamp = stored ?? 0;
  }

  /**
   * 保存上次同步時間戳
   */
  public saveLastSyncTimestamp(timestamp: number): void {
    this.lastSyncTimestamp = timestamp;
    useAppStore.getState().setLastRemoteSyncTime(timestamp);
  }

  abstract push(): Promise<{ success: number; failed: number; error?: string }>;

  /**
   * 從 GAS 拉取遠端變更
   *
   * 注意：Log 表只做單向推送，不從雲端拉回（用戶在 Google Sheets 自行分析）
   */
  abstract pull(): Promise<{ success: number; error?: string }>;

  /**
   * 完整雙向同步（先推後拉）
   */
  async sync(): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      const pushResult = await this.push();
      if (pushResult.error) {
        return {
          status: "error",
          pushed: 0,
          pulled: 0,
          message: `推送失敗: ${pushResult.error}`,
          timestamp: Date.now(),
        };
      }

      const pullResult = await this.pull();
      if (pullResult.error) {
        return {
          status: "error",
          pushed: pushResult.success,
          pulled: 0,
          message: `拉取失敗: ${pullResult.error}`,
          timestamp: Date.now(),
        };
      }

      return {
        status: "success",
        pushed: pushResult.success,
        pulled: pullResult.success,
        message: `同步完成 (${Date.now() - startTime}ms)`,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        status: "error",
        pushed: 0,
        pulled: 0,
        message: `同步出錯: ${String(error)}`,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * 清空本地資料（不含 Log），再從 GAS 完整拉取（用於設備遷移或資料還原）
   * ⚠️ 危險操作：本地未同步的資料將遺失
   */
  async resetAndPull(options: ResetAndPullOptions = {}): Promise<SyncResult> {
    const startTime = Date.now();
    const includeLog = options.includeLog === true;

    try {
      const txTables = includeLog
        ? [
            db.task_pool,
            db.scheduled,
            db.micro_tasks,
            db.inbox,
            db.resource,
            db.macro,
            db.selection_cache,
            db.dashboard,
            db.change_log,
            db.sync_state,
            db.ics_events,
            db.ics_sources,
            db.projects,
            db.ics_export_configs,
            db.global_settings,
            db.log,
          ]
        : [
            db.task_pool,
            db.scheduled,
            db.micro_tasks,
            db.inbox,
            db.resource,
            db.macro,
            db.selection_cache,
            db.dashboard,
            db.change_log,
            db.sync_state,
            db.ics_events,
            db.ics_sources,
            db.projects,
            db.ics_export_configs,
            db.global_settings,
          ];

      await db.transaction("rw", txTables, async () => {
        const clearOps: Array<Promise<unknown>> = [
          db.task_pool.clear(),
          db.scheduled.clear(),
          db.micro_tasks.clear(),
          db.inbox.clear(),
          db.resource.clear(),
          db.macro.clear(),
          db.selection_cache.clear(),
          db.dashboard.clear(),
          db.change_log.clear(),
          db.sync_state.clear(),
          db.ics_events.clear(),
          db.ics_sources.clear(),
          db.ics_export_configs.clear(),
          db.global_settings.clear(),
          db.projects.clear(),
        ];

        // Log 預設保留，僅在使用者勾選時才清除。
        if (includeLog) {
          clearOps.push(db.log.clear());
        }

        await Promise.all(clearOps);
      });

      // 重置同步時間戳，確保拉取全部資料
      this.lastSyncTimestamp = 0;
      useAppStore.getState().setLastRemoteSyncTime(null);

      // 從 GAS 拉取所有資料
      const pullResult = await this.pull();
      if (pullResult.error) {
        return {
          status: "error",
          pushed: 0,
          pulled: 0,
          message: `還原失敗: ${pullResult.error}`,
          timestamp: Date.now(),
        };
      }

      return {
        status: "success",
        pushed: 0,
        pulled: pullResult.success,
        message: `還原完成，已從雲端載入 ${pullResult.success} 筆資料${includeLog ? "（含清除 Log）" : "（保留 Log）"} (${Date.now() - startTime}ms)`,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        status: "error",
        pushed: 0,
        pulled: 0,
        message: `還原出錯: ${String(error)}`,
        timestamp: Date.now(),
      };
    }
  }

  protected isSyncTable(table: string): table is SyncTable {
    return (SYNC_TABLES as readonly string[]).includes(table);
  }

  protected normalizeOp(op: ChangeLogEntry["op"]): SyncOp {
    if (op === "add" || op === "update" || op === "delete") return op;
    return "update";
  }

  protected async getLocalRecord(
    table: SyncTable,
    recordId: string,
  ): Promise<unknown> {
    return await db.table(table).get(recordId);
  }

}
