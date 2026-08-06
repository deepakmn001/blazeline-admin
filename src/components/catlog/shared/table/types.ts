import {
  ColumnDef,
  SortingState,
  VisibilityState,
  ColumnFiltersState,
  RowSelectionState,
  PaginationState,
} from "@tanstack/react-table";

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];

  data: TData[];

  loading?: boolean;

  pageCount?: number;

  pagination?: PaginationState;

  onPaginationChange?: (
    pagination: PaginationState
  ) => void;
}

export interface DataTableToolbarProps {
  searchPlaceholder?: string;

  showSearch?: boolean;

  showRefresh?: boolean;

  showExport?: boolean;

  showImport?: boolean;
}

export interface DataTableState {
  sorting: SortingState;

  columnVisibility: VisibilityState;

  rowSelection: RowSelectionState;

  columnFilters: ColumnFiltersState;
}