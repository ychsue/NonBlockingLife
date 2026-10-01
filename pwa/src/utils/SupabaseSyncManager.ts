import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { buildChangeLogId, CHANGE_LOG_STATUS, db } from "../db/index";
import {
  type SyncResult,
  type SyncTable,
  type ISyncManager,
  SyncManagerBase,
  SYNC_TABLES,
} from "./syncUtils";
import { parseEnvString } from "./parseEnvString";
import _ from "lodash";
import { ChangeLogEntry } from "../db/schema";
import { useAppStore } from "../store/appStore";

const CLIENT_ID = "SupabaseSyncManager";

export class SupabaseSyncManager extends SyncManagerBase {
  private supabase: SupabaseClient;

  constructor(urlKeyPair: string) {
    super();
    try {
      const { url, key } = getUrlAndKey(urlKeyPair);
      this.supabase = createClient(url, key);
      this.deviceId = this.getOrCreateDeviceId();
      this.loadLastSyncTimestamp();
    } catch (error) {
      console.error("Failed to initialize Supabase client:", error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("log")
      .select("*")
      .limit(1);
    return !error;
  }

  /**
   * 推送本地 change_log 到 Supabase
   */
  async push(
    changes?: ChangeLogEntry[],
  ): Promise<{ success: number; failed: number; error?: string }> {
    try {
      const pendingChanges =
        changes ??
        (await db.change_log.where("status").equals("pending").toArray());

      if (pendingChanges.length === 0) return { success: 0, failed: 0 };

      // 1. 過濾出支援雲端同步的 Table
      const syncableChanges = pendingChanges.filter((c) =>
        this.isSyncTable(c.table),
      );
      let successCount = 0;
      const now = Date.now();
      // 使用 lodash 將變更按 table 分組，然後再分成 delete 與其他操作，方便批次處理
      const groupedByTable = _.groupBy(syncableChanges, "table");
      const deleteChangesByTable: Record<string, ChangeLogEntry[]> = {};
      const otherChangesByTable: Record<string, ChangeLogEntry[]> = {};

      for (const [table, changes] of Object.entries(groupedByTable)) {
        deleteChangesByTable[table] = changes.filter((c) => c.op === "delete");
        otherChangesByTable[table] = changes.filter((c) => c.op !== "delete");
      }
      // delete 的部分使用 .delete().in([ids]) 來刪除
      for (const [table, deleteChanges] of Object.entries(
        deleteChangesByTable,
      )) {
        if (deleteChanges.length > 0) {
          const ids = deleteChanges.map((c) => c.recordId);
          const primaryKey = this.getPrimaryKeyName(table as SyncTable);
          // const { error } = await this.supabase
          //   .from(table)
          //   .delete()
          //   .in(primaryKey, ids);
          // 應該改為將他們的 deleted 設為 true，而不是直接刪除
          const { error } = await this.supabase
            .from(table)
            .update({ deleted: true , synced_at: now})
            .in(primaryKey, ids);

          if (!error) {
            successCount += deleteChanges.length;
            for (const c of deleteChanges) {
              await db.change_log.update(c.id, {
                status: "synced",
                syncedAt: Date.now(),
              });
            }
          } else {
            console.error("Failed to delete records from table", table, error);
            for (const c of deleteChanges) {
              await db.change_log.update(c.id, {
                retryCount: (c.retryCount ?? 0) + 1,
              });
            }
          }
        }
      }
      // 其他操作的部分使用 upsert 來處理
      for (const [table, otherChanges] of Object.entries(otherChangesByTable)) {
        if (otherChanges.length > 0) {
          const primaryKey = this.getPrimaryKeyName(table as SyncTable);
          const records = [];
          for (const c of otherChanges) {
            const localRecord = await db
              .table(table as SyncTable)
              .get(c.recordId);
            if (table === "log") {
              if (localRecord) {
                delete localRecord.updatedAt;
                localRecord.task_id = localRecord.taskId;
                delete localRecord.taskId;
              } else {
                if (c.patch) {
                  c.patch.task_id = c.patch.taskId;
                  delete c.patch.taskId;
                }
              }
              records.push({
                ...(localRecord ?? c.patch ?? {}),
                [primaryKey]: c.recordId,
                updated_at: c.createdAt,
                device_id: this.deviceId,
                operation_id: c.id,
                synced_at: now,
              });
            } else {
              records.push({
                [primaryKey]: c.recordId,
                data: localRecord ?? c.patch ?? {},
                updated_at: c.createdAt,
                device_id: this.deviceId,
                operation_id: c.id,
                synced_at: now,
              });
            }
          }
          const { error } = await this.supabase.from(table).upsert(records);
          if (!error) {
            successCount += otherChanges.length;
            for (const c of otherChanges) {
              await db.change_log.update(c.id, {
                status: "synced",
                syncedAt: Date.now(),
              });
            }
          } else {
            console.error("Failed to upsert records into table", table, error);
            for (const c of otherChanges) {
              await db.change_log.update(c.id, {
                retryCount: (c.retryCount ?? 0) + 1,
              });
            }
          }

          // 更新 pendingChangeLogs
          const pending = await db.change_log
            .where({ status: "pending" })
            .toArray();
          useAppStore.getState().setPendingChangeLogs(pending);
        }
      }

      return {
        success: successCount,
        failed: syncableChanges.length - successCount,
      };
    } catch (error) {
      console.error("Supabase Push 失敗:", error);
      return { success: 0, failed: -1, error: String(error) };
    }
  }

  /**
   * 從 Supabase 拉取最新變更
   */
  async pull(): Promise<{ success: number; error?: string }> {
    try {
      const lastSync = this.lastSyncTimestamp;
      const tables: SyncTable[] = [
        "task_pool",
        "scheduled",
        "micro_tasks",
        "inbox",
        "resource",
        "macro",
        "ics_events",
        "ics_sources",
        "projects",
        "ics_export_configs",
        "global_settings",
      ]; // 注意：Log 保持單向推送，不從雲端 pull

      let mergedCount = 0;
      const nowSyncTime = Date.now();

      for (const table of tables) {
        // 利用 PostgreSQL 的 synced_at 進行增量拉取
        const { data, error } = await this.supabase
          .from(table)
          .select("*")
          .gt("synced_at", lastSync);

        if (error) {
          if (error.message.indexOf("Failed to fetch")) {
            throw error;
          }
          continue;
        }

        for (const row of data) {
          const record =
            table === "log"
              ? row
              : {
                  ...row.data,
                  taskId: row.data.taskId,
                  updatedAt: row.updated_at,
                };

          const primaryKey = this.getPrimaryKeyName(table);
          if (!record[primaryKey]) {
            record[primaryKey] = row[primaryKey];
          }

          if (row.deleted) {
            await db.table(table).delete(row[primaryKey]);
          } else {
            await db.table(table).put(record);
          }
          mergedCount++;
        }
      }

      this.saveLastSyncTimestamp(nowSyncTime);
      return { success: mergedCount };
    } catch (error) {
      console.error("Supabase Pull 失敗:", error);
      return { success: 0, error: String(error) };
    }
  }

  async allTablesToSupabase(): Promise<{
    success: number;
    failed: number;
    error?: string;
  }> {
    try {
      const tables = SYNC_TABLES;

      const now = Date.now();

      // 將所有表的數據轉換為變更日誌條目
      const turnTablesToChangeLogEntries: ChangeLogEntry[] = [];
      for (const table of tables) {
        const records = await db.table(table).toArray();
        for (const record of records) {
          turnTablesToChangeLogEntries.push({
            id: buildChangeLogId(
              now,
              table,
              record[this.getPrimaryKeyName(table, "local")],
            ),
            clientId: CLIENT_ID,
            table,
            recordId: record[this.getPrimaryKeyName(table, "local")],
            op: "update",
            createdAt: now,
            status: CHANGE_LOG_STATUS.pending,
            retryCount: 0,
            syncedAt: null,
          });
        }
      }
      // 將變更日誌條目批量上傳到 Supabase
      const { success, failed, error } = await this.push(
        turnTablesToChangeLogEntries,
      );

      return { success, failed, error };
    } catch (error) {
      console.error("Supabase 全表上傳失敗:", error);
      return { success: 0, failed: 0, error: String(error) };
    }
  }

  // 輔助：自動取得各 Table 的 Primary Key 名稱
  private getPrimaryKeyName(
    table: SyncTable,
    isFor: "local" | "supabase" = "supabase",
  ): string {
    if (isFor === "local") {
      if (table === "ics_events") return "eventId";
      if (table === "ics_sources") return "sourceId";
      if (table === "log") return "id";
      if (["projects", "ics_export_configs"].includes(table)) return "id";
      if (table === "global_settings") return "key";
      return "taskId";
    } else if (isFor === "supabase") {
      if (table === "ics_events") return "event_id";
      if (table === "ics_sources") return "source_id";
      if (table === "log") return "id";
      if (["projects", "ics_export_configs"].includes(table)) return "id";
      if (table === "global_settings") return "key";
      return "task_id";
    } else {
      throw new Error(`Unsupported isFor value: ${isFor}`);
    }
  }

  /* 包含 getOrCreateDeviceId, saveLastSyncTimestamp, sync, resetAndPull 等維持與原本 SyncManager 相同邏輯 */
}

/**
 * 輔助函數：從 localStorage 讀取 Supabase URL and Key
 */
export function getStoredSupabaseUrlKey(): string {
  return localStorage.getItem("supabase-url-key") || "";
}

/**
 * 輔助函數：保存 Supabase URL and Key 到 localStorage
 */
export function saveSupabaseUrlKey(urlKey: string): void {
  localStorage.setItem("supabase-url-key", urlKey);
}

/**
 * 輔助函數：清除 Supabase URL and Key（用於重新配置）
 */
export function clearSupabaseUrlKey(): void {
  localStorage.removeItem("supabase-url-key");
}

export function getUrlAndKey(urlKeyPair: string) {
  const jsonData = parseEnvString(urlKeyPair);
  const result = { url: "", key: "" };
  _.forEach(jsonData, (value, key) => {
    if (key.toLowerCase().indexOf("url") !== -1) result.url = value;
    if (key.toLowerCase().indexOf("key") !== -1) result.key = value;
  });
  if (!result.url || !result.key) {
    throw new Error("Invalid Supabase URL or Key");
  }
  return result;
}
