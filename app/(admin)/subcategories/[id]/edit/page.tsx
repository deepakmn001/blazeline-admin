"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { SubCategoryForm } from "@/components/subcategories/subcategory-form";
import { getSubCategory } from "@/services/subcategory.service";
import type { SubCategory } from "@/types/subcategory";

export default function EditSubCategoryPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [subcategory, setSubCategory] =
    useState<SubCategory | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const rawId = params?.id;
    const id = Number(rawId);

    if (!Number.isInteger(id) || id <= 0) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const data = await getSubCategory(id);

        if (cancelled) {
          return;
        }

        setSubCategory(data);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          "[EditSubCategoryPage] Failed to load subcategory:",
          error
        );

        setHasError(true);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [params?.id]);

  useEffect(() => {
    if (!hasError) {
      return;
    }

    router.replace("/subcategories");
  }, [hasError, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!subcategory) {
    return null;
  }

  return (
    <div className="space-y-8">
      <SubCategoryForm
        mode="edit"
        initialData={subcategory}
      />
    </div>
  );
}