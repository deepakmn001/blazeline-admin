import Link from "next/link";
import {
  FolderTree,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";

export function CategoryEmpty() {
  return (
    <div className="rounded-3xl border border-dashed border-line bg-white px-8 py-20 text-center shadow-sm">

      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-50">

        <FolderTree className="h-10 w-10 text-brand-600" />

      </div>

      <h2 className="mt-6 text-2xl font-semibold tracking-tight text-ink">
        No Categories Yet
      </h2>

      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-ink-faint">
        Start organizing your BlazeLine catalogue by creating your first
        category. Categories help customers browse products, improve
        navigation, power search filters, and structure the entire catalog.
      </p>

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">

        <Button
          asChild
          size="lg"
        >
          <Link href="/categories/new">

            <Plus className="h-4 w-4" />

            Create First Category

          </Link>
        </Button>

      </div>

    </div>
  );
}