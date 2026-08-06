"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Eye,
  Pencil,
  Copy,
  Star,
  StarOff,
  EyeOff,
  Trash2,
  MoreHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import { deleteCategory } from "@/services/category.service";

interface CategoryActionsProps {
  categoryId: number;
  featured?: boolean;
  active?: boolean;
}

export function CategoryActions({
  categoryId,
  featured = false,
  active = true,
}: CategoryActionsProps) {
  const router = useRouter();

  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this category?"
    );

    if (!confirmed) return;

    try {
      await deleteCategory(categoryId);

      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Failed to delete category.");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
        >
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-56"
      >
        <DropdownMenuItem asChild>
          <Link href={`/categories/${categoryId}`}>
            <Eye className="mr-2 h-4 w-4" />
            View
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href={`/categories/${categoryId}/edit`}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem>
          <Copy className="mr-2 h-4 w-4" />
          Duplicate
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem>
          {featured ? (
            <>
              <StarOff className="mr-2 h-4 w-4" />
              Remove Featured
            </>
          ) : (
            <>
              <Star className="mr-2 h-4 w-4" />
              Mark as Featured
            </>
          )}
        </DropdownMenuItem>

        <DropdownMenuItem>
          {active ? (
            <>
              <EyeOff className="mr-2 h-4 w-4" />
              Hide Category
            </>
          ) : (
            <>
              <Eye className="mr-2 h-4 w-4" />
              Activate Category
            </>
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleDelete}
          className="text-danger focus:text-danger"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Category
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}