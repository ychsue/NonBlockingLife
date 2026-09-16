import { mapUnifiedPatchToIcsEventPatch } from "../utils/icsAdapter.js";
import { db } from "./schema.js";
import type { ChangeLogStatus } from "./schema.js";

export const CHANGE_LOG_STATUS: Record<string, ChangeLogStatus> = {
  pending: "pending",
  synced: "synced",
  failed: "failed",
};

export function buildLogId(timestamp: number, taskId: string): string {
  return `log_${timestamp}_${taskId}`;
}

export function buildChangeLogId(
  timestamp: number,
  table: string,
  recordId: string,
): string {
  return `cl_${timestamp}_${table}_${recordId}`;
}

export interface ApplyChangeParams {
  table: string;
  recordId: string;
  op: "add" | "update" | "delete" | "bulkdelete";
  patch: Record<string, unknown>;
  clientId: string;
  option?: Record<string, unknown>;
}

/**
 * 簡單講，就是將對資料表的變更記錄下來，並對重複的更新操作進行合併，對刪除操作進行優化。
 * 這樣，這個表能夠用來更新遠端的資料庫。
 * @param table : db.[tableName]
 * @param recordId : The ID of the record being changed.
 * @param op : The operation being performed ("add", "update", or "delete").
 * @param patch : The patch data for the change.
 * @param clientId : The ID of the client making the change.
 * @param option : Additional options for the change. 若是'bulkdelete'，可以傳入 {"equal":["a","b"]} 對應的是 db.[tableName].where("a").equals("b") 的delete條件。
 *
 * @returns changeLogId
 */
export async function applyChange({
  table,
  recordId,
  op,
  patch,
  clientId,
  option,
}: ApplyChangeParams): Promise<string> {
  const now = Date.now();
  const id = buildChangeLogId(now, table, recordId);

  if (op === "add") {
    let data: Record<string, unknown>; //將 patch 變成 data 給 add 用
    switch (table) {
      case "ics_events":
        data = patch?.eventId ? patch : { ...patch, eventId: recordId };
        break;
      case "ics_sources":
        data = patch?.sourceId ? patch : { ...patch, sourceId: recordId };
        break;
      default:
        data = patch?.taskId ? patch : { ...patch, taskId: recordId };
    }
    // 假如有 nextRun，但是是 string，嘗試解析成 Date 物件 ，再轉換為 timestamp
    if (data.nextRun && typeof data.nextRun === "string") {
      const parsedDate = Date.parse(data.nextRun);
      if (!isNaN(parsedDate)) {
        data.nextRun = parsedDate;
      } else {
        console.warn(`Unable to parse nextRun date string: ${data.nextRun}`);
        delete data.nextRun; // 移除無法解析的 nextRun 字段
      }
    }

    const normalizedData =
      op === "add" && table === "log" && !(data as Record<string, unknown>).id
        ? { ...data, id: id }
        : data;
    await db.table(table).add({ ...normalizedData, updatedAt: now });
  } else if (op === "update") {
    await db.table(table).update(recordId, { ...patch, updatedAt: now });
  } else if (op === "delete") {
    await db.table(table).delete(recordId);
  } else if (op === "bulkdelete") {
    if (table && option?.equal) {
      const [key, value] = option.equal as [string, string];
      await db.table(table).where(key).equals(value).delete();
    }
  }

  // Optimize change_log entries
  const existingChanges = await db.change_log
    .where("table")
    .equals(table)
    .and(
      (change) =>
        change.clientId === clientId &&
        change.recordId === recordId &&
        change.status === CHANGE_LOG_STATUS.pending,
    )
    .sortBy("createdAt");

  if (op === "delete") {
    // If deleting, remove all previous pending changes for this record
    if (existingChanges.length > 0) {
      const firstOp = existingChanges[0].op;
      // If first operation was 'add', net effect is zero - don't store anything
      if (firstOp === "add") {
        await db.change_log.bulkDelete(existingChanges.map((c) => c.id));
        return id; // Don't add the delete change either
      }
      // Otherwise, clear all previous changes and add the delete
      await db.change_log.bulkDelete(existingChanges.map((c) => c.id));
    }
  } else if (op === "update") {
    // If updating, merge with previous update patch
    const previousUpdates = existingChanges.filter((c) => c.op === "update");
    if (previousUpdates.length > 0) {
      const lastUpdate = previousUpdates[previousUpdates.length - 1];
      // Merge patches: old patch + new patch
      const mergedPatch = { ...lastUpdate.patch, ...patch };
      // Delete old update entry
      await db.change_log.delete(lastUpdate.id);
      // Update patch to merged version
      patch = mergedPatch;
    }
  }
  // For 'add' operation, no special handling needed

  await db.change_log.add({
    id,
    clientId,
    table,
    recordId,
    op,
    patch,
    createdAt: now,
    status: CHANGE_LOG_STATUS.pending,
    retryCount: 0,
    syncedAt: null,
    option,
  });

  return id;
}

export async function getPendingChangeLogs() {
  const pending = await db.change_log
    .where("status")
    .equals(CHANGE_LOG_STATUS.pending)
    .toArray();
  const failed = await db.change_log
    .where("status")
    .equals(CHANGE_LOG_STATUS.failed)
    .toArray();
  return pending.concat(failed);
}

/**
 * Clear all change_log entries for the log table
 * Useful during development to clean up accumulated log changes
 */
export async function clearLogTableChanges(): Promise<number> {
  const logChanges = await db.change_log.where("table").equals("log").toArray();

  if (logChanges.length > 0) {
    await db.change_log.bulkDelete(logChanges.map((c) => c.id));
  }

  return logChanges.length;
}
