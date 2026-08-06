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

import {
  deleteSubCategory,
  toggleSubCategoryFeatured,
  toggleSubCategoryStatus,
} from "@/services/subcategory.service";

interface SubCategoryActionsProps {
  subCategoryId: number;
  featured?: boolean;
  active?: boolean;
}

export function SubCategoryActions({
  subCategoryId,
  featured = false,
  active = true,
}: SubCategoryActionsProps) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Delete this sub category?")) return;

    try {
      await deleteSubCategory(subCategoryId);
      router.refresh();
    } catch {
      alert("Failed to delete sub category.");
    }
  }

  async function handleFeatured() {
    try {
      await toggleSubCategoryFeatured(
        subCategoryId,
        !featured
      );

      router.refresh();
    } catch {
      alert("Failed to update.");
    }
  }

  async function handleStatus() {
    try {
      await toggleSubCategoryStatus(
        subCategoryId,
        !active
      );

      router.refresh();
    } catch {
      alert("Failed to update.");
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

          <Link href={`/subcategories/${subCategoryId}`}>

            <Eye className="mr-2 h-4 w-4" />

            View

          </Link>

        </DropdownMenuItem>

        <DropdownMenuItem asChild>

          <Link href={`/subcategories/${subCategoryId}/edit`}>

            <Pencil className="mr-2 h-4 w-4" />

            Edit

          </Link>

        </DropdownMenuItem>

        <DropdownMenuItem>

          <Copy className="mr-2 h-4 w-4" />

          Duplicate

        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleFeatured}
        >

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

        <DropdownMenuItem
          onClick={handleStatus}
        >

          {active ? (
            <>
              <EyeOff className="mr-2 h-4 w-4" />
              Hide Sub Category
            </>
          ) : (
            <>
              <Eye className="mr-2 h-4 w-4" />
              Activate Sub Category
            </>
          )}

        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleDelete}
          className="text-danger focus:text-danger"
        >

          <Trash2 className="mr-2 h-4 w-4" />

          Delete Sub Category

        </DropdownMenuItem>

      </DropdownMenuContent>

    </DropdownMenu>
  );
}