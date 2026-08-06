import Link from "next/link";
import {
  ArrowLeft,
  FolderPlus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { CategoryForm } from "@/components/categories/category-form";

export default function AddCategoryPage() {
  return (
    <div className="space-y-8">

      {/* Header */}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

        <div>

          <Link
            href="/categories"
            className="inline-flex items-center gap-2 text-sm text-ink-faint transition hover:text-brand-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Categories
          </Link>

          <div className="mt-4 flex items-center gap-3">

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
              <FolderPlus className="h-6 w-6 text-brand-600" />
            </div>

            <div>

              <h1 className="text-3xl font-bold tracking-tight text-ink">
                Add New Category
              </h1>

              <p className="mt-1 text-sm text-ink-faint">
                Create a new category to organize your catalogue.
              </p>

            </div>

          </div>

        </div>

        <div className="flex gap-3">

          <Button variant="secondary">
            Save Draft
          </Button>

          <Button>
            Create Category
          </Button>

        </div>

      </div>

      <CategoryForm mode="create" />

    </div>
  );
}