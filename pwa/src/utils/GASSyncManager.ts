import { satisfies } from "compare-versions";
import { db } from "../db/index";
import type { ChangeLogEntry } from "../db/schema";
import { useAppStore } from "../store/appStore";
import {
  SyncOp,
  SyncTable,
  ISyncManager,
  SyncResult,
  SyncManagerBase,
  SYNC_TABLES,
} from "./syncUtils";

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
export class GASSyncManager extends SyncManagerBase {
  private gasUrl: string;

  constructor(gasUrl: string) {
    super();
    this.gasUrl = gasUrl;
    this.deviceId = this.getOrCreateDeviceId();
    this.loadLastSyncTimestamp();
  }

  /**
   * 測試 GAS 連接
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.gasUrl}?action=ping`, {
        cache: "no-store",
      });
      const data = (await response.json()) as GASResponse;
      if (
        !!!satisfies(import.meta.env.__APP_VERSION__, data.version ?? "0.0.0")
      ) {
        confirm(
          `⚠️ 版本不匹配(Versions do not match)：前端 ${import.meta.env.__APP_VERSION__}，GAS "${data.version}"。請更新 GAS 腳本。`,
        );
      }
      return data.status === "ok";
    } catch (error) {
      confirm(`⚠️ GAS 連接失敗，有可能網路斷線`);
      console.error("GAS 連接測試失敗:", error);
      return false;
    }
  }

  /**
   * 獲取同步狀態
   */
  async getSyncStatus(): Promise<GASResponse | null> {
    try {
      const response = await fetch(`${this.gasUrl}?action=sync-status`);
      return (await response.json()) as GASResponse;
    } catch (error) {
      console.error("獲取同步狀態失敗:", error);
      return null;
    }
  }

  /**
   * 上傳本地未同步變更到 GAS
   */
  async push(): Promise<{ success: number; failed: number; error?: string }> {
    try {
      const pendingChanges = await db.change_log
        .where("status")
        .equals("pending")
        .toArray();

      if (pendingChanges.length === 0) {
        return { success: 0, failed: 0 };
      }

      // 本地專用表不進雲端，直接標記已同步避免 change_log 積壓
      const localOnlyChanges = pendingChanges.filter(
        (c) => !this.isSyncTable(c.table),
      );
      if (localOnlyChanges.length > 0) {
        await Promise.all(
          localOnlyChanges.map((c) =>
            db.change_log.update(c.id, {
              status: "synced",
              syncedAt: Date.now(),
            }),
          ),
        );
      }

      const syncableChanges = pendingChanges.filter((c) =>
        this.isSyncTable(c.table),
      );
      if (syncableChanges.length === 0) {
        return { success: 0, failed: 0 };
      }

      const operations = await Promise.all(
        syncableChanges.map((change) => this.transformToOperation(change)),
      );

      const response = await fetch(this.gasUrl, {
        method: "POST",
        // 不設 application/json，避免 GAS CORS preflight 問題
        body: JSON.stringify({ operations }),
      });

      const result = (await response.json()) as GASResponse;
      if (result.status === "error") {
        return {
          success: 0,
          failed: syncableChanges.length,
          error: result.error,
        };
      }

      const opResults = result.results ?? [];
      let successCount = 0;

      for (let i = 0; i < syncableChanges.length; i++) {
        const ok = Boolean(opResults[i]?.success);
        if (ok) {
          successCount += 1;
          await db.change_log.update(syncableChanges[i].id, {
            status: "synced",
            syncedAt: Date.now(),
          });
        } else {
          await db.change_log.update(syncableChanges[i].id, {
            retryCount: (syncableChanges[i].retryCount || 0) + 1,
          });
        }
      }

      // 更新 pendingChangeLogs
      const pending = await db.change_log
        .where({ status: "pending" })
        .toArray();
      useAppStore.getState().setPendingChangeLogs(pending);

      return {
        success: successCount,
        failed: syncableChanges.length - successCount,
      };
    } catch (error) {
      console.error("上傳失敗:", error);
      return { success: 0, failed: -1, error: String(error) };
    }
  }

  /**
   * 從 GAS 拉取遠端變更
   *
   * 注意：Log 表只做單向推送，不從雲端拉回（用戶在 Google Sheets 自行分析）
   */
  async pull(): Promise<{ success: number; error?: string }> {
    try {
      let lastSync = this.lastSyncTimestamp;
      const url = `${this.gasUrl}?action=pull&lastSync=${lastSync}`;
      const response = await fetch(url);
      const result = (await response.json()) as GASResponse;

      if (result.status === "error") {
        return { success: 0, error: result.error };
      }

      const changes = result.changes ?? [];
      let mergedCount = 0;

      for (const change of changes) {
        // 跳過 log 表（單向推送，不拉回）
        if (change.table === "log") {
          console.log("跳過 log 表拉取:", change.recordId);
          continue;
        }

        await this.mergeRemoteChange(change);
        mergedCount++;
      }

      if (result.timestamp) {
        this.saveLastSyncTimestamp(result.timestamp);
      }

      return { success: mergedCount };
    } catch (error) {
      console.error("拉取失敗:", error);
      return { success: 0, error: String(error) };
    }
  }

  /**
   * change_log 條目轉為 GAS 操作
   */
  private async transformToOperation(
    change: ChangeLogEntry,
  ): Promise<PushOperation> {
    if (!this.isSyncTable(change.table)) {
      throw new Error(`Unsupported sync table: ${change.table}`);
    }

    // const logs = await db.table('log').toArray()
    // Q: log 的 recordId 不是他的idㄟ？
    const localRecord = await this.getLocalRecord(
      change.table,
      change.recordId,
    );

    return {
      type: this.normalizeOp(change.op),
      table: change.table,
      recordId: change.recordId,
      // update 也盡量送完整記錄，避免遠端只拿到 patch
      data:
        (localRecord as Record<string, unknown> | undefined) ??
        change.patch ??
        {},
      timestamp: change.createdAt,
      deviceId: this.deviceId,
      operationId: change.id,
    };
  }

  /**
   * 合併遠端變更到本地
   */
  private async mergeRemoteChange(change: PulledChange): Promise<void> {
    const table = change.table;
    if (!this.isSyncTable(table)) return;

    const record = {
      ...change.data,
      updatedAt: change.timestamp,
    } as Record<string, unknown>;

    let primaryKey = "taskId";
    if (table === "ics_events") {
      primaryKey = "eventId";
    } else if (table === "ics_sources") {
      primaryKey = "sourceId";
    } else if (table === "log") {
      primaryKey = "id";
    } else if (["projects", "ics_export_configs"].includes(table)) {
      primaryKey = "id";
    } else if (table === "global_settings") {
      primaryKey = "key";
    }

    if (!record[primaryKey]) {
      record[primaryKey] = change.recordId;
    }

    if (change.deleted) {
      await db.table(table).delete(change.recordId);
      return;
    }

    await db.table(table).put(record);
  }
}

/**
 * 輔助函數：從 localStorage 讀取 GAS URL
 */
export function getStoredGasUrl(): string {
  return localStorage.getItem("gas-web-app-url") || "";
}

/**
 * 輔助函數：保存 GAS URL 到 localStorage
 */
export function saveGasUrl(url: string): void {
  localStorage.setItem("gas-web-app-url", url);
}

/**
 * 輔助函數：清除 GAS URL（用於重新配置）
 */
export function clearGasUrl(): void {
  localStorage.removeItem("gas-web-app-url");
}
