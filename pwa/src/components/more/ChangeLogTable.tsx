import { ChangeLogEntry, db } from "../../db/schema";
import { useState, useEffect, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
} from "@tanstack/react-table";

export function ChangeLogTable() {
  const [rows, setRows] = useState<ChangeLogEntry[]>([]);

  useEffect(() => {
    // Fetch initial rows from the database or any other source
    const fetchRows = async () => {
      const allChanges = await db.change_log.toArray();
      setRows(allChanges);
    };

    fetchRows();
  }, []);

  const columnHelper = createColumnHelper<ChangeLogEntry>();
  const columns = useMemo(
    () => [
      columnHelper.accessor("id", {
        header: "id",
        cell: (info) => {
          const value = info.getValue();
          if (!value) return "";
          return value;
        },
      }),
      columnHelper.accessor("clientId", {
        header: "clientId",
        cell: (info) => {
          const value = info.getValue();
          if (!value) return "";
          return value;
        },
      }),
      columnHelper.accessor("table", {
        header: "table",
        cell: (info) => {
          const value = info.getValue();
          if (!value) return "";
          return value;
        },
      }),
        columnHelper.accessor('recordId', {
          header: 'recordId',
          cell: (info) => {
            const value = info.getValue()
            if (!value) return ''
            return value
          },
        }),
        columnHelper.accessor('op', {
          header: 'operation',
          cell: (info) => {
            const value = info.getValue()
            if (!value) return ''
            return value
          },
        }),
        columnHelper.accessor('patch', {
          header: 'patch',
          cell: (info) => {
            const value = info.getValue()
            if (!value) return ''
            return JSON.stringify(value)
          },
        }),
        columnHelper.accessor('createdAt', {
          header: 'createdAt',
          cell: (info) => {
            const value = info.getValue()
            if (!value) return ''
            return new Date(value).toISOString()
          },
        }),
        columnHelper.accessor('status', {
          header: 'status',
          cell: (info) => {
            const value = info.getValue()
            if (!value) return ''
            return value
          },
        }),
        columnHelper.accessor('retryCount', {
          header: 'retryCount',
          cell: (info) => {
            const value = info.getValue()
            if (!value) return ''
            return value
          },
        }),
        columnHelper.accessor('syncedAt', {
          header: 'syncedAt',
          cell: (info) => {
            const value = info.getValue()
            if (!value) return ''
            return new Date(value).toISOString()
          },
        }),
        columnHelper.accessor('option', {
          header: 'option',
          cell: (info) => {
            const value = info.getValue()
            if (!value) return ''
            return JSON.stringify(value)
          },
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
    <div className="p-4">
      {rows.length === 0 ? (
        <div className="p-4 text-center text-gray-500">No data available</div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-100">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="p-2 text-left border-b border-gray-200 font-semibold"
                      style={{ width: header.getSize() }}
                    >
                      {flexRender(
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
                <tr key={row.id} className="border-b border-gray-200">
                  {row.getVisibleCells().map((cell) => {
                    const customClass =
                      cell.column.columnDef.meta?.className || "";
                    return (
                      <td
                        key={cell.id}
                        className={`p-2 ${customClass}`}
                        style={{ width: cell.column.getSize() }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
