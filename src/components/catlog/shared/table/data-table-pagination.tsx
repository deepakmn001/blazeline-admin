"use client";

import { Table } from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
}

export function DataTablePagination<TData>({
  table,
}: DataTablePaginationProps<TData>) {
  return (
    <div className="flex flex-col gap-4 border-t border-line px-6 py-4 md:flex-row md:items-center md:justify-between">

      {/* Selected */}

      <div className="text-sm text-ink-faint">

        {table.getFilteredSelectedRowModel().rows.length} of{" "}
        {table.getFilteredRowModel().rows.length} row(s) selected

      </div>

      {/* Pagination */}

      <div className="flex items-center gap-6">

        {/* Rows */}

        <div className="text-sm text-ink-faint">

          Rows per page

          <select
            className="ml-2 rounded-lg border border-line bg-white px-2 py-1 text-sm"
            value={table.getState().pagination.pageSize}
            onChange={(e) =>
              table.setPageSize(Number(e.target.value))
            }
          >
            {[10, 20, 30, 50, 100].map((size) => (
              <option
                key={size}
                value={size}
              >
                {size}
              </option>
            ))}
          </select>

        </div>

        {/* Page */}

        <div className="text-sm font-medium text-ink">

          Page{" "}
          {table.getState().pagination.pageIndex + 1}
          {" of "}
          {table.getPageCount()}

        </div>

        {/* Controls */}

        <div className="flex items-center gap-1">

          <Button
            variant="outline"
            size="icon"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.setPageIndex(0)}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            disabled={!table.getCanNextPage()}
            onClick={() =>
              table.setPageIndex(table.getPageCount() - 1)
            }
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>

        </div>

      </div>

    </div>
  );
}