import { createClient, PostgrestError, SupabaseClient } from "@supabase/supabase-js";
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
import { logError, logInfo } from "./logger";
import { sleep } from "./timeUtils";

const CLIENT_ID = "SupabaseSyncManager";
const PULL_CURSOR_KEY = "supabase:pull-cursor";
const PUSH_BATCH_SIZE = 100;

interface PushGroup {
  table: SyncTable;
  recordId: string;
  changes: ChangeLogEntry[];
  operationId: string;
  op: ChangeLogEntry["op"];
  expectedVersion: number;
  data: Record<string, unknown>;
}

interface PushRpcResult {
  operationId: string;
  status: "success" | "conflict" | "rejected";
  serverVersion?: number;
  serverData?: Record<string, unknown>;
  deleted?: boolean;
  syncedAt?: number;
  error?: string;
}

interface PullRpcChange {
  seq: number;
  table: string;
  recordId: string;
  data: Record<string, unknown>;
  deleted: boolean;
  serverVersion: number;
}

interface PullRpcResult {
  changes: PullRpcChange[];
  nextCursor: number;
  throughCursor: number;
  hasMore: boolean;
}

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

  async fetchIcs(url: string): Promise<{ icsContent: string }> {
    try {
      await logInfo("Supabase Fetch ICS Start:", "Start");
      const res = await this.supabase.functions.invoke("fetch-ics", {
        body: { icsUrl: url },
      });
      const data = res.data;
      await logInfo("Supabase Fetch ICS finished:", "Done");
      return { icsContent: data };
    } catch (error) {
      await logError("Supabase Fetch ICS 失敗:", "Fail", error as any);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    // 測試與 Supabase 的連線是否正常，並且確定版本號是否為 2.0.0
    await logInfo("Supabase Test Connection Start:", "Start");
    const { data, error } = await this.supabase.rpc("fetch_global_settings");
    if (error) {
      console.error("Failed to fetch global settings:", error);
      alert(
        "Failed to fetch global settings from Supabase. Please check your connection and try again.",
      );
      await logError("Supabase Test Connection 失敗:", "Fail", error as any);
      return false;
    }
    if (_.isArray(data)) {
      const expectedVersion = "2.0.0";
      const setting = data.find(
        (item) => item.key === "supabase_schema_version",
      );
      if (!setting || setting.data.version !== expectedVersion) {
        console.error("Invalid global settings or version mismatch:", data);
        alert(
          `Version mismatch: expected ${expectedVersion}, got ${setting?.data.version}. You need to run new initialize.sql on your Supabase instance.`,
        );
        return false;
      }
    }
    await logInfo("Supabase Test Connection finished:", "Done");
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

      const syncableChanges = pendingChanges.filter((c) =>
        this.isSyncTable(c.table),
      );
      await logInfo("SupabaseSync Push Start:", `length: ${syncableChanges?.length}`);
      const groups = await this.createPushGroups(syncableChanges);
      const result = await this.pushGroups(groups, true);
      const pending = await db.change_log
        .where({ status: "pending" })
        .toArray();
      useAppStore.getState().setPendingChangeLogs(pending);
      await logInfo("SupabaseSync Push finished:", "Done");
      return result;
    } catch (error) {
      console.error("Supabase Push 失敗:", error);
      await logError("SupabaseSync Push 失敗:", "Fail", error as any);
      return { success: 0, failed: -1, error: String(error) };
    }
  }

  /**
   * 拉取 Supabase 變更，並在本機套用成功後保存伺服器游標。
   */
  async pull(): Promise<{ success: number; error?: string }> {
    try {
      await logInfo("SupabaseSync Pull Start:", "Start");
      let cursor = await this.getPullCursor();
      let throughCursor: number | null = null;
      let mergedCount = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await this.supabase.rpc("pull_sync_changes", {
          p_after_cursor: cursor,
          p_through_cursor: throughCursor,
          p_limit: 500,
        });
        if (error) throw error;

        const page = data as PullRpcResult;
        if (
          !page ||
          !Array.isArray(page.changes) ||
          !Number.isSafeInteger(page.nextCursor) ||
          !Number.isSafeInteger(page.throughCursor) ||
          page.nextCursor < cursor ||
          page.nextCursor > page.throughCursor ||
          typeof page.hasMore !== "boolean"
        ) {
          throw new Error("Invalid pull_sync_changes response");
        }

        throughCursor = page.throughCursor;
        for (const change of page.changes) {
          if (!this.isSyncTable(change.table) || change.table === "log") {
            throw new Error(
              `Unsupported table in change feed: ${change.table}`,
            );
          }
          await this.applyPulledChange(change);
          mergedCount++;
        }

        cursor = page.nextCursor;
        await db.sync_state.put({ key: PULL_CURSOR_KEY, value: cursor });
        hasMore = page.hasMore;
      }

      this.saveLastSyncTimestamp(Date.now());
      await logInfo("SupabaseSync Pull finished:", "Done");
      return { success: mergedCount };
    } catch (error) {
      console.error("Supabase Pull 失敗:", error);
      await logError("SupabaseSync Pull 失敗:", "Fail", error as any);
      return {
        success: 0,
        error: String(error),
      };
    }
  }

  /**
   * Supabase uses pull-before-push; GAS retains the legacy ordering in the base class.
   */
  async sync(): Promise<SyncResult> {
    const locale = useAppStore.getState().locale;
    const labels = {
      "zh-TW": {
        pullFailed: "拉取失敗",
        pushFailed: "推送失敗",
        completed: "同步完成",
        conflict: "筆變更衝突或遭拒",
      },
      en: {
        pullFailed: "Pull failed",
        pushFailed: "Push failed",
        completed: "Sync completed",
        conflict: "change(s) conflicted or were rejected",
      },
      ja: {
        pullFailed: "プル失敗",
        pushFailed: "プッシュ失敗",
        completed: "同期完了",
        conflict: "件の変更が競合または拒否されました",
      },
    }[locale];
    const startTime = Date.now();
    const pullResult = await this.pull();
    if (pullResult.error) {
      return {
        status: "error",
        pushed: 0,
        pulled: 0,
        message: `${labels.pullFailed}: ${pullResult.error}`,
        timestamp: Date.now(),
      };
    }

    if ((window as any).isFlatpak) await sleep(1000); // 看看這個 delay 能否治好 flatpak 會掛掉的問題。

    const pushResult = await this.push();
    if (pushResult.error || pushResult.failed > 0) {
      return {
        status: "error",
        pushed: pushResult.success,
        pulled: pullResult.success,
        message: `${labels.pushFailed}: ${pushResult.error ?? `${pushResult.failed} ${labels.conflict}`}`,
        timestamp: Date.now(),
      };
    }

    return {
      status: "success",
      pushed: pushResult.success,
      pulled: pullResult.success,
      message: `${labels.completed} (${Date.now() - startTime}ms)`,
      timestamp: Date.now(),
    };
  }

  private async createPushGroups(
    changes: ChangeLogEntry[],
  ): Promise<PushGroup[]> {
    const grouped = _.groupBy(changes, (change) =>
      JSON.stringify([change.table, change.recordId]),
    );
    const groups: PushGroup[] = [];

    for (const entries of Object.values(grouped)) {
      const ordered = entries.slice().sort((a, b) => a.createdAt - b.createdAt);
      const latest = ordered[ordered.length - 1];
      if (!this.isSyncTable(latest.table)) continue;

      const localRecord = await db.table(latest.table).get(latest.recordId);
      const patch = Object.assign(
        {},
        ...ordered.map((entry) => entry.patch ?? {}),
      );
      const record =
        localRecord && typeof localRecord === "object"
          ? { ...(localRecord as Record<string, unknown>) } // 因為先前就已經修改db上的資料，changelog是要sync的，所以要以localRecord為主，無須再套用 patch
          : { ...patch }; // 如果 localRecord 不存在，則使用 patch 作為資料來源，因為代表有一個新增出現
      const op =
        !localRecord && latest.op === "bulkdelete"
          ? "delete"
          : this.normalizeOp(latest.op);

      if (latest.table === "log") {
        delete record.updatedAt;
        if ("taskId" in record) {
          record.task_id = record.taskId;
          delete record.taskId;
        }
      }

      groups.push({
        table: latest.table,
        recordId: latest.recordId,
        changes: ordered,
        operationId: latest.id,
        op,
        expectedVersion:
          latest.table === "log"
            ? 0
            : await this.getServerVersion(latest.table, latest.recordId),
        data: record,
      });
    }

    return groups;
  }

  private async pushGroups(
    groups: PushGroup[],
    retryConflicts: boolean,
  ): Promise<{ success: number; failed: number; error?: string }> {
    let successCount = 0;
    let failedCount = 0;
    const retryGroups: PushGroup[] = [];

    for (let offset = 0; offset < groups.length; offset += PUSH_BATCH_SIZE) {
      const batch = groups.slice(offset, offset + PUSH_BATCH_SIZE);
      await logInfo("Supabase Push Batch Start:", `length: ${batch.length}`);

      // 試著嘗試最多3次push_sync_changes，中間隔個 500ms 看看能否使 flatpak 成功率提昇
      let data: any = null;
      let error: PostgrestError | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        logInfo(`Supabase Push Batch Attempt ${attempt + 1}`, "Start");
        const res = await this.supabase.rpc("push_sync_changes", {
          p_changes: batch.map((group) => ({
            table: group.table,
            recordId: group.recordId,
            operationId: group.operationId,
            op: group.op,
            expectedVersion: group.expectedVersion,
            data: group.data,
            deviceId: this.deviceId,
          })),
        });
        data = res.data;
        error = res.error;
        if (!error || attempt === 2) {
          break;
        }
        await sleep(500);
      }

      if (error) {
        await logError("Supabase Push Batch 失敗:", "Fail", error as any);
        for (const group of batch) {
          await this.incrementRetryCount(group.changes);
        }
        return {
          success: successCount,
          failed:
            failedCount +
            batch.reduce((sum, group) => sum + group.changes.length, 0),
          error: error.message,
        };
      }
      await logInfo("Supabase Push Batch finished:", "Done");

      const results = (data as { results?: PushRpcResult[] } | null)?.results;
      if (!Array.isArray(results)) {
        return {
          success: successCount,
          failed:
            failedCount +
            batch.reduce((sum, group) => sum + group.changes.length, 0),
          error: "Invalid push_sync_changes response",
        };
      }

      for (const group of batch) {
        const result = results.find(
          (item) => item.operationId === group.operationId,
        );
        if (result?.status === "success") {
          if (group.table !== "log") {
            if (
              typeof result.serverVersion !== "number" ||
              !Number.isSafeInteger(result.serverVersion)
            ) {
              throw new Error(
                `Missing server version for ${group.operationId}`,
              );
            }
            await this.saveServerVersion(
              group.table,
              group.recordId,
              result.serverVersion,
            );
          }
          await this.markChangesSynced(group.changes);
          successCount += group.changes.length;
        } else if (
          result?.status === "conflict" &&
          retryConflicts &&
          Number.isSafeInteger(result.serverVersion)
        ) {
          await this.rebaseConflictedGroup(group, result);
          retryGroups.push(group);
        } else {
          failedCount += group.changes.length;
          await this.incrementRetryCount(group.changes);
        }
      }
    }

    if (retryGroups.length > 0) {
      const retryResult = await this.pushGroups(retryGroups, false);
      successCount += retryResult.success;
      failedCount += retryResult.failed;
      if (retryResult.error) {
        return {
          success: successCount,
          failed: failedCount,
          error: retryResult.error,
        };
      }
    }

    return { success: successCount, failed: failedCount };
  }

  private async rebaseConflictedGroup(
    group: PushGroup,
    result: PushRpcResult,
  ): Promise<void> {
    if (typeof result.serverVersion !== "number") {
      throw new Error(
        `Missing server version for conflict ${group.operationId}`,
      );
    }
    const serverData = result.serverData ?? {};
    const rebased = Object.assign(
      {},
      serverData,
      ...group.changes.map((change) => change.patch ?? {}),
    );

    group.expectedVersion = result.serverVersion;
    if (group.op !== "delete") {
      group.data = rebased;
      const primaryKey = this.getPrimaryKeyName(group.table, "local");
      group.data[primaryKey] = group.recordId;
      await db.table(group.table).put(group.data);
    }
    await this.saveServerVersion(
      group.table,
      group.recordId,
      result.serverVersion,
    );
  }

  private async applyPulledChange(change: PullRpcChange): Promise<void> {
    const table = change.table as SyncTable;
    const pending = await db.change_log
      .where("table")
      .equals(table)
      .and(
        (entry) =>
          entry.recordId === change.recordId && entry.status === "pending",
      )
      .count();

    if (pending > 0) {
      // 如果 table 為 task_pool，該Id為 change.recordId，然後她的 lastRunDate < change 的，則應該處理
      if (table === "task_pool" && change.data?.lastRunDate) {
        const localRecord = await db.table("task_pool").get(change.recordId);
        if (localRecord?.lastRunDate >= change.data.lastRunDate) {
          return; // 本地的 lastRunDate 更新，不需要應用拉取的變更
        }
        // 如果 task_pool 的 lastRunDate 小於拉取的變更，則應該處理
      } else return; // TODO 若有待同步的本地更改，是否應該跳過應用拉取的變更？
    }
    if (change.deleted) {
      await db.table(table).delete(change.recordId);
    } else {
      const record = { ...change.data };
      const primaryKey = this.getPrimaryKeyName(table, "local");
      record[primaryKey] = change.recordId;
      await db.table(table).put(record);
    }

    await this.saveServerVersion(table, change.recordId, change.serverVersion);
  }

  private async getPullCursor(): Promise<number> {
    const entry = await db.sync_state.get(PULL_CURSOR_KEY);
    const value = entry?.value;
    return typeof value === "number" && Number.isSafeInteger(value) ? value : 0;
  }

  private getServerVersionKey(table: SyncTable, recordId: string): string {
    return `supabase:version:${JSON.stringify([table, recordId])}`;
  }

  private async getServerVersion(
    table: SyncTable,
    recordId: string,
  ): Promise<number> {
    const entry = await db.sync_state.get(
      this.getServerVersionKey(table, recordId),
    );
    return typeof entry?.value === "number" && Number.isSafeInteger(entry.value)
      ? entry.value
      : 0;
  }

  private async saveServerVersion(
    table: SyncTable,
    recordId: string,
    version: number,
  ): Promise<void> {
    await db.sync_state.put({
      key: this.getServerVersionKey(table, recordId),
      value: version,
    });
  }

  private async markChangesSynced(changes: ChangeLogEntry[]): Promise<void> {
    const syncedAt = Date.now();
    await Promise.all(
      changes.map((change) =>
        db.change_log.update(change.id, {
          status: "synced",
          syncedAt,
        }),
      ),
    );
  }

  private async incrementRetryCount(changes: ChangeLogEntry[]): Promise<void> {
    await Promise.all(
      changes.map((change) =>
        db.change_log.update(change.id, {
          retryCount: (change.retryCount ?? 0) + 1,
        }),
      ),
    );
  }

  public async getGlobalSettings(): Promise<any[]> {
    try {
      await logInfo("Supabase Get Global Settings Start:", "Start");
      const settings = await this.supabase.rpc("fetch_global_settings");
      await logInfo("Supabase Get Global Settings finished:", "Done");
      return settings.data ?? [];
    } catch (error) {
      await logError("Supabase Get Global Settings 失敗:", "Fail", error as any);
      throw error;
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
