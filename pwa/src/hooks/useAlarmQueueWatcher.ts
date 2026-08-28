import { createContext, useCallback, useEffect, useRef, useState } from "react";
import _ from "lodash";
import { db } from "../db";
import type { AlarmQueueItem } from "../db/schema";
import {
  genAlarmQueueFromScheduledPlan,
  type AlarmQueueSyncPlan,
} from "../utils/alarmQueue";
import {
  ALARM_SYNC_TARGET_CLOCK,
  ALARM_SYNC_TARGET_EXACT,
} from "../store/appStore";

export function useAlarmQueueWatcher(enabled: boolean) {
  const [queueItems, setQueueItems] = useState<AlarmQueueItem[]>([]);
  const isUpdatingRef = useRef(false);

  const refreshQueue = useCallback(async () => {
    if (!enabled) {
      setQueueItems([]);
      return;
    }

    const rows = await db.alarm_queue.orderBy("alarmAt").toArray();
    setQueueItems((prev) => (_.isEqual(prev, rows) ? prev : rows));
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    void refreshQueue();

    const intervalId = window.setInterval(
      () => {
        void refreshQueue();
      },
      15 * 60 * 1000,
    );

    return () => {
      window.clearInterval(intervalId);
    };
  }, [enabled, refreshQueue]);

  const applySyncPlan = useCallback(
    async (plan: AlarmQueueSyncPlan) => {
      const rows = await db.alarm_queue.toArray();
      if (plan.toDelete.length > 0) {
        await db.alarm_queue.bulkDelete(plan.toDelete);
      }

      if (plan.toUpdate.length > 0 || plan.toAdd.length > 0) {
        if (isUpdatingRef.current) {
          console.warn("Already updating alarm queue, skipping applySyncPlan");
          return;
        }
        isUpdatingRef.current = true;
        await db.alarm_queue.bulkPut([...plan.toAdd, ...plan.toUpdate]);
        isUpdatingRef.current = false;
      }

      await refreshQueue();
      return plan;
    },
    [refreshQueue],
  );

  // 將所有 db.alarm_queue 的項目，根據alarmSyncTargets重置其 clockState 與 exactState 為 not_applicable 或 pending
  const resetItemsStates = useCallback(
    async (alarmSyncTargets: number) => {
      const rows = await db.alarm_queue.toArray();
      const updatedRows = rows.map((item) => {
        const nextClockState =
          (alarmSyncTargets & ALARM_SYNC_TARGET_CLOCK) !== 0
            ? "pending"
            : "not_applicable";
        const nextExactState =
          (alarmSyncTargets & ALARM_SYNC_TARGET_EXACT) !== 0
            ? "pending"
            : "not_applicable";
        return {
          ...item,
          clockState: nextClockState as "pending" | "not_applicable",
          exactState: nextExactState as "pending" | "not_applicable",
        };
      });

      if(isUpdatingRef.current) {
        console.warn("Already updating alarm queue, skipping resetItemsStates");
        return;
      }
      isUpdatingRef.current = true;
      await db.alarm_queue.bulkPut(updatedRows);
      isUpdatingRef.current = false;
      await refreshQueue();
    },
    [refreshQueue],
  );

  const updateTableBasedOnScheduled = useCallback(
    async (
      alarmSyncTargets: number,
      horizonMs: number = 30 * 24 * 60 * 60 * 1000,
    ) => {
      const nowMs = Date.now();
      const scheduledItems = await db.scheduled
        .where("nextRun")
        .between(nowMs, nowMs + horizonMs)
        .toArray();
      const existingQueueItems = await db.alarm_queue.toArray();
      const syncTargets = {
        clock: (alarmSyncTargets & ALARM_SYNC_TARGET_CLOCK) !== 0,
        exact: (alarmSyncTargets & ALARM_SYNC_TARGET_EXACT) !== 0,
      };
      const plan = genAlarmQueueFromScheduledPlan(
        scheduledItems,
        existingQueueItems,
        new Date(nowMs),
        horizonMs,
        syncTargets,
      );
      await applySyncPlan(plan);

      // 回傳最新的 queueItems
      const updatedQueueItems = await db.alarm_queue
        .orderBy("alarmAt")
        .toArray();
      setQueueItems(updatedQueueItems);
      return updatedQueueItems;
    },
    [applySyncPlan],
  );

  const markItemState = useCallback(
    async (item: AlarmQueueItem, nextState: AlarmQueueItem["state"]) => {
      if (!item.id) return false;

      await db.alarm_queue.update(item.id, {
        state: nextState,
        updatedAt: Date.now(),
      });

      await refreshQueue();
      return true;
    },
    [refreshQueue],
  );

  const markItemClockState = useCallback(
    async (item: AlarmQueueItem, nextState: AlarmQueueItem["clockState"]) => {
      if (!item.id) return false;
      await db.alarm_queue.update(item.id, {
        clockState: nextState,
        updatedAt: Date.now(),
      });
      await refreshQueue();
      return true;
    },
    [refreshQueue],
  );

  const markItemExactState = useCallback(
    async (item: AlarmQueueItem, nextState: AlarmQueueItem["exactState"]) => {
      if (!item.id) return false;
      await db.alarm_queue.update(item.id, {
        exactState: nextState,
        updatedAt: Date.now(),
      });
      await refreshQueue();
      return true;
    },
    [refreshQueue],
  );

  const dismissItem = useCallback(
    async (item: AlarmQueueItem) => {
      if (!item.id) return false;
      await db.alarm_queue.update(item.id, {
        state: "dismissed",
        updatedAt: Date.now(),
      });
      await refreshQueue();
      return true;
    },
    [refreshQueue],
  );

  const deleteItem = useCallback(
    async (item: AlarmQueueItem) => {
      if (!item.id) return false;
      await db.alarm_queue.delete(item.id);
      await refreshQueue();
      return true;
    },
    [refreshQueue],
  );

  const clearQueue = useCallback(async () => {
    await db.alarm_queue.clear();
    await refreshQueue();
  }, [refreshQueue]);

  return {
    queueItems,
    refreshQueue,
    resetItemsStates,
    applySyncPlan,
    updateTableBasedOnScheduled,
    markItemClockState,
    markItemExactState,
    dismissItem,
    deleteItem,
    clearQueue,
  };
}
