"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  FolderTree,
  Layers,
  ListFilter,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { Subcategory } from "./subcategory-form";

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

interface SubcategoryTableProps {
  subcategories: Subcategory[];
  isLoading?: boolean;
  onView?: (subcategory: Subcategory) => void;
  onEdit?: (subcategory: Subcategory) => void;
  onDuplicate?: (subcategory: Subcategory) => void;
  onDelete?: (subcategory: Subcategory) => void;
  onCreate?: () => void;
}

type StatusFilter = "all" | "active" | "hidden";
type FeaturedFilter = "all" | "featured" | "normal";

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

export function SubcategoryTable({
  subcategories,
  isLoading = false,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  onCreate,
}: SubcategoryTableProps) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [parentFilter, setParentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [featuredFilter, setFeaturedFilter] = useState<FeaturedFilter>("all");

  const [sorting, setSorting] = useState<SortingState>([{ id: "updated_at", desc: true }]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  /* -------------------------------------------------------------- */
  /* Derived data                                                     */
  /* -------------------------------------------------------------- */

  const parentCategories = useMemo(() => {
    const map = new Map<string, string>();
    subcategories.forEach((s) => map.set(s.parent_category_id, s.parent_category_name));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [subcategories]);

  const filteredData = useMemo(() => {
    const query = search.trim().toLowerCase();

    return subcategories.filter((s) => {
      const matchesSearch =
        !query ||
        s.name.toLowerCase().includes(query) ||
        s.slug.toLowerCase().includes(query) ||
        s.parent_category_name.toLowerCase().includes(query);

      const matchesParent = parentFilter === "all" || s.parent_category_id === parentFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && s.active) ||
        (statusFilter === "hidden" && !s.active);

      const matchesFeatured =
        featuredFilter === "all" ||
        (featuredFilter === "featured" && s.featured) ||
        (featuredFilter === "normal" && !s.featured);

      return matchesSearch && matchesParent && matchesStatus && matchesFeatured;
    });
  }, [subcategories, search, parentFilter, statusFilter, featuredFilter]);

  const stats = useMemo(() => {
    const total = subcategories.length;
    const active = subcategories.filter((s) => s.active).length;
    const featured = subcategories.filter((s) => s.featured).length;
    const totalProducts = subcategories.reduce((sum, s) => sum + s.product_count, 0);
    return { total, active, featured, totalProducts };
  }, [subcategories]);

  const hasActiveFilters =
    search.trim() !== "" ||
    parentFilter !== "all" ||
    statusFilter !== "all" ||
    featuredFilter !== "all";

  function resetFilters() {
    setSearch("");
    setParentFilter("all");
    setStatusFilter("all");
    setFeaturedFilter("all");
  }

  function handleCreate() {
    if (onCreate) {
      onCreate();
      return;
    }
    router.push("/subcategories/new");
  }

  function handleView(row: Subcategory) {
    if (onView) return onView(row);
    router.push(`/subcategories/${row.id}`);
  }

  function handleEdit(row: Subcategory) {
    if (onEdit) return onEdit(row);
    router.push(`/subcategories/${row.id}/edit`);
  }

  function handleDuplicate(row: Subcategory) {
    if (onDuplicate) return onDuplicate(row);
    // Backend integration happens later.
    console.log("duplicate", row.id);
  }

  function handleDelete(row: Subcategory) {
    if (onDelete) return onDelete(row);
    // Backend integration happens later.
    console.log("delete", row.id);
  }

  /* -------------------------------------------------------------- */
  /* Columns                                                          */
  /* -------------------------------------------------------------- */

  const columns = useMemo<ColumnDef<Subcategory>[]>(
    () => [
      {
        id: "image",
        header: "Image",
        enableSorting: false,
        cell: ({ row }) => {
          const subcategory = row.original;
          return subcategory.image ? (
            <Image
              src={subcategory.image}
              alt={subcategory.name}
              width={48}
              height={48}
              className="h-12 w-12 rounded-lg border object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-neutral-100">
              <FolderTree className="h-5 w-5 text-neutral-400" />
            </div>
          );
        },
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="-ml-3 h-8 text-xs font-semibold uppercase"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Name
            <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
          </Button>
        ),
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-ink">{row.original.name}</p>
            <code className="mt-1 inline-block rounded bg-neutral-100 px-2 py-0.5 text-xs text-ink-faint">
              {row.original.slug}
            </code>
          </div>
        ),
      },
      {
        accessorKey: "parent_category_name",
        header: "Parent Category",
        cell: ({ row }) => (
          <Badge variant="secondary">{row.original.parent_category_name}</Badge>
        ),
      },
      {
        accessorKey: "product_count",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="-ml-3 h-8 text-xs font-semibold uppercase"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Products
            <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-semibold">{row.original.product_count}</span>
        ),
      },
      {
        accessorKey: "featured",
        header: "Featured",
        cell: ({ row }) => (
          <Badge variant={row.original.featured ? "success" : "secondary"}>
            {row.original.featured ? "Featured" : "Normal"}
          </Badge>
        ),
      },
      {
        accessorKey: "active",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.original.active ? "success" : "danger"}>
            {row.original.active ? "Active" : "Hidden"}
          </Badge>
        ),
      },
      {
        accessorKey: "sort_order",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="-ml-3 h-8 text-xs font-semibold uppercase"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Sort Order
            <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
          </Button>
        ),
      },
      {
        accessorKey: "updated_at",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="-ml-3 h-8 text-xs font-semibold uppercase"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Updated
            <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-ink-faint">
            {new Date(row.original.updated_at).toLocaleDateString()}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const subcategory = row.original;
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={`Actions for ${subcategory.name}`}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleView(subcategory)}>
                    <Eye className="mr-2 h-4 w-4" />
                    View
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleEdit(subcategory)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDuplicate(subcategory)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleDelete(subcategory)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onView, onEdit, onDuplicate, onDelete, router]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const rows = table.getRowModel().rows;

  /* -------------------------------------------------------------- */
  /* Render                                                            */
  /* -------------------------------------------------------------- */

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Subcategories</h1>
          <p className="mt-1 text-sm text-ink-faint">
            Manage subcategories nested under your parent categories
          </p>
        </div>

        <Button onClick={handleCreate} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add Subcategory
        </Button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-faint">Total Subcategories</p>
            <Layers className="h-4 w-4 text-ink-faint" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-ink">{stats.total}</p>
        </Card>

        <Card className="rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-faint">Active</p>
            <FolderTree className="h-4 w-4 text-ink-faint" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-ink">{stats.active}</p>
        </Card>

        <Card className="rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-faint">Featured</p>
            <Sparkles className="h-4 w-4 text-ink-faint" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-ink">{stats.featured}</p>
        </Card>

        <Card className="rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-faint">Total Products</p>
            <Package className="h-4 w-4 text-ink-faint" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-ink">{stats.totalProducts}</p>
        </Card>
      </div>

      {/* TABLE CARD */}
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        {/* FILTERS */}
        <div className="flex flex-col gap-3 border-b border-line px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subcategories..."
              className="pl-9"
              aria-label="Search subcategories"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={parentFilter} onValueChange={setParentFilter}>
              <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filter by parent category">
                <ListFilter className="mr-2 h-4 w-4 text-ink-faint" />
                <SelectValue placeholder="Parent Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Parents</SelectItem>
                {parentCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-full sm:w-[140px]" aria-label="Filter by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={featuredFilter}
              onValueChange={(v) => setFeaturedFilter(v as FeaturedFilter)}
            >
              <SelectTrigger className="w-full sm:w-[140px]" aria-label="Filter by featured">
                <SelectValue placeholder="Featured" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="featured">Featured</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Clear filters
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm">
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(Boolean(value))}
                    >
                      {column.id.replace(/_/g, " ")}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <Table className="min-w-[1100px]">
            <TableHeader className="bg-neutral-50">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="text-xs font-semibold uppercase">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    {columns.map((col, colIndex) => (
                      <TableCell key={`${col.id ?? colIndex}-${i}`}>
                        <div className="h-4 w-full max-w-[140px] animate-pulse rounded bg-neutral-100" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : rows.length > 0 ? (
                rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-neutral-50">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-64">
                    <div className="flex flex-col items-center justify-center gap-3 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100">
                        <FolderTree className="h-6 w-6 text-neutral-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-ink">No subcategories found</p>
                        <p className="mt-1 text-sm text-ink-faint">
                          {hasActiveFilters
                            ? "Try adjusting your search or filters."
                            : "Get started by adding your first subcategory."}
                        </p>
                      </div>
                      {hasActiveFilters ? (
                        <Button variant="secondary" size="sm" onClick={resetFilters}>
                          Clear filters
                        </Button>
                      ) : (
                        <Button size="sm" onClick={handleCreate}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Subcategory
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* PAGINATION */}
        {!isLoading && rows.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-line px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-faint">
              Showing{" "}
              <span className="font-medium text-ink">
                {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium text-ink">
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) *
                    table.getState().pagination.pageSize,
                  filteredData.length
                )}
              </span>{" "}
              of <span className="font-medium text-ink">{filteredData.length}</span> subcategories
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>

              <span className="text-sm text-ink-faint">
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {Math.max(table.getPageCount(), 1)}
              </span>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}