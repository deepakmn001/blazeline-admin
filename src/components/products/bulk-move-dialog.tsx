"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { getCategories } from "@/services/category.service";
import { getSubCategories } from "@/services/subcategory.service";

import type { Category } from "@/types/category";
import type { SubCategory } from "@/types/subcategory";

interface BulkMoveDialogProps {
  open: boolean;
  count: number;
  isMoving: boolean;
  onConfirm: (categoryId: number, subcategoryId: number) => void;
  onClose: () => void;
}

export function BulkMoveDialog({
  open,
  count,
  isMoving,
  onConfirm,
  onClose,
}: BulkMoveDialogProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [isLoadingSubCategories, setIsLoadingSubCategories] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<number | "">("");
  const [selectedSubCategory, setSelectedSubCategory] = useState<number | "">("");

  // This component itself stays mounted across open/close (only the
  // Dialog's internal content visibility toggles), so this only ever
  // runs once — same one-time-load pattern as ProductToolbar.
  useEffect(() => {
    let isMounted = true;

    async function loadCategories() {
      try {
        const { categories } = await getCategories();
        if (isMounted) setCategories(categories);
      } catch (err) {
        console.error(err);
      }
    }

    loadCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fresh form every time the dialog is opened.
  useEffect(() => {
    if (open) {
      setSelectedCategory("");
      setSelectedSubCategory("");
      setSubCategories([]);
    }
  }, [open]);

  // Category → subcategory cascade — identical pattern to ProductToolbar.
  useEffect(() => {
    let isMounted = true;

    async function loadSubCategories(categoryId: number) {
      setIsLoadingSubCategories(true);
      try {
        const { subcategories } = await getSubCategories({ category: categoryId });
        if (isMounted) setSubCategories(subcategories);
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setIsLoadingSubCategories(false);
      }
    }

    if (selectedCategory !== "") {
      loadSubCategories(selectedCategory);
    } else {
      setSubCategories([]);
    }

    return () => {
      isMounted = false;
    };
  }, [selectedCategory]);

  const handleCategoryChange = useCallback((value: string) => {
    setSelectedCategory(value ? Number(value) : "");
    setSelectedSubCategory("");
  }, []);

  const handleSubCategoryChange = useCallback((value: string) => {
    setSelectedSubCategory(value ? Number(value) : "");
  }, []);

  const canSubmit =
    selectedCategory !== "" && selectedSubCategory !== "" && !isMoving;

  const handleSubmit = useCallback(() => {
    if (selectedCategory === "" || selectedSubCategory === "") return;
    onConfirm(selectedCategory, selectedSubCategory);
  }, [selectedCategory, selectedSubCategory, onConfirm]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !isMoving) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Move {count} product{count === 1 ? "" : "s"}
          </DialogTitle>
          <DialogDescription>
            Choose a category and subcategory to move the selected product
            {count === 1 ? "" : "s"} into.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="bulk-move-category" className="mb-1.5 block text-sm font-medium text-ink">
              Category
            </Label>
            <Select
              value={selectedCategory === "" ? "" : String(selectedCategory)}
              onValueChange={handleCategoryChange}
              disabled={isMoving}
            >
              <SelectTrigger
                id="bulk-move-category"
                aria-label="Category"
                className="h-11 w-full rounded-xl border-line bg-white text-sm"
              >
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="bulk-move-subcategory" className="mb-1.5 block text-sm font-medium text-ink">
              Subcategory
            </Label>
            <Select
              value={selectedSubCategory === "" ? "" : String(selectedSubCategory)}
              onValueChange={handleSubCategoryChange}
              disabled={isMoving || selectedCategory === "" || isLoadingSubCategories}
            >
              <SelectTrigger
                id="bulk-move-subcategory"
                aria-label="Subcategory"
                className="h-11 w-full rounded-xl border-line bg-white text-sm"
              >
                <SelectValue
                  placeholder={
                    selectedCategory === ""
                      ? "Select a category first"
                      : isLoadingSubCategories
                      ? "Loading…"
                      : "Select a subcategory"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {subCategories.map((sc) => (
                  <SelectItem key={sc.id} value={String(sc.id)}>
                    {sc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isMoving}
            className="rounded-xl"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            aria-busy={isMoving}
            className="gap-2 rounded-xl"
          >
            {isMoving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Moving…
              </>
            ) : (
              `Move ${count === 1 ? "product" : "products"}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}