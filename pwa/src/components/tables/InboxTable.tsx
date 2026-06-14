import { useMemo, useState, useEffect } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { applyChange, db } from "../../db/index";
import type { InboxItem } from "../../db/schema";
import Utils from "../../../../gas/src/Utils";
import {
  formatToDateTimeLocal,
  parseFromDateTimeLocal,
} from "../../utils/timeUtils";
import { useResponsiveTable } from "../../hooks/useResponsiveTable";
import { useAppStore } from "../../store/appStore";
import { useT } from "../../i18n";
import { TableCard } from "../TableCard";
import { EditDialog, type FieldType } from "../EditDialog";
import { TableHelpDialog } from "../TableHelpDialog";
import inboxHelpMarkdown from "./InboxHelp.md?raw";
import { shouldOpenRowEdit } from "./rowEditUtils";
import { handleDialogTextFieldInteractionEnd } from "../../utils/dialogInteractionUtils";

const DEV_CLIENT_ID = "dev-client";
const columnHelper = createColumnHelper<InboxItem>();
type MoveTargetSheet = "task_pool" | "micro_tasks" | "scheduled" | "resource";

const MOVE_TARGET_OPTIONS: Array<{ value: MoveTargetSheet; label: string }> = [
  { value: "task_pool", label: "Task Pool" },
  { value: "micro_tasks", label: "Micro Tasks" },
  { value: "scheduled", label: "Scheduled" },
  { value: "resource", label: "Resource" },
];

function createMovePayload(source: InboxItem, target: MoveTargetSheet) {
  const title = source.title ?? "";
  const url = source.url ?? "";

  if (target === "task_pool") {
    const taskId = Utils.generateId("T");
    return {
      target,
      taskId,
      patch: {
        taskId,
        title,
        status: "PENDING",
        focusTime: undefined,
        project: "",
        spentTodayMins: 0,
        dailyLimitMins: 60,
        priority: 0,
        lastRunDate: undefined,
        totalSpentMins: 0,
        note: "",
        url,
      },
    };
  } else if (target === "micro_tasks") {
    const taskId = Utils.generateId("t");
    return {
      target,
      taskId,
      patch: {
        taskId,
        title,
        status: "PENDING",
        focusTime: undefined,
        lastRunDate: undefined,
        url,
      },
    };
  } else if (target === "scheduled") {
    const taskId = Utils.generateId("S");
    const cronExpr = "0 9 * * *";
    return {
      target,
      taskId,
      patch: {
        taskId,
        title,
        status: "WAITING",
        focusTime: undefined,
        cronExpr,
        remindBefore: "",
        remindAfter: "",
        callback: "",
        lastRun: undefined,
        note: "",
        nextRun: Utils.getNextOccurrence(cronExpr, new Date())?.getTime(),
        url,
      },
    };
  } else if (target === "resource") {
    const taskId = Utils.generateId("R");
    return {
      target,
      taskId,
      patch: {
        taskId,
        title,
        category: "",
        receivedAt: Date.now(),
        url,
        note: "",
      },
    };
  } else {
    throw new Error(`Unsupported target sheet: ${target}`);
  }
}

function createNewInboxRow(): InboxItem {
  const taskId = Utils.generateId("I");
  return {
    taskId,
    title: "",
    receivedAt: Date.now(),
    url: "",
  };
}

export function InboxTable() {
  const t = useT();
  const [rows, setRows] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >({
    taskId: false,
  });
  const { isMobile } = useResponsiveTable();
  const [editingItem, setEditingItem] = useState<InboxItem | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);
  const setCurrentSheet = useAppStore((state) => state.setCurrentSheet);
  const setPendingEditIntent = useAppStore(
    (state) => state.setPendingEditIntent,
  );
  const showGlobalToast = useAppStore((state) => state.showGlobalToast);
  const clearGlobalToast = useAppStore((state) => state.clearGlobalToast);
  const text = {
    subtitle: t("table.inbox.subtitle"),
    help: t("table.help"),
    open: t("table.open"),
    loading: t("table.loading"),
    empty: t("table.inbox.empty"),
    editTitle: t("table.inbox.editTitle"),
    titlePlaceholder: t("table.inbox.titlePlaceholder"),
    movePlaceholder: t("table.inbox.movePlaceholder"),
    helpTitle: t("table.inbox.helpTitle"),
  };

  // 初始載入（不自動更新）
  useEffect(() => {
    let active = true;
    db.inbox
      .toArray()
      .then((data) => {
        if (active) {
          // taskId 降序排列（新的在前面）
          const sorted = data.sort((a, b) => b.taskId.localeCompare(a.taskId));
          setRows(sorted);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load inbox:", err);
        if (active) {
          setRows([]);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const updateLocalRow = (taskId: string, patch: Partial<InboxItem>) => {
    setRows((prev) =>
      prev.map((row) => (row.taskId === taskId ? { ...row, ...patch } : row)),
    );
  };

  const saveUpdate = async (taskId: string, patch: Partial<InboxItem>) => {
    await applyChange({
      table: "inbox",
      recordId: taskId,
      op: "update",
      patch: patch as Record<string, unknown>,
      clientId: DEV_CLIENT_ID,
    }).catch((err) => console.error("Failed to save update:", err));
  };

  const addRow = async () => {
    const newRow = createNewInboxRow();
    setRows((prev) => [newRow, ...prev]);

    await applyChange({
      table: "inbox",
      recordId: newRow.taskId,
      op: "add",
      patch: newRow as unknown as Record<string, unknown>,
      clientId: DEV_CLIENT_ID,
    }).catch((err) => console.error("Failed to add row:", err));

    setEditingItem(newRow);
  };

  const deleteRow = async (taskId: string) => {
    setRows((prev) => prev.filter((row) => row.taskId !== taskId));

    await applyChange({
      table: "inbox",
      recordId: taskId,
      op: "delete",
      patch: {} as Record<string, unknown>,
      clientId: DEV_CLIENT_ID,
    }).catch((err) => console.error("Failed to delete row:", err));
  };

  const handleEditSave = async (data: Record<string, any>) => {
    if (!editingItem) return;

    const patch = {
      title: data.title,
      receivedAt: parseFromDateTimeLocal(data.receivedAt),
      url: data.url,
    };

    // 立刻更新本地状态
    updateLocalRow(editingItem.taskId, patch);
    // 再异步保存到数据库
    await saveUpdate(editingItem.taskId, patch);
    setEditingItem(null);
  };

  const moveRow = async (item: InboxItem, target: MoveTargetSheet) => {
    if (movingTaskId === item.taskId) return;

    setMoveError(null);
    setMovingTaskId(item.taskId);
    clearGlobalToast();

    const payload = createMovePayload(item, target);

    try {
      await applyChange({
        table: payload.target,
        recordId: payload.taskId,
        op: "add",
        patch: payload.patch as Record<string, unknown>,
        clientId: DEV_CLIENT_ID,
      });

      await applyChange({
        table: "inbox",
        recordId: item.taskId,
        op: "delete",
        patch: {} as Record<string, unknown>,
        clientId: DEV_CLIENT_ID,
      });

      setRows((prev) => prev.filter((row) => row.taskId !== item.taskId));
      setEditingItem(null);
      setPendingEditIntent({ sheet: target, taskId: payload.taskId });
      setCurrentSheet(target);

      const targetLabel =
        MOVE_TARGET_OPTIONS.find((option) => option.value === target)?.label ??
        target;
      showGlobalToast({
        message: t("table.inbox.movedTo", { target: targetLabel }),
        duration: 3000,
        actionLabel: "Undo",
        onAction: () => {
          void (async () => {
            try {
              await applyChange({
                table: "inbox",
                recordId: item.taskId,
                op: "add",
                patch: item as unknown as Record<string, unknown>,
                clientId: DEV_CLIENT_ID,
              }).catch(async () => {
                await applyChange({
                  table: "inbox",
                  recordId: item.taskId,
                  op: "update",
                  patch: item as unknown as Record<string, unknown>,
                  clientId: DEV_CLIENT_ID,
                });
              });

              await applyChange({
                table: payload.target,
                recordId: payload.taskId,
                op: "delete",
                patch: {} as Record<string, unknown>,
                clientId: DEV_CLIENT_ID,
              });

              useAppStore.getState().setCurrentSheet("inbox");
              useAppStore.getState().showGlobalToast({
                message: t("table.inbox.moveRestored"),
                duration: 1800,
              });
            } catch (undoErr) {
              const undoMsg =
                undoErr instanceof Error ? undoErr.message : String(undoErr);
              console.error("Failed to undo move:", undoErr);
              useAppStore.getState().showGlobalToast({
                message: t("table.inbox.undoFailed", { msg: undoMsg }),
                duration: 3000,
              });
            }
          })();
        },
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("Failed to move inbox row:", err);
      setMoveError(t("table.inbox.moveFailed", { msg: errorMsg }));
    } finally {
      setMovingTaskId(null);
    }
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor("taskId", {
        header: t("table.inbox.col.taskId"),
        cell: (info) => (
          <span className="text-xs text-gray-500">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("title", {
        header: t("table.inbox.col.title"),
        cell: (info) => {
          const taskId = info.row.original.taskId;
          const value = info.getValue() ?? "";

          return (
            <textarea
              className="w-full px-2 py-1 border rounded focus:outline-none focus:border-blue-500 min-w-3xs resize-none overflow-hidden"
              value={value}
              rows={1}
              onChange={(event) => {
                event.target.style.height = "auto";
                event.target.style.height = event.target.scrollHeight + "px";
                updateLocalRow(taskId, { title: event.target.value });
              }}
              onBlur={(event) => {
                handleDialogTextFieldInteractionEnd();
                saveUpdate(taskId, { title: event.target.value });
              }}
            />
          );
        },
      }),
      columnHelper.accessor("receivedAt", {
        header: t("table.inbox.col.receivedAt"),
        cell: (info) => {
          const taskId = info.row.original.taskId;
          const rawValue = info.getValue();
          const value = formatToDateTimeLocal(rawValue);

          return (
            <input
              className="w-full px-2 py-1 border rounded focus:outline-none focus:border-blue-500"
              type="datetime-local"
              value={value}
              onChange={(event) => {
                const nextValue = parseFromDateTimeLocal(event.target.value);
                updateLocalRow(taskId, { receivedAt: nextValue });
              }}
              onBlur={(event) => {
                const nextValue = parseFromDateTimeLocal(event.target.value);
                saveUpdate(taskId, { receivedAt: nextValue });
              }}
            />
          );
        },
      }),
      columnHelper.accessor("url", {
        header: t("table.inbox.col.url"),
        cell: (info) => {
          const taskId = info.row.original.taskId;
          const value = info.getValue() ?? "";
          const hasValidUrl = value && value !== "None";

          return (
            <div className="flex items-center gap-2">
              <input
                className="flex-1 px-2 py-1 border rounded focus:outline-none focus:border-blue-500 text-xs"
                value={value}
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
      columnHelper.display({
        id: "actions",
        header: t("table.inbox.col.actions"),
        cell: (info) => {
          const item = info.row.original;
          const isMoving = movingTaskId === item.taskId;

          return (
            <div className="flex flex-wrap items-center gap-2">
              <select
                disabled={isMoving}
                defaultValue=""
                onChange={(event) => {
                  const target = event.target.value as MoveTargetSheet;
                  if (!target) return;
                  event.currentTarget.value = "";
                  void moveRow(item, target);
                }}
                className="px-2 py-1 text-xs border rounded bg-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
              >
                <option value="">{text.movePlaceholder}</option>
                {MOVE_TARGET_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => deleteRow(item.taskId)}
                disabled={isMoving}
                className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
              >
                {t("table.inbox.col.delete")}
              </button>
            </div>
          );
        },
      }),
    ],
    [movingTaskId, t],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: {
      columnVisibility,
    },
    onColumnVisibilityChange: setColumnVisibility,
  });

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold">Inbox</h2>
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
            onClick={addRow}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {t("table.add")}
          </button>
        </div>
      </div>

      {moveError && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {moveError}
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-500">{text.loading}</div>
      ) : rows.length === 0 ? (
        <div className="text-center text-gray-500">{text.empty}</div>
      ) : isMobile ? (
        // 移動視圖 - 卡片
        <div className="grid grid-cols-1 gap-3">
          {rows.map((item) => (
              <TableCard
                key={item.taskId}
                item={item}
                fields={[
                  { label: t("col.title"), value: item.title || t("table.empty") },
                  {
                    label: t("card.receivedAt"),
                    value: item.receivedAt
                      ? new Date(item.receivedAt).toLocaleString("zh-TW")
                      : t("table.notSet"),
                  },
                ]}
                onEdit={setEditingItem}
                onDelete={(item) => deleteRow(item.taskId)}
              />
            ))}
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
                  key={row.id}
                  onClick={(event) => {
                    if (!shouldOpenRowEdit(event.target)) return;
                    setEditingItem(row.original);
                  }}
                  className="border-b hover:bg-gray-50 cursor-pointer"
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

      <EditDialog
        isOpen={!!editingItem}
        title={text.editTitle}
        item={editingItem}
        fields={[
          {
            name: "title",
            label: t("table.inbox.field.title"),
            type: "text" as FieldType,
            placeholder: text.titlePlaceholder,
          },
          {
            name: "receivedAt",
            label: t("table.inbox.field.receivedAt"),
            type: "datetime" as FieldType,
          },
          {
            name: "url",
            label: t("table.inbox.field.url"),
            type: "text" as FieldType,
            placeholder: "https://...",
          },
        ]}
        onSave={handleEditSave}
        onClose={() => setEditingItem(null)}
        footerLeft={
          editingItem ? (
            <div className="flex items-center gap-2">
              <select
                defaultValue=""
                disabled={movingTaskId === editingItem.taskId}
                onChange={(event) => {
                  const target = event.target.value as MoveTargetSheet;
                  if (!target) return;
                  event.currentTarget.value = "";
                  void moveRow(editingItem, target);
                }}
                className="px-2 py-1 text-xs border rounded bg-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
              >
                <option value="">{text.movePlaceholder}</option>
                {MOVE_TARGET_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null
        }
      />

      <TableHelpDialog
        isOpen={showHelp}
        title={text.helpTitle}
        markdown={inboxHelpMarkdown}
        onClose={() => setShowHelp(false)}
      />
    </div>
  );
}
