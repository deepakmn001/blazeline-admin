"use client";

import { useState } from "react";

import {
  ColumnDef,
  SortingState,
  VisibilityState,
  ColumnFiltersState,
  PaginationState,
  RowSelectionState,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";

interface UseDataTableProps<TData, TValue> {
  data: TData[];

  columns: ColumnDef<TData, TValue>[];

  pageSize?: number;
}

export function useDataTable<TData, TValue>({
  data,
  columns,
  pageSize = 10,
}: UseDataTableProps<TData, TValue>) {
  const [sorting, setSorting] =
    useState<SortingState>([]);

  const [columnFilters, setColumnFilters] =
    useState<ColumnFiltersState>([]);

  const [columnVisibility, setColumnVisibility] =
    useState<VisibilityState>({});

  const [rowSelection, setRowSelection] =
    useState<RowSelectionState>({});

  const [pagination, setPagination] =
    useState<PaginationState>({
      pageIndex: 0,
      pageSize,
    });

  const table = useReactTable({
    data,
    columns,

    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
    },

    onSortingChange: setSorting,

    onColumnFiltersChange: setColumnFilters,

    onColumnVisibilityChange: setColumnVisibility,

    onRowSelectionChange: setRowSelection,

    onPaginationChange: setPagination,

    getCoreRowModel: getCoreRowModel(),

    getSortedRowModel: getSortedRowModel(),

    getFilteredRowModel: getFilteredRowModel(),

    getPaginationRowModel:
      getPaginationRowModel(),
  });

  return {
    table,

    sorting,

    pagination,

    rowSelection,

    columnFilters,

    columnVisibility,
  };
}