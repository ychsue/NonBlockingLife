import { useMemo, useState, useEffect, type FocusEvent, useRef } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { applyChange, db } from "../../db/index";
import type {
  AlarmQueueItem,
  IcsSourceItem,
  ScheduledItem,
  SelectionCacheItem,
} from "../../db/schema";
import Utils from "../../../../gas/src/Utils";
import {
  formatToDateTimeLocal,
  ONE_YEAR_MS,
  parseFromDateTimeLocal,
} from "../../utils/timeUtils";
import { useResponsiveTable } from "../../hooks/useResponsiveTable";
import { useAppStore } from "../../store/appStore";
import { useT, useTWithMaps } from "../../i18n";
import { TableCard } from "../TableCard";
import { EditDialog, type FieldType } from "../EditDialog";
import { TableHelpDialog } from "../TableHelpDialog";
import scheduledHelpMarkdown from "./ScheduledHelp.md?raw";
import { useSearchFilter, useHideDone } from "../../hooks/useSearchFilter";
import {
  buildCronExpr,
  getCronParts,
  getPredictedNextRun,
  getUpcomingOccurrences,
} from "../../utils/cronUtils";
import { interruptTask } from "../../utils/taskFlow";
import { shouldOpenRowEdit } from "./rowEditUtils";
import { notifies } from "../../utils/notification";
import { getDeviceType } from "../../utils/shortcutUtils";
import { AlarmQueuePanel } from "../more/AlarmQueuePanel";
import { useAlarmQueueWatcherContext } from "../tour/AlarmQueueWatcher";
import _ from "lodash";
import { useProductTourContext } from "../tour/ProductTourContext";
import { SettingsCard } from "../SettingsCard";
import { IcsSourceManagementDialog } from "../ics/IcsSourceManagementDialog";
import {
  mapIcsToUnifiedItem,
  mapScheduledToUnifiedItem,
  UnifiedCalendarItem,
} from "../../utils/icsAdapter";

const DEV_CLIENT_ID = "dev-client";
const columnHelper = createColumnHelper<UnifiedCalendarItem>();

interface CronPreviewState {
  taskId: string;
  title: string;
  cronExpr: string;
  runs: number[];
}

function createNewScheduledRow(taskId?: string, title?: string): ScheduledItem {
  taskId = taskId || Utils.generateId("S");
  const cronExpr = "0 9 * * *"; // 預設每天早上9點執行
  return {
    taskId,
    title: title || "",
    status: "WAITING",
    focusTime: undefined,
    cronExpr: cronExpr,
    remindBefore: "",
    remindAfter: "",
    reminderOffsets: "",
    callback: "",
    lastRun: undefined,
    note: "",
    nextRun: Utils.getNextOccurrence(cronExpr, new Date())?.getTime(),
    url: "",
  };
}

export function ScheduledTable() {
  const t = useT();
  const locale = useAppStore((state) => state.locale);
  const experimentalFeaturesEnabled = useAppStore(
    (state) => state.experimentalFeaturesEnabled,
  );

  const [rows, setRows] = useState<UnifiedCalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [cronPreview, setCronPreview] = useState<CronPreviewState | null>(null);
  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >({
    taskId: false,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [sortMode, setSortMode] = useState<
    "none" | "lastRunAsc" | "lastRunDesc" | "nextRunAsc" | "nextRunDesc"
  >("none");
  const { isMobile } = useResponsiveTable();
  const alarmSyncTargets = useAppStore((state) => state.alarmSyncTargets);
  const setAlarmSyncTargets = useAppStore((state) => state.setAlarmSyncTargets);
  const showGlobalToast = useAppStore((state) => state.showGlobalToast);

  const [createdNewRowId, setCreatedNewRowId] = useState("");
  const [icsSourceRows, setIcsSourceRows] = useState<IcsSourceItem[]>([]);

  const [editingItem, setEditingItem] = useState<ScheduledItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOrMode, setIsOrMode] = useState(true);
  const [hideDone, setHideDone] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const currentSheet = useAppStore((state) => state.currentSheet);
  const pendingEditIntent = useAppStore((state) => state.pendingEditIntent);
  const clearPendingEditIntent = useAppStore(
    (state) => state.clearPendingEditIntent,
  );
  const runningTask = useAppStore((state) => state.runningTask);
  const loadRunningTask = useAppStore((state) => state.loadRunningTask);
  const AQWatcher = useAlarmQueueWatcherContext();
  const {
    resetItemsStates,
    queueItems,
    clearQueue,
    updateTableBasedOnScheduled,
  } = AQWatcher;

  const [openAlarmQueueDialog, setOpenAlarmQueueDialog] = useState(false);
  const { nextStep, isRunning, activeStep } = useProductTourContext();

  const [isIcsSourceManagementDialogOpen, setIcsSourceManagementDialogOpen] =
    useState(false);

  const handleIcsSourceManagementDialogClose = () => {
    setIcsSourceManagementDialogOpen(false);
  };

  async function updateIcsSourceRows(active: boolean) {
    const updatedRows = await db.ics_sources.toArray();
    if (active) {
      setIcsSourceRows((prev) =>
        _.isEqual(prev, updatedRows) ? prev : updatedRows,
      );
    }
  }

  const handleIcsOnSynced = (success: boolean) => {
    console.log(`ICS sync ${success ? "succeeded" : "failed"}`);
    if (success) {
      updateIcsSourceRows(true); // 這裡應該更新 ICS source rows，根據實際情況修改
    }
    showGlobalToast({
      message: success
        ? "ICS sources have been successfully synced."
        : "Failed to sync ICS sources.",
      duration: 3000,
    });
  };

  const text = {
    subtitle: t("table.scheduled.subtitle"),
    help: t("table.help"),
    searchPlaceholder: t("table.scheduled.searchPlaceholder"),
    hideDone: t("table.scheduled.hideDone"),
    open: t("table.open"),
    loading: t("table.loading"),
    editTitle: t("table.scheduled.editTitle"),
    titlePlaceholder: t("table.scheduled.titlePlaceholder"),
    cronPlaceholder: t("table.scheduled.cronPlaceholder"),
    helpTitle: t("table.scheduled.helpTitle"),
    sortLabel: t("table.scheduled.sortLabel"),
    searchMode: t("table.scheduled.searchMode"),
    alarmSyncTargetsLabel: t("table.scheduled.alarmSyncTargetsLabel"),
  };

  // 根据 sortMode 更新 sorting 状态
  useEffect(() => {
    switch (sortMode) {
      case "lastRunAsc":
        setSorting([{ id: "lastRun", desc: false }]);
        break;
      case "lastRunDesc":
        setSorting([{ id: "lastRun", desc: true }]);
        break;
      case "nextRunAsc":
        setSorting([{ id: "nextRun", desc: false }]);
        break;
      case "nextRunDesc":
        setSorting([{ id: "nextRun", desc: true }]);
        break;
      default:
        setSorting([]);
    }
  }, [sortMode]);

  // 初始載入icsSourceRows（不自動更新）
  useEffect(() => {
    let active = true;
    updateIcsSourceRows(active);

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    // 改為使用 async await，因為要引進 icsEventItem 的讀入與篩選
    async function getUnifiedCalendarItems() {
      if (!active) return;
      try {
        // 1. 讀取 scheduled 資料庫中的所有行
        const scheduledRows = await db.scheduled.toArray();
        // 1.1 將 scheduledRows 轉換為 UnifiedCalendarItem (還會再擴充)
        const unifiedItems = scheduledRows
          .map(mapScheduledToUnifiedItem)
          .sort((a, b) => b.taskId.localeCompare(a.taskId));
        // 2. 讀取 db.ics_events 裡面所有行
        const icsEventRows = await db.ics_events.toArray();
        // 2.1 將 icsEventRows 轉換為 UnifiedCalendarItem
        const icsUnifiedItems: UnifiedCalendarItem[] = [];
        icsEventRows.forEach((eventRow) => {
          const source = icsSourceRows.find(
            (src) => src.sourceId === eventRow.sourceId,
          );
          if (!source || !source.enabled) return;
          const unifiedItem = mapIcsToUnifiedItem(eventRow, source);
          if (unifiedItem) {
            icsUnifiedItems.push(unifiedItem);
          }
        });
        // 3. 合併 scheduled 與 ics 的 UnifiedCalendarItem
        const allUnifiedItems = [...unifiedItems, ...icsUnifiedItems];
        // 4. 如果 allUnifiedItems 為空，則創建一個新的 UnifiedCalendarItem
        if (allUnifiedItems.length === 0) {
          const starterItem = createNewScheduledRow(
            "S0",
            "Check out the Inbox table!",
          );
          await db.scheduled.add(starterItem);
          await applyChange({
            table: "scheduled",
            recordId: starterItem.taskId,
            op: "add",
            patch: starterItem as unknown as Record<string, unknown>,
            clientId: DEV_CLIENT_ID,
          }).catch((err) =>
            console.error("Failed to add starter scheduled row:", err),
          );
          allUnifiedItems.push(mapScheduledToUnifiedItem(starterItem));
        }
        // 將合併後的 UnifiedCalendarItem 設置到狀態中
        if (active) {
          setRows(allUnifiedItems);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to get unified calendar items:", err);
        if (active) {
          setRows([]);
          setLoading(false);
        }
      }
    }
    getUnifiedCalendarItems();

    return () => {
      active = false;
    };
  }, [icsSourceRows]);

  useEffect(() => {
    if (!pendingEditIntent || pendingEditIntent.sheet !== "scheduled") return;
    if (currentSheet !== "scheduled") return;

    const targetRow = rows.find(
      (row) => row.taskId === pendingEditIntent.taskId,
    );
    if (!targetRow) return;

    setEditingItem(targetRow);
    setSearchQuery(targetRow.title || "");
    clearPendingEditIntent();
  }, [rows, pendingEditIntent, currentSheet, clearPendingEditIntent]);

  const updateLocalRow = (taskId: string, patch: Partial<ScheduledItem>) => {
    setRows((prev) =>
      prev.map((row) => (row.taskId === taskId ? { ...row, ...patch } : row)),
    );
  };

  const saveUpdate = async (taskId: string, patch: Partial<ScheduledItem>) => {
    await applyChange({
      table: "scheduled",
      recordId: taskId,
      op: "update",
      patch: patch as Record<string, unknown>,
      clientId: DEV_CLIENT_ID,
    }).catch((err) => console.error("Failed to save update:", err));
  };

  const addRow = async (taskId?: string, title?: string) => {
    const newScheduledRow = createNewScheduledRow(taskId, title);
    const newRow = mapScheduledToUnifiedItem(newScheduledRow);
    setRows((prev) => [newRow, ...prev]);

    await applyChange({
      table: "scheduled",
      recordId: newRow.taskId,
      op: "add",
      patch: newRow as unknown as Record<string, unknown>,
      clientId: DEV_CLIENT_ID,
    }).catch((err) => console.error("Failed to add row:", err));

    setEditingItem(newRow);
    setCreatedNewRowId(newRow.taskId);
    if (isRunning && activeStep?.id === "add-a-scheduled-task") {
      nextStep();
    }
  };

  const deleteRow = async (taskId: string) => {
    setRows((prev) => prev.filter((row) => row.taskId !== taskId));

    await applyChange({
      table: "scheduled",
      recordId: taskId,
      op: "delete",
      patch: {} as Record<string, unknown>,
      clientId: DEV_CLIENT_ID,
    }).catch((err) => console.error("Failed to delete row:", err));
  };

  const toSelectionCandidate = (item: ScheduledItem): SelectionCacheItem => ({
    taskId: item.taskId,
    title: item.title,
    source: "Scheduled",
    status: item.status,
    url: item.url,
    deadline: item.deadline,
  });

  const handleInterruptOrStart = async (item: ScheduledItem) => {
    const result = await interruptTask("", toSelectionCandidate(item));
    if (result.status !== "success") {
      console.error(
        "Failed to interrupt/start from scheduled:",
        result.message,
      );
      return;
    }
    notifies.taskStarted(item.title ?? item.taskId ?? "", locale);
    await loadRunningTask();
  };

  const handleEditSave = async (data: Record<string, any>) => {
    if (!editingItem) return;

    const rawAlarmOffsets = data.reminderOffsets ?? "";
    const normalizedAlarmOffsets =
      typeof rawAlarmOffsets === "string"
        ? rawAlarmOffsets.trim() === ""
          ? undefined
          : rawAlarmOffsets
        : rawAlarmOffsets;

    const patch = {
      title: data.title,
      status: data.status,
      focusTime:
        data.focusTime === "" || data.focusTime == null
          ? undefined
          : parseInt(data.focusTime) || 0,
      cronExpr: data.cronExpr,
      remindBefore: data.remindBefore,
      remindAfter: data.remindAfter,
      reminderOffsets: normalizedAlarmOffsets,
      callback: data.callback,
      lastRun: data.lastRun ? parseFromDateTimeLocal(data.lastRun) : undefined,
      nextRun: data.nextRun ? parseFromDateTimeLocal(data.nextRun) : undefined,
      note: data.note,
      url: data.url,
      deadline: data.deadline
        ? parseFromDateTimeLocal(data.deadline)
        : undefined,
    };

    // 立刻更新本地状态
    updateLocalRow(editingItem.taskId, patch);
    // 再异步保存到数据库
    await saveUpdate(editingItem.taskId, patch);
    setEditingItem(null);
  };

  const handleCloseEditDialog = (isSaved?: boolean) => {
    if (isSaved) {
      setEditingItem(null);
      setCreatedNewRowId("");
    } else {
      // 如果是新建的行，且未保存，則刪除該行
      if (createdNewRowId) {
        deleteRow(createdNewRowId);
        setCreatedNewRowId("");
      }
      setEditingItem(null);
    }
  };

  const openCronPreview = (item: ScheduledItem, cronExpr: string) => {
    setCronPreview({
      taskId: item.taskId,
      title: item.title ?? "",
      cronExpr,
      runs: getUpcomingOccurrences(cronExpr),
    });
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor("taskId", {
        header: t("table.scheduled.col.taskId"),
        cell: (info) => (
          <span className="text-xs text-gray-500">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("sourceColor", {
        header: " ",
        cell: (info) => (
          <div
            className="m-w-2"
            style={{
              backgroundColor: info.getValue()
                ? `${info.getValue()}`
                : "transparent",
            }}
          >
            .
          </div>
        ),
      }),
      columnHelper.accessor("sourceName", {
        header: t("table.scheduled.col.sourceName"),
        cell: (info) => (
          <span className="text-xs text-gray-500 block min-w-15">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("title", {
        header: t("table.scheduled.col.title"),
        cell: (info) => {
          const taskId = info.row.original.taskId;
          const isReadOnly = info.row.original.isReadOnly;
          const value = info.getValue() ?? "";

          return (
            <input
              className="w-full px-2 py-1 border rounded focus:outline-none focus:border-blue-500 min-w-3xs"
              value={value}
              readOnly={isReadOnly}
              onChange={(event) =>
                updateLocalRow(taskId, { title: event.target.value })
              }
              onBlur={(event) =>
                saveUpdate(taskId, { title: event.target.value })
              }
            />
          );
        },
      }),
      columnHelper.accessor("status", {
        header: t("table.scheduled.col.status"),
        cell: (info) => {
          const taskId = info.row.original.taskId;
          const value = info.getValue() ?? "";

          return (
            <select
              className="w-full px-2 py-1 border rounded focus:outline-none focus:border-blue-500 min-w-28"
              value={value}
              onChange={(event) =>
                updateLocalRow(taskId, { status: event.target.value })
              }
              onBlur={(event) =>
                saveUpdate(taskId, { status: event.target.value })
              }
            >
              <option value="WAITING">WAITING</option>
              <option value="PENDING">PENDING</option>
              <option value="DONE">DONE</option>
              <option value="INTERRUPTED">INTERRUPTED</option>
            </select>
          );
        },
      }),
      columnHelper.accessor("focusTime", {
        header: t("table.scheduled.col.focusTime"),
        cell: (info) => {
          const taskId = info.row.original.taskId;
          const isReadOnly = info.row.original.isReadOnly;
          const value = info.getValue();

          return (
            <input
              className="w-24 px-2 py-1 border rounded focus:outline-none focus:border-blue-500"
              type="number"
              min={0}
              value={value ?? ""}
              placeholder="mins"
              readOnly={isReadOnly}
              onChange={(event) => {
                const raw = event.target.value;
                updateLocalRow(taskId, {
                  focusTime: raw === "" ? undefined : parseInt(raw) || 0,
                });
              }}
              onBlur={(event) => {
                const raw = event.target.value;
                saveUpdate(taskId, {
                  focusTime: raw === "" ? undefined : parseInt(raw) || 0,
                });
              }}
            />
          );
        },
      }),
      columnHelper.accessor("cronExpr", {
        header: t("table.scheduled.cronHeader"),
        cell: (info) => {
          const taskId = info.row.original.taskId;
          const isReadOnly = info.row.original.isReadOnly;
          const fullValue = info.getValue() ?? "";
          // 如果是 readonly，則直接傳回 cronExpr 字串，且不可編輯
          if (isReadOnly) {
            return (
              <span className="text-xs text-gray-500 block min-w-15">
                {fullValue}
              </span>
            );
          }

          const [minute, hour, day, month, weekday] = getCronParts(fullValue);
          const parts = [minute, hour, day, month, weekday];
          const currentNextRun = info.row.original.nextRun;

          const updateCronPart = (index: number, newValue: string) => {
            const updated = [...parts];
            while (updated.length < 5) updated.push("*");
            updated[index] = newValue;
            const cronExpr = updated.join(" ");
            updateLocalRow(taskId, { cronExpr });
          };

          const saveCronPart = (index: number, newValue: string) => {
            const updated = [...parts];
            while (updated.length < 5) updated.push("*");
            updated[index] = newValue;
            const cronExpr = updated.join(" ");
            saveUpdate(taskId, { cronExpr });
          };

          const inputWidth = (value: string) => {
            const length = Math.max(3, value.length);
            return `${length + 1}ch`;
          };

          const composeCronExpr = () => {
            return buildCronExpr(parts);
          };

          const previewCronExpr = composeCronExpr();

          const maybeAutoFillNextRun = () => {
            const predictedNextRun = getPredictedNextRun(
              previewCronExpr,
              new Date(),
            );
            if (predictedNextRun == null) return;

            if (currentNextRun == null) {
              updateLocalRow(taskId, { nextRun: predictedNextRun });
              saveUpdate(taskId, { nextRun: predictedNextRun });
              return;
            }

            if (currentNextRun === predictedNextRun) return;

            const shouldApply = window.confirm(
              t("table.scheduled.nextRunConfirm", {
                current: currentNextRun
                  ? new Date(currentNextRun).toLocaleString()
                  : t("table.notSet"),
                predicted: new Date(predictedNextRun).toLocaleString(),
              }),
            );

            if (!shouldApply) return;

            updateLocalRow(taskId, { nextRun: predictedNextRun });
            saveUpdate(taskId, { nextRun: predictedNextRun });
          };

          const handleCronGroupBlur = (event: FocusEvent<HTMLDivElement>) => {
            const nextTarget = event.relatedTarget as Node | null;
            if (nextTarget && event.currentTarget.contains(nextTarget)) {
              return;
            }
            maybeAutoFillNextRun();
          };

          return (
            <div
              className="flex flex-wrap items-center gap-1"
              style={{ minWidth: "10rem" }}
              onBlur={handleCronGroupBlur}
            >
              <input
                className="px-1 py-1 border rounded focus:outline-none focus:border-blue-500 font-mono text-xs"
                style={{ minWidth: "1rem", width: inputWidth(minute) }}
                value={minute}
                placeholder="0"
                title={t("table.scheduled.cronMinute")}
                onChange={(e) => updateCronPart(0, e.target.value)}
                onBlur={(e) => saveCronPart(0, e.target.value)}
              />
              <input
                className="px-1 py-1 border rounded focus:outline-none focus:border-blue-500 font-mono text-xs"
                style={{ minWidth: "1rem", width: inputWidth(hour) }}
                value={hour}
                placeholder="9"
                title={t("table.scheduled.cronHour")}
                onChange={(e) => updateCronPart(1, e.target.value)}
                onBlur={(e) => saveCronPart(1, e.target.value)}
              />
              <input
                className="px-1 py-1 border rounded focus:outline-none focus:border-blue-500 font-mono text-xs"
                style={{ minWidth: "1rem", width: inputWidth(day) }}
                value={day}
                placeholder="*"
                title={t("table.scheduled.cronDay")}
                onChange={(e) => updateCronPart(2, e.target.value)}
                onBlur={(e) => saveCronPart(2, e.target.value)}
              />
              <input
                className="px-1 py-1 border rounded focus:outline-none focus:border-blue-500 font-mono text-xs"
                style={{ minWidth: "1rem", width: inputWidth(month) }}
                value={month}
                placeholder="*"
                title={t("table.scheduled.cronMonth")}
                onChange={(e) => updateCronPart(3, e.target.value)}
                onBlur={(e) => saveCronPart(3, e.target.value)}
              />
              <input
                className="px-1 py-1 border rounded focus:outline-none focus:border-blue-500 font-mono text-xs"
                style={{ minWidth: "1rem", width: inputWidth(weekday) }}
                value={weekday}
                placeholder="*"
                title={t("table.scheduled.cronWeekday")}
                onChange={(e) => updateCronPart(4, e.target.value)}
                onBlur={(e) => saveCronPart(4, e.target.value)}
              />
              <button
                type="button"
                className="px-2 py-1 border border-gray-300 rounded text-xs whitespace-nowrap hover:bg-gray-100"
                onClick={() =>
                  openCronPreview(info.row.original, previewCronExpr)
                }
                title={t("table.scheduled.previewButton")}
              >
                {t("table.scheduled.previewButton")}
              </button>
            </div>
          );
        },
      }),
      ...(alarmSyncTargets !== 0
        ? [
            columnHelper.accessor("reminderOffsets", {
              header: t("table.scheduled.col.reminderOffsets"),
              cell: (info) => {
                const taskId = info.row.original.taskId;
                const isReadOnly = info.row.original.isReadOnly;
                const rawValue = info.getValue();
                const value =
                  typeof rawValue === "string"
                    ? rawValue
                    : Array.isArray(rawValue)
                      ? rawValue.join(",")
                      : "";

                return (
                  <input
                    className="w-28 min-w-28 px-2 py-1 border rounded focus:outline-none focus:border-blue-500 text-xs"
                    value={value}
                    readOnly={isReadOnly}
                    placeholder="1d,2h,30m"
                    onChange={(event) =>
                      updateLocalRow(taskId, {
                        reminderOffsets: event.target.value,
                      })
                    }
                    onBlur={(event) => {
                      const nextValue = event.target.value.trim();
                      saveUpdate(taskId, {
                        reminderOffsets: nextValue ? nextValue : undefined,
                      });
                    }}
                  />
                );
              },
            }),
          ]
        : []),
      columnHelper.accessor("remindBefore", {
        header: t("table.scheduled.col.remindBefore"),
        cell: (info) => {
          const taskId = info.row.original.taskId;
          const isReadOnly = info.row.original.isReadOnly;
          const value = info.getValue() ?? "";

          return (
            <input
              className="w-20 px-2 py-1 border rounded focus:outline-none focus:border-blue-500"
              value={value}
              readOnly={isReadOnly}
              placeholder="1h"
              onChange={(event) =>
                updateLocalRow(taskId, { remindBefore: event.target.value })
              }
              onBlur={(event) =>
                saveUpdate(taskId, { remindBefore: event.target.value })
              }
            />
          );
        },
      }),
      columnHelper.accessor("remindAfter", {
        header: t("table.scheduled.col.remindAfter"),
        cell: (info) => {
          const taskId = info.row.original.taskId;
          const isReadOnly = info.row.original.isReadOnly;
          const value = info.getValue() ?? "";

          return (
            <input
              className="w-20 px-2 py-1 border rounded focus:outline-none focus:border-blue-500"
              value={value}
              readOnly={isReadOnly}
              placeholder="90m"
              onChange={(event) =>
                updateLocalRow(taskId, { remindAfter: event.target.value })
              }
              onBlur={(event) =>
                saveUpdate(taskId, { remindAfter: event.target.value })
              }
            />
          );
        },
      }),
      columnHelper.accessor("callback", {
        header: t("table.scheduled.col.callback"),
        cell: (info) => {
          const taskId = info.row.original.taskId;
          const isReadOnly = info.row.original.isReadOnly;
          const value = info.getValue() ?? "";

          return (
            <input
              className="w-full min-w-40 px-2 py-1 border rounded focus:outline-none focus:border-blue-500 font-mono text-xs"
              value={value}
              readOnly={isReadOnly}
              placeholder="action"
              onChange={(event) =>
                updateLocalRow(taskId, { callback: event.target.value })
              }
              onBlur={(event) =>
                saveUpdate(taskId, { callback: event.target.value })
              }
            />
          );
        },
      }),
      columnHelper.accessor("note", {
        header: t("table.scheduled.col.note"),
        cell: (info) => {
          const taskId = info.row.original.taskId;
          const isReadOnly = info.row.original.isReadOnly;
          const value = info.getValue() ?? "";

          return (
            <input
              className="w-full min-w-40 px-2 py-1 border rounded focus:outline-none focus:border-blue-500"
              value={value}
              readOnly={isReadOnly}
              onChange={(event) =>
                updateLocalRow(taskId, { note: event.target.value })
              }
              onBlur={(event) =>
                saveUpdate(taskId, { note: event.target.value })
              }
            />
          );
        },
      }),
      columnHelper.accessor("url", {
        header: t("table.scheduled.col.url"),
        cell: (info) => {
          const taskId = info.row.original.taskId;
          const isReadOnly = info.row.original.isReadOnly;
          const value = info.getValue() ?? "";
          const hasValidUrl = value && value !== "None";

          return (
            <div className="flex items-center gap-2">
              <input
                className="flex-1 px-2 py-1 border rounded focus:outline-none focus:border-blue-500 text-xs"
                value={value}
                readOnly={isReadOnly}
                onChange={(event) =>
                  updateLocalRow(taskId, { url: event.target.value })
                }
                onBlur={(event) =>
                  saveUpdate(taskId, { url: event.target.value })
                }
              />
              {hasValidUrl && (
                <a
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 whitespace-nowrap"
                >
                  {text.open}
                </a>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("deadline", {
        header: t("table.scheduled.col.deadline"),
        cell: (info) => {
          const taskId = info.row.original.taskId;
          const rawValue = info.getValue();
          const value = rawValue ? formatToDateTimeLocal(rawValue) : "";

          return (
            <input
              className="w-full px-2 py-1 border rounded focus:outline-none focus:border-blue-500 text-xs"
              readOnly={info.row.original.isReadOnly}
              type="datetime-local"
              value={value}
              onChange={(event) => {
                const nextValue = parseFromDateTimeLocal(event.target.value);
                updateLocalRow(taskId, { deadline: nextValue });
              }}
              onBlur={(event) => {
                const nextValue = event.target.value
                  ? parseFromDateTimeLocal(event.target.value)
                  : undefined;
                saveUpdate(taskId, { deadline: nextValue });
              }}
            />
          );
        },
      }),
      columnHelper.accessor("nextRun", {
        header: t("table.scheduled.col.nextRun"),
        sortingFn: "datetime",
        cell: (info) => {
          const taskId = info.row.original.taskId;
          const rawValue = info.getValue();
          const value = formatToDateTimeLocal(rawValue);

          return (
            <input
              className="w-full px-2 py-1 border rounded focus:outline-none focus:border-blue-500 text-xs"
              type="datetime-local"
              value={value}
              onChange={(event) => {
                const nextValue = parseFromDateTimeLocal(event.target.value);
                updateLocalRow(taskId, { nextRun: nextValue });
              }}
              onBlur={(event) => {
                const nextValue = parseFromDateTimeLocal(event.target.value);
                saveUpdate(taskId, { nextRun: nextValue });
              }}
            />
          );
        },
      }),
      // Hidden column for lastRun sorting
      columnHelper.accessor("lastRun", {
        id: "lastRun",
        header: () => null,
        cell: () => null,
        sortingFn: "datetime",
      }),
      columnHelper.display({
        id: "actions",
        header: t("table.scheduled.col.actions"),
        cell: (info) => (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleInterruptOrStart(info.row.original)}
              className="px-2 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 whitespace-nowrap"
            >
              {runningTask ? t("table.quickSwitch") : t("table.quickStart")}
            </button>
            {/* 如果是 IcsEventItem，就不顯示 delete 按鈕 */}
            {info.row.original.itemType === "scheduled" && (
              <button
                onClick={() => deleteRow(info.row.original.taskId)}
                className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
              >
                {t("table.scheduled.col.delete")}
              </button>
            )}
          </div>
        ),
      }),
    ],
    [t, runningTask],
  );

  const searchFiltered = useSearchFilter(
    rows,
    { query: searchQuery, isOrMode },
    ["title", "note", "url", "callback"] as (keyof ScheduledItem)[],
  );
  const filteredRows = useHideDone(searchFiltered, hideDone);

  const table = useReactTable({
    data: filteredRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      columnVisibility,
      sorting,
    },
    onColumnVisibilityChange: setColumnVisibility,
    onSortingChange: setSorting,
    // Custom sorting for datetime fields (lastRun, nextRun)
    // Undefined values should appear first
    sortingFns: {
      datetime: (rowA, rowB, columnId) => {
        const a = rowA.getValue<number | undefined>(columnId);
        const b = rowB.getValue<number | undefined>(columnId);

        // Undefined values go first
        if (a === undefined && b === undefined) return 0;
        if (a === undefined) return -1;
        if (b === undefined) return 1;

        return a - b;
      },
    },
  });

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="dropdown">
              <button
                className={`${showMobileFilters ? "bg-green-500" : "bg-blue-500"} dropbtn `}
                data-tour="scheduled-more-button"
                onClick={() => {
                  setShowMobileFilters((prev) => !prev);
                  // Joyride
                  if (isRunning && activeStep?.id === "scheduled-more-button") {
                    nextStep();
                  }
                }}
              >
                ☰
              </button>
              <div
                className={`dropdown-content w-[min(30rem,90vw)] ${showMobileFilters ? "show" : ""}`}
              >
                {/* 更多設定都放進來這裡 */}
                <div className="m-2 flex flex-col justify-between gap-2">
                  <SettingsCard title={text.sortLabel} description={null}>
                    <label className="text-sm text-gray-700 font-semibold">
                      {/* {text.sortLabel}: */}
                      <select
                        value={sortMode}
                        onChange={(e) =>
                          setSortMode(e.target.value as typeof sortMode)
                        }
                        className="px-3 py-2 border rounded focus:outline-none focus:border-blue-500 text-sm"
                      >
                        <option value="none">
                          {t("table.scheduled.sort.none")}
                        </option>
                        <option value="lastRunAsc">
                          {t("table.scheduled.sort.lastRunAsc")}
                        </option>
                        <option value="lastRunDesc">
                          {t("table.scheduled.sort.lastRunDesc")}
                        </option>
                        <option value="nextRunAsc">
                          {t("table.scheduled.sort.nextRunAsc")}
                        </option>
                        <option value="nextRunDesc">
                          {t("table.scheduled.sort.nextRunDesc")}
                        </option>
                      </select>
                    </label>
                  </SettingsCard>

                  {(import.meta.env.DEV ||
                    getDeviceType() === "TWA" ||
                    getDeviceType() === "AndroidWebView") && (
                    <SettingsCard
                      title={text.alarmSyncTargetsLabel}
                      description={null}
                    >
                      <AlarmSyncTargetsCheckList
                        onChange={(v) => {
                          setAlarmSyncTargets(v);
                          if (
                            isRunning &&
                            activeStep?.id === "confirm-sync-targets-alarm"
                          ) {
                            nextStep();
                          }
                        }}
                        alarmSyncTargets={alarmSyncTargets}
                        openDialogClicked={() => {
                          setOpenAlarmQueueDialog(true);
                          if (isRunning && activeStep?.id === "show-alarms") {
                            nextStep();
                          }
                        }}
                        resetItemsStates={resetItemsStates} //這個目前除錯用
                      />
                    </SettingsCard>
                  )}

                  {experimentalFeaturesEnabled && (
                    <SettingsCard
                      title="設定 ics 來源 (實驗中🧪)"
                      description={null}
                    >
                      {/* 設定 ics 來源 */}
                      <button
                        type="button"
                        onClick={() => setIcsSourceManagementDialogOpen(true)}
                        className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                      >
                        Manage ICS Sources
                      </button>
                    </SettingsCard>
                  )}
                </div>
              </div>
            </div>
            <h2 className="text-xl font-bold">Scheduled Tasks</h2>
          </div>
          <p className="text-sm text-gray-600">{text.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHelp(true)}
            className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-100"
          >
            {text.help}
          </button>
          <button
            onClick={() => addRow()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            data-tour="add-scheduled-task-button"
          >
            {t("table.add")}
          </button>
        </div>
      </div>

      {/* 搜尋欄與過濾器 */}
      <div className="mb-4 flex gap-2 flex-wrap">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={text.searchPlaceholder}
          className={`px-3 py-2 border rounded focus:outline-none focus:border-blue-500 ${isMobile ? "flex-1 min-w-0" : "flex-1"}`}
        />

        <button
          onClick={() => setIsOrMode(!isOrMode)}
          className={`px-3 py-2 rounded ${
            isOrMode
              ? "bg-blue-500 text-white hover:bg-blue-600"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          {isOrMode ? "OR" : "AND"}
        </button>
        <label className="flex items-center gap-1 px-3 py-2 border rounded cursor-pointer select-none text-sm text-gray-700 hover:bg-gray-50">
          <input
            type="checkbox"
            checked={hideDone}
            onChange={(e) => setHideDone(e.target.checked)}
            className="accent-blue-500"
          />
          {text.hideDone}
        </label>
      </div>

      {loading ? (
        <div className="text-center text-gray-500">{text.loading}</div>
      ) : rows.length === 0 ? (
        <div className="text-center text-gray-500">{t("table.noItemsYet")}</div>
      ) : filteredRows.length === 0 ? (
        <div className="text-center text-gray-500">
          {t("table.noMatchingItems")}
        </div>
      ) : isMobile ? (
        // 移動視圖 - 卡片
        <div className="grid grid-cols-1 gap-3">
          {table
            .getRowModel()
            .rows.filter((row) => {
              return hideDone
                ? row.original.status?.toLowerCase() !== "done"
                : true;
            })
            .map((row) => {
              const item = row.original;
              return (
                <TableCard
                  key={item.taskId}
                  item={item}
                  showDelete={item.itemType === "scheduled"}
                  accentColor={item.sourceColor ?? ""}
                  fields={[
                    {
                      label: t("col.title"),
                      value: item.title || t("table.empty"),
                    },
                    //如果有 SourceName 就插入
                    ...(item.sourceName
                      ? [
                          {
                            label: t("card.sourceName"),
                            value: item.sourceName,
                          },
                        ]
                      : []),
                    { label: t("card.status"), value: item.status },
                    {
                      label: t("card.focusTime"),
                      value:
                        item.focusTime == null
                          ? t("card.default30Mins")
                          : t("card.default30MinsUnit", { n: item.focusTime }),
                    },
                    // 如果有 cron 表達式就插入
                    ...(item.cronExpr
                      ? [{ label: t("card.cron"), value: item.cronExpr }]
                      : []),
                    {
                      label: t("card.nextRun"),
                      value: item.nextRun
                        ? new Date(item.nextRun).toLocaleString("zh-TW")
                        : t("table.notSet"),
                    },
                  ]}
                  onEdit={setEditingItem}
                  onDelete={(item) =>
                    item.itemType === "scheduled" && deleteRow(item.taskId)
                  }
                  quickAction={{
                    label: runningTask
                      ? t("table.quickSwitch")
                      : t("table.quickStart"),
                    onClick: handleInterruptOrStart,
                  }}
                />
              );
            })}
        </div>
      ) : (
        // 桌面視圖 - 表格
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-2 text-left font-semibold"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  role="button"
                  tabIndex={0}
                  key={row.id}
                  onClick={(event) => {
                    if (!shouldOpenRowEdit(event.target)) return;
                    setEditingItem(row.original);
                  }}
                  className="border-b hover:bg-gray-50 cursor-pointer touch-manipulation transition"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-2">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <IcsSourceManagementDialog
        isOpen={isIcsSourceManagementDialogOpen}
        onClose={handleIcsSourceManagementDialogClose}
        onSynced={handleIcsOnSynced}
      />

      <EditDialog
        isOpen={!!editingItem}
        title={text.editTitle}
        item={editingItem}
        fields={[
          {
            name: "title",
            label: t("table.scheduled.field.title"),
            type: "text" as FieldType,
            placeholder: text.titlePlaceholder,
          },
          {
            name: "status",
            label: t("table.scheduled.field.status"),
            type: "select" as FieldType,
            options: [
              { label: "WAITING", value: "WAITING" },
              { label: "PENDING", value: "PENDING" },
              { label: "DONE", value: "DONE" },
              { label: "INTERRUPTED", value: "INTERRUPTED" },
            ],
          },
          {
            name: "cronExpr",
            label: t("table.scheduled.field.cronExpr"),
            type: "cron" as FieldType,
            placeholder: text.cronPlaceholder,
          },
          {
            name: "focusTime",
            label: t("table.scheduled.field.focusTime"),
            type: "number" as FieldType,
          },
          ...(alarmSyncTargets !== 0
            ? [
                {
                  name: "reminderOffsets",
                  label: t("table.scheduled.field.reminderOffsets"),
                  type: "text" as FieldType,
                  placeholder: "1d,2h,30m",
                },
              ]
            : []),
          {
            name: "remindBefore",
            label: t("table.scheduled.field.remindBefore"),
            type: "text" as FieldType,
          },
          {
            name: "remindAfter",
            label: t("table.scheduled.field.remindAfter"),
            type: "text" as FieldType,
          },
          {
            name: "callback",
            label: t("table.scheduled.field.callback"),
            type: "text" as FieldType,
          },
          {
            name: "lastRun",
            label: t("table.scheduled.field.lastRun"),
            type: "datetime" as FieldType,
          },
          {
            name: "nextRun",
            label: t("table.scheduled.field.nextRun"),
            type: "datetime" as FieldType,
          },
          {
            name: "note",
            label: t("table.scheduled.field.note"),
            type: "text" as FieldType,
          },
          {
            name: "url",
            label: t("table.scheduled.field.url"),
            type: "text" as FieldType,
            placeholder: "https://...",
          },
          {
            name: "deadline",
            label: t("table.scheduled.field.deadline"),
            type: "datetime" as FieldType,
          },
        ]}
        onSave={handleEditSave}
        onClose={handleCloseEditDialog}
      />

      <TableHelpDialog
        isOpen={showHelp}
        title={text.helpTitle}
        markdown={scheduledHelpMarkdown}
        onClose={() => setShowHelp(false)}
      />

      {cronPreview && (
        <div
          role="dialog"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setCronPreview(null)}
        >
          <div
            className="w-full max-w-lg rounded-lg bg-white p-5 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start gap-3">
              <div>
                <h3 className="text-lg font-bold">
                  {t("table.scheduled.previewTitle")}
                </h3>
                <p className="text-sm text-gray-600">
                  {cronPreview.title || cronPreview.taskId}
                </p>
                <p className="mt-1 font-mono text-xs text-gray-500">
                  {cronPreview.cronExpr}
                </p>
              </div>
              <button
                type="button"
                className="ml-auto px-3 py-1 border border-gray-300 rounded hover:bg-gray-100"
                onClick={() => setCronPreview(null)}
              >
                {t("dialog.cancel")}
              </button>
            </div>

            {cronPreview.runs.length === 0 ? (
              <p className="text-sm text-red-600">
                {t("table.scheduled.previewEmpty")}
              </p>
            ) : (
              <div>
                <p className="mb-3 text-sm text-gray-600">
                  {t("table.scheduled.previewCount", {
                    n: cronPreview.runs.length,
                  })}
                </p>
                <ol className="max-h-[60vh] list-decimal space-y-2 overflow-y-auto pl-5 text-sm text-gray-800">
                  {cronPreview.runs.map((run) => (
                    <li key={run}>{new Date(run).toLocaleString()}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      )}
      {openAlarmQueueDialog && (
        // 這dialog改成用自制的組件來實現，是自制的
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            role="button"
            onClick={() => setOpenAlarmQueueDialog(false)}
          ></div>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0 w-[90%] max-w-125 max-h-[90%] border-none rounded-lg bg-white shadow-xl z-50 overflow-y-none">
            <AlarmQueuePanel
              items={queueItems}
              onClearQueue={clearQueue}
              onUpdateItems={async () => {
                await updateTableBasedOnScheduled(
                  alarmSyncTargets,
                  ONE_YEAR_MS,
                );
              }}
              onClickItem={(item) => {
                setSearchQuery(item.title || "");
                // close the dialog after clicking an item
                setOpenAlarmQueueDialog(false);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

/**
 * 用來讓使用者設定 alarmSyncTargets 的CheckList，
 * (開發時使用)外加一個根據 alarmSyncTargets 利用resetItemsStates來重設所有的提醒設定的按鈕
 */
function AlarmSyncTargetsCheckList({
  alarmSyncTargets,
  onChange,
  openDialogClicked,
  resetItemsStates,
}: {
  alarmSyncTargets: number;
  onChange: (newValue: number) => void;
  openDialogClicked: () => void;
  resetItemsStates: (tempST: number) => Promise<void>;
}) {
  const [tempST, setTempST] = useState(alarmSyncTargets);
  const t = useTWithMaps({
    "zh-TW": {
      設定排程鬧鐘: "設定排程鬧鐘",
      查看鬧鐘: "查看鬧鐘",
      確定: "確定",
      重設: "重設",
      確認exactAlarm:
        "⚠️ 這個選項實驗中，有可能因重開機等因素而收不到通知，確定要選嗎？",
    },
    en: {
      設定排程鬧鐘: "Set Scheduled Alarm",
      查看鬧鐘: "View Alarms",
      確定: "Confirm",
      重設: "Reset",
      確認exactAlarm:
        "⚠️ This option is experimental and may not receive notifications due to factors such as rebooting. Are you sure you want to select it?",
    },
    ja: {
      設定排程鬧鐘: "スケジュールアラームを設定",
      查看鬧鐘: "アラームを表示",
      確定: "確認",
      重設: "リセット",
      確認exactAlarm:
        "⚠️ このオプションは実験的であり、再起動などの要因により通知を受け取れない場合があります。本当に選択しますか？",
    },
  });
  return (
    <div className="flex flex-row justify-between gap-2 flex-wrap">
      <form
        className="flex flex-row gap-2 text-sm text-gray-700 font-semibold"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        {/* <h3>{t("設定排程鬧鐘")}</h3> */}
        <div className="flex flex-row gap-2 items-center">
          <label className="flex items-center gap-2">
            {/* 兩個checkboxes 為輸入源 和一個 ok 將結果透過onChange 送出 */}
            <input
              type="checkbox"
              checked={(tempST & 1) !== 0}
              onChange={(e) =>
                setTempST((prev) => (e.target.checked ? prev | 1 : prev & ~1))
              }
              data-tour="toggle-reminder-alarm-button"
            />
            ⏰
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={(tempST & 2) !== 0}
              onChange={(e) => {
                if (!e.target.checked || confirm(t("確認exactAlarm"))) {
                  setTempST((prev) =>
                    e.target.checked ? prev | 2 : prev & ~2,
                  );
                }
              }}
            />
            🪧
          </label>
          <button
            type="button"
            className={`px-3 py-1 text-white rounded ${_.isEqual(tempST, alarmSyncTargets) ? "opacity-50 cursor-not-allowed bg-blue-500" : "bg-blue-500 hover:bg-blue-600"}`}
            onClick={() => onChange(tempST)}
            data-tour="confirm-sync-targets-alarm-button"
          >
            {t("確定")}
          </button>
        </div>
      </form>
      <button
        onClick={openDialogClicked}
        data-tour="view-alarms-button"
        className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
      >
        {t("查看鬧鐘")}
      </button>
      {import.meta.env.DEV ? (
        <button
          type="button"
          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
          onClick={() => resetItemsStates(tempST)}
        >
          {t("重設")}
        </button>
      ) : null}
    </div>
  );
}
