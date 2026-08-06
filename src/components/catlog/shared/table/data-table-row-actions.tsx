"use client";

import Link from "next/link";

import {
  MoreHorizontal,
  Eye,
  Pencil,
  Copy,
  Star,
  Archive,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DataTableRowActionsProps {
  viewHref?: string;

  editHref?: string;

  onDuplicate?: () => void;

  onFeature?: () => void;

  onArchive?: () => void;

  onDelete?: () => void;

  showView?: boolean;

  showEdit?: boolean;

  showDuplicate?: boolean;

  showFeature?: boolean;

  showArchive?: boolean;

  showDelete?: boolean;
}

export function DataTableRowActions({
  viewHref,
  editHref,

  onDuplicate,
  onFeature,
  onArchive,
  onDelete,

  showView = true,
  showEdit = true,
  showDuplicate = true,
  showFeature = false,
  showArchive = true,
  showDelete = true,
}: DataTableRowActionsProps) {
  return (
    <DropdownMenu>

      <DropdownMenuTrigger asChild>

        <Button
          variant="ghost"
          size="icon"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>

      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-52"
      >

        {showView && viewHref && (
          <DropdownMenuItem asChild>

            <Link href={viewHref}>

              <Eye className="mr-2 h-4 w-4" />

              View

            </Link>

          </DropdownMenuItem>
        )}

        {showEdit && editHref && (
          <DropdownMenuItem asChild>

            <Link href={editHref}>

              <Pencil className="mr-2 h-4 w-4" />

              Edit

            </Link>

          </DropdownMenuItem>
        )}

        {showDuplicate && (
          <DropdownMenuItem onClick={onDuplicate}>

            <Copy className="mr-2 h-4 w-4" />

            Duplicate

          </DropdownMenuItem>
        )}

        {showFeature && (
          <DropdownMenuItem onClick={onFeature}>

            <Star className="mr-2 h-4 w-4" />

            Feature

          </DropdownMenuItem>
        )}

        {showArchive && (
          <DropdownMenuItem onClick={onArchive}>

            <Archive className="mr-2 h-4 w-4" />

            Archive

          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {showDelete && (
          <DropdownMenuItem
            className="text-red-600"
            onClick={onDelete}
          >
            <Trash2 className="mr-2 h-4 w-4" />

            Delete

          </DropdownMenuItem>
        )}

      </DropdownMenuContent>

    </DropdownMenu>
  );
}