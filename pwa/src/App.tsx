import { useMemo, useState, useEffect } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { applyChange, db } from "./db/index.js";
import type { InboxItem } from "./db/schema.js";
import Utils from "../../gas/src/Utils.js";
import {
  formatToDateTimeLocal,
  parseFromDateTimeLocal,
} from "./utils/timeUtils.js";

type InboxRow = InboxItem;

const columnHelper = createColumnHelper<InboxRow>();

const DEV_CLIENT_ID = "dev-client";

function createNewInboxRow(): InboxRow {
  const taskId = Utils.generateId("I");
  return {
    taskId,
    title: "",
    receivedAt: Date.now(),
  };
}

export default function App() {
  const [rows, setRows] = useState<InboxRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    db.inbox
      .toArray()
      .then((data) => {
        if (active) {
          setRows(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setRows([]);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const updateLocalRow = (taskId: string, patch: Partial<InboxRow>) => {
    setRows((prev) =>
      prev.map((row) => (row.taskId === taskId ? { ...row, ...patch } : row)),
    );
  };

  const saveUpdate = async (taskId: string, patch: Partial<InboxRow>) => {
    await applyChange({
      table: "inbox",
      recordId: taskId,
      op: "update",
      patch,
      clientId: DEV_CLIENT_ID,
    });
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
    });
  };

  const deleteRow = async (taskId: string) => {
    setRows((prev) => prev.filter((row) => row.taskId !== taskId));

    await applyChange({
      table: "inbox",
      recordId: taskId,
      op: "delete",
      patch: {} as Record<string, unknown>,
      clientId: DEV_CLIENT_ID,
    });
  };

  const resetDb = async () => {
    await db.transaction(
      "rw",
      [
        db.log,
        db.dashboard,
        db.inbox,
        db.task_pool,
        db.scheduled,
        db.selection_cache,
        db.micro_tasks,
        db.change_log,
        db.sync_state,
      ],
      async () => {
        await Promise.all([
          db.log.clear(),
          db.dashboard.clear(),
          db.inbox.clear(),
          db.task_pool.clear(),
          db.scheduled.clear(),
          db.selection_cache.clear(),
          db.micro_tasks.clear(),
          db.change_log.clear(),
          db.sync_state.clear(),
        ]);
      },
    );

    setRows([]);
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor("taskId", {
        header: "Task ID",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("title", {
        header: "Title",
        cell: (info) => {
          const taskId = info.row.original.taskId;
          const value = info.getValue() ?? "";

          return (
            <input
              className="cell-input"
              value={value}
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
      columnHelper.accessor("receivedAt", {
        header: "Received At",
        cell: (info) => {
          const taskId = info.row.original.taskId;
          const rawValue = info.getValue();
          const value = formatToDateTimeLocal(rawValue);

          return (
            <input
              className="cell-input"
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
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: (info) => (
          <button
            className="btn"
            onClick={() => deleteRow(info.row.original.taskId)}
          >
            Delete
          </button>
        ),
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Inbox (Editable)</h1>
          <p className="muted">
            Local-first edits, stored in Dexie with change logs.
          </p>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={addRow}>
            Add Row
          </button>
          {import.meta.env.DEV ? (
            <button className="btn" onClick={resetDb}>
              Reset DB
            </button>
          ) : null}
        </div>
      </header>

      <section className="table-wrap">
        {loading ? (
          <div className="muted">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="muted">No rows yet. Add one to get started.</div>
        ) : (
          <table className="table">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id}>
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
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
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
        )}
      </section>
    </div>
  );
}
