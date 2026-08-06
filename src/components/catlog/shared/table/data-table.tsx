"use client";

import {
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";

import { useDataTable } from "./use-data-table";
import { DataTablePagination } from "./data-table-pagination";
import { DataTableViewOptions } from "./data-table-view-options";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {

  const { table } = useDataTable({
    data,
    columns,
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">

      <div className="overflow-x-auto">

        <table className="w-full">

          <thead className="bg-neutral-50">

            {table.getHeaderGroups().map((headerGroup) => (

              <tr key={headerGroup.id}>

                {headerGroup.headers.map((header) => (

                  <th
                    key={header.id}
                    className="border-b border-line px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-ink-faint"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>

                ))}

              </tr>

            ))}

          </thead>

          <tbody>

            {table.getRowModel().rows.length ? (

              table.getRowModel().rows.map((row) => (

                <tr
                  key={row.id}
                  className="border-b border-line transition-colors hover:bg-neutral-50"
                >

                  {row.getVisibleCells().map((cell) => (

                    <td
                      key={cell.id}
                      className="px-6 py-5 align-middle"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>

                  ))}

                </tr>

              ))

            ) : (

              <tr>

                <td
                  colSpan={columns.length}
                  className="py-16 text-center text-sm text-ink-faint"
                >
                  No records found.
                </td>

              </tr>

            )}

          </tbody>

        </table>

      </div>

    </div>
  );
}