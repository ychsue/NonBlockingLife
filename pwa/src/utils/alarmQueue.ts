import _ from "lodash";
import type { AlarmQueueItem, ScheduledItem } from "../db/schema";
import { buildAlarmQueueEntries, minutesToTimeString } from "./candidateUtils";

export interface AlarmQueueSyncPlan {
  toAdd: AlarmQueueItem[];
  toUpdate: AlarmQueueItem[];
  toDelete: number[];
  keep: AlarmQueueItem[];
}

export interface AlarmItem2TWA {
  id?: number;
  mode: "exact" | "clock";
  time: number[]; // [hour, minute] for clock, [year, month, day, hour, minute] for exact
  label: string;
  skipUi?: boolean; // For clock
  days?: number[]; // For clock
}

export interface AlarmItemFromTWA {
  id: number;
  mode: "exact" | "clock";
  ok: boolean;
  reason?: string;
  error?: string;
}

export function getAlarmItems2TWA(
  items: AlarmQueueItem[],
  now: Date = new Date(),
): { earliestClockItem?: AlarmItem2TWA; exactItems: AlarmItem2TWA[] } {
  const nowMs = now.getTime();
  // 比 AlarmItem2TWA 多一個 alarmAt 屬性，方便排序
  let itemsToTWA: (AlarmItem2TWA & { alarmAt?: number })[] = [];
  // 過濾出未過期的鬧鐘項目，並轉換為 TWA 所需的格式，注意， clock 與 exact 由 clockState 與 exactState 來決定，若為 'not_applicable' 則不加入 TWA，所以，一個原本的 item 可能有兩個 TWA 項目，分別對應 clock 與 exact，也可能都沒有。
  // 然後，clock 只取由現在起 24小時內的鬧鐘，exact 就全取
  // label 的話，就 title 加上 offsetMinutes 的字串，方便 TWA 端顯示
  items.forEach((item) => {
    if (item.alarmAt < nowMs) return;
    const alarmDate = new Date(item.alarmAt);
    const hour = alarmDate.getHours();
    const minute = alarmDate.getMinutes();

    // 等候的鬧鐘項目，若 clockState 或 exactState 為 'pending' 或 'failed'，則加入 TWA
    if (
      ["pending", "failed"].includes(item.clockState) &&
      item.alarmAt <= nowMs + 24 * 60 * 60 * 1000
    ) {
      itemsToTWA.push({
        id: item.id,
        mode: "clock",
        time: [hour, minute],
        label: `(${minutesToTimeString(item.offsetMinutes)}) ${item.title || "Unnamed task"}`,
        skipUi: true,
        alarmAt: item.alarmAt,
      });
    }
    if (["pending", "failed", "forbidden"].includes(item.exactState)) {
      const year = alarmDate.getFullYear();
      const month = alarmDate.getMonth() + 1;
      const day = alarmDate.getDate();
      itemsToTWA.push({
        id: item.id,
        mode: "exact",
        time: [year, month, day, hour, minute],
        label: `(${minutesToTimeString(item.offsetMinutes)}) ${item.title || "Unnamed task"}`,
        alarmAt: item.alarmAt,
      });
    }
  });

  //由於Android手機會強制跳到鬧鐘畫面，因此，很容易造成Clock設定未必全部都能設定到，因此，只好一個一個設，因此，mode="clock" 只能最多一個
  const clockItems = itemsToTWA.filter((item) => item.mode === "clock");
  const earliestClockItem = _.minBy(clockItems, "alarmAt");
  if (earliestClockItem) {
    delete earliestClockItem.alarmAt;
  }
  const exactItems = itemsToTWA.filter((item) => item.mode === "exact");
  exactItems.forEach((item) => {
    delete item.alarmAt;
  });
  return {earliestClockItem, exactItems};
}

/**
 *
 * @param twaResults twa 回傳的陣列
 * @param existingQueueItems 原本PWA裡面AlarmQueueItem[]
 * @return 回傳一個 AlarmQueueSyncPlan，裡面包含 toUpdate 陣列，好更新 db.alarm_queue 的 clockState 與 exactState
 *
 * 這個函式的目的是將 TWA 回傳的結果，與原本 PWA 的 AlarmQueueItem 做比對，並產生一個同步計劃，告訴 PWA 哪些項目需要更新其 clockState 與 exactState。
 */
export function getPlanFromTWAResults(
  twaResults: AlarmItemFromTWA[],
  existingQueueItems: AlarmQueueItem[],
): AlarmQueueSyncPlan {
  const toUpdate: AlarmQueueItem[] = [];
  const groupByIdTwaResults = _.groupBy(twaResults, "id");
  Object.values(groupByIdTwaResults).forEach((results_byId) => {
    const existingItem = existingQueueItems.find(
      (item) => item.id === results_byId[0].id,
    );
    if (!existingItem) return;
    const thisUpdate: Partial<AlarmQueueItem> = {};
    results_byId.forEach((result) => {
      // 根據 mode, ok 與 reason 來決定要更新的 state 為何值
      if (result.mode === "clock") {
        const nextClockState = result.ok ? "set" : "failed";
        if (existingItem.clockState !== nextClockState) {
          thisUpdate.clockState = nextClockState;
        }
      } else if (result.mode === "exact") {
        const reason = result.reason;
        const nextExactState = result.ok
          ? "set"
          : reason === "permission_required"
            ? "forbidden"
            : reason === "alarm_manager_unavailable"
              ? "failed"
              : "wrong_time";
        if (existingItem.exactState !== nextExactState) {
          thisUpdate.exactState = nextExactState;
        }
      }
    });
    if (Object.keys(thisUpdate).length > 0) {
      toUpdate.push({
        ...existingItem,
        ...thisUpdate,
      });
    }
  });

  return { toUpdate, toAdd: [], toDelete: [], keep: [] };
}

export function getDueAlarmQueueEntries(
  items: AlarmQueueItem[],
  nowMs: number = Date.now(),
): AlarmQueueItem[] {
  return items
    .filter((item) => item.state === "pending" && item.alarmAt <= nowMs)
    .sort((a, b) => a.alarmAt - b.alarmAt);
}

// abandon 沒再用
export function mergeAlarmQueueEntries(
  existing: AlarmQueueItem[],
  incoming: AlarmQueueItem[],
): AlarmQueueItem[] {
  const map = new Map<string, AlarmQueueItem>();

  for (const item of [...existing, ...incoming]) {
    const key = item.dedupeKey || `${item.taskId}:${item.alarmAt}`;
    const current = map.get(key);
    if (!current || item.updatedAt > current.updatedAt) {
      map.set(key, item);
    }
  }

  return Array.from(map.values()).sort((a, b) => a.alarmAt - b.alarmAt);
}

// 主要用於將 ScheduledItem 轉換為 AlarmQueueItem，並與現有的 AlarmQueueItem 進行同步，生成一個同步計劃。
export function genAlarmQueueFromScheduledPlan(
  scheduled: ScheduledItem[],
  existing: AlarmQueueItem[] = [],
  now: Date = new Date(),
  horizonMs: number = 30 * 24 * 60 * 60 * 1000,
  syncTargets: { clock: boolean; exact: boolean } = {
    clock: false,
    exact: false,
  },
): AlarmQueueSyncPlan {
  const desired = buildAlarmQueueEntries(
    scheduled,
    now,
    horizonMs,
    syncTargets,
  );
  const desiredByKey = new Map(
    desired.map((item) => [item.dedupeKey, item] as const),
  );
  const existingByKey = new Map(
    existing.map((item) => [item.dedupeKey, item] as const),
  );
  const nowMs = now.getTime();

  const toAdd: AlarmQueueItem[] = [];
  const toUpdate: AlarmQueueItem[] = [];
  const toDelete: number[] = [];
  const keep: AlarmQueueItem[] = [];

  // 先整理 existing，將不再需要的項目標記為刪除，並保留需要更新或保持的項目
  for (const item of existing) {
    // The queue isn't meant to keep history, just to track what's been sent to TWA;
    // once an alarm's own time has passed there's nothing left to sync, so drop it.
    if (item.alarmAt < nowMs) {
      if (item.id != null) {
        toDelete.push(item.id);
      }
      continue;
    }

    // The local trigger/dismiss lifecycle (state) is orthogonal to the TWA sync fields, so once
    // it's left 'pending' leave its content alone until it's pruned by the time check above.
    if (item.state !== "pending") {
      keep.push(item);
      continue;
    }

    // If the item is still pending, check if it exists in the desired set; if not, mark for deletion.
    const desiredItem = desiredByKey.get(item.dedupeKey);
    if (!desiredItem) {
      if (item.id != null) {
        toDelete.push(item.id);
      }
      continue;
    }

    const coreChanged =
      item.alarmAt !== desiredItem.alarmAt ||
      item.offsetMinutes !== desiredItem.offsetMinutes ||
      item.title !== desiredItem.title;

    // If the underlying schedule changed, any previous TWA registration is stale and needs re-sync.
    // Otherwise only flip a state from 'not_applicable' to 'pending' when a target was newly enabled
    // (or the reverse when disabled); never touch a state that's already 'set'/'failed'/'pending'.
    const nextClockState = coreChanged
      ? desiredItem.clockState
      : item.clockState === "set"
        ? "set" // already set, leave it alone
        : !syncTargets.clock
          ? "not_applicable"
          : item.clockState === "not_applicable"
            ? "pending"
            : item.clockState;
    const nextExactState = coreChanged
      ? desiredItem.exactState
      : item.clockState === "set"
        ? "set" // already set, leave it alone
        : !syncTargets.exact
          ? "not_applicable"
          : item.exactState === "not_applicable"
            ? "pending"
            : item.exactState;

    const shouldUpdate =
      coreChanged ||
      nextClockState !== item.clockState ||
      nextExactState !== item.exactState;

    if (shouldUpdate && item.id != null) {
      toUpdate.push({
        ...desiredItem,
        id: item.id,
        clockState: nextClockState,
        exactState: nextExactState,
        createdAt: item.createdAt || desiredItem.createdAt,
        updatedAt: nowMs,
      });
      continue;
    }

    keep.push(item);
  }

  // 將 desired 中的項目加入 toAdd，排除已經存在的項目
  for (const item of desired) {
    if (existingByKey.has(item.dedupeKey)) continue;
    toAdd.push(item);
  }

  return {
    toAdd: toAdd.sort((a, b) => a.alarmAt - b.alarmAt),
    toUpdate: toUpdate.sort((a, b) => a.alarmAt - b.alarmAt),
    toDelete: [...new Set(toDelete)],
    keep: keep.sort((a, b) => a.alarmAt - b.alarmAt),
  };
}

/**
 * 處理到期的 AlarmQueueItems
 * @param items 找到的 AlarmQueueItems
 * @param nowMs 當前時間戳（毫秒），預設為 Date.now()
 * @returns 包含到(過)期和剩餘的 AlarmQueueItems
 */
export async function processDueAlarmQueue(
  items: AlarmQueueItem[],
  nowMs: number = Date.now(),
): Promise<{ due: AlarmQueueItem[]; remaining: AlarmQueueItem[] }> {
  const due = getDueAlarmQueueEntries(items, nowMs);
  const remaining = items.filter(
    (item) => !due.some((entry) => entry.dedupeKey === item.dedupeKey),
  );
  return { due, remaining };
}
