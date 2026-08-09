"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { notFound } from "next/navigation";

import { SubCategoryForm } from "@/components/subcategories/subcategory-form";

import { getSubCategory } from "@/services/subcategory.service";
import type { SubCategory } from "@/types/subcategory";

export default function EditSubCategoryPage() {
  const params = useParams<{ id: string }>();

  const [subcategory, setSubCategory] = useState<SubCategory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const id = Number(params.id);

    if (!Number.isFinite(id)) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    async function load() {
      try {
        const data = await getSubCategory(id);

        if (!data) {
          setHasError(true);
          return;
        }

        setSubCategory(data);
      } catch {
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [params.id]);

  if (hasError) {
    notFound();
  }

  if (isLoading || !subcategory) {
    return null;
  }

  return (
    <div className="space-y-8">
      <SubCategoryForm mode="edit" initialData={subcategory} />
    </div>
  );
}