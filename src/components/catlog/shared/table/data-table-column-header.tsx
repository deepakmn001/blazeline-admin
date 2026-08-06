"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
} from "lucide-react";

import { Column } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>;

  title: string;

  className?: string;
}

export function DataTableColumnHeader<
  TData,
  TValue
>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<
  TData,
  TValue
>) {
  if (!column.getCanSort()) {
    return (
      <div className={className}>
        {title}
      </div>
    );
  }

  const sorted = column.getIsSorted();

  return (
    <Button
      variant="ghost"
      className={`-ml-3 h-8 px-3 font-semibold hover:bg-transparent ${className}`}
      onClick={() =>
        column.toggleSorting(
          sorted === "asc"
        )
      }
    >
      <span>{title}</span>

      {sorted === "asc" ? (
        <ArrowUp className="ml-2 h-4 w-4" />
      ) : sorted === "desc" ? (
        <ArrowDown className="ml-2 h-4 w-4" />
      ) : (
        <ArrowUpDown className="ml-2 h-4 w-4 opacity-40" />
      )}
    </Button>
  );
}