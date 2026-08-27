"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, TriangleAlert, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCategories } from "@/services/category.service";

import {
  createSubCategory,
  updateSubCategory,
} from "@/services/subcategory.service";

import type { Category } from "@/types/category";
import type {
  SubCategory,
  CreateSubCategoryPayload,
} from "@/types/subcategory";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Props {
  mode: "create" | "edit";
  initialData?: SubCategory;
}

/* ------------------------------------------------------------------ */
/* Static data                                                         */
/* ------------------------------------------------------------------ */

const MAX_IMAGE_SIZE_MB = 5;
const DESCRIPTION_MAX_LENGTH = 500;

const EMPTY_FORM: CreateSubCategoryPayload = {
  name: "",
  slug: "",
  description: "",
  category: 0,
  image: "",
  featured: false,
  active: true,
  sort_order: 0,
};

type FormErrors = Partial<Record<keyof CreateSubCategoryPayload, string>>;
type TouchedFields = Partial<Record<keyof CreateSubCategoryPayload, boolean>>;

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function validateForm(form: CreateSubCategoryPayload): FormErrors {
  const errors: FormErrors = {};

  const name = form.name.trim();
  if (!name) {
    errors.name = "Subcategory name is required.";
  } else if (name.length < 2) {
    errors.name = "Name must be at least 2 characters.";
  } else if (name.length > 100) {
    errors.name = "Name must be under 100 characters.";
  }

  const slug = form.slug.trim();
  if (!slug) {
    errors.slug = "Slug is required.";
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    errors.slug = "Use lowercase letters, numbers, and hyphens only.";
  }

  if (!form.category) {
    errors.category = "Select a parent category.";
  }

  if (!Number.isFinite(form.sort_order) || form.sort_order < 0) {
    errors.sort_order = "Sort order must be zero or greater.";
  }

  if (form.description.length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `Description must be under ${DESCRIPTION_MAX_LENGTH} characters.`;
  }

  return errors;
}

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}

function Field({ label, htmlFor, error, hint, required, children }: FieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>
        {label}
        {required && (
          <span className="ml-0.5 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </Label>

      {children}

      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-sm text-ink-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

export function SubCategoryForm({ mode, initialData }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<CreateSubCategoryPayload>(EMPTY_FORM);
  const [manualSlug, setManualSlug] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<TouchedFields>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDraggingImage, setIsDraggingImage] = useState(false);

  useEffect(() => {
    async function loadCategories() {
  try {
    const { categories } = await getCategories();

    console.log("CATEGORIES =", categories);

    setCategories(categories);
  } catch (err) {
    console.error(err);
  }
}

    loadCategories();
  }, []);

  useEffect(() => {
    if (!initialData) return;

    setForm({
  name: initialData.name,
  slug: initialData.slug,
  description: initialData.description,
  category: Number(initialData.category),
  image: initialData.image ?? "",
  featured: initialData.featured,
  active: initialData.active,
  sort_order: initialData.sort_order,
});
console.log("CATEGORY ID =", initialData.category);
console.log("INITIAL DATA =", initialData);
console.log("FORM =", form);

    setManualSlug(true);
  }, [initialData]);
useEffect(() => {
  console.log("FORM CHANGED =>", form);
}, [form]);
  useEffect(() => {
    if (manualSlug) return;

    setForm((prev) => ({ ...prev, slug: slugify(prev.name) }));
  }, [form.name, manualSlug]);

  useEffect(() => {
    if (!previewFile) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(previewFile);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [previewFile]);

  function update<K extends keyof CreateSubCategoryPayload>(
    key: K,
    value: CreateSubCategoryPayload[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setTouched((prev) => ({ ...prev, [key]: true }));
  }

  function markTouched(key: keyof CreateSubCategoryPayload) {
    setTouched((prev) => ({ ...prev, [key]: true }));
  }

  function fieldError(key: keyof CreateSubCategoryPayload): string | undefined {
    return touched[key] ? errors[key] : undefined;
  }

  function handleImageFile(file: File | null) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, image: "Please choose an image file." }));
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        image: `Image must be under ${MAX_IMAGE_SIZE_MB}MB.`,
      }));
      return;
    }

    setErrors((prev) => ({ ...prev, image: undefined }));
    setPreviewFile(file);
    update("image", file);
  }

  function removeImage() {
    setPreviewFile(null);
    update("image", "");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const validationErrors = validateForm(form);
    setErrors(validationErrors);
    setTouched({
      name: true,
      slug: true,
      description: true,
      category: true,
      sort_order: true,
    });

    if (Object.keys(validationErrors).length > 0) return;

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      if (mode === "create") {
        await createSubCategory({
          ...form,
          category: Number(form.category),
        });
      } else {
        if (!initialData) {
          throw new Error("Subcategory not found.");
        }

        await updateSubCategory(
          Number(initialData.id),
          {
            ...form,
            category: Number(form.category),
          }
        );
      }

      router.push("/subcategories");
      router.refresh();
    } catch (error: any) {
      setSubmitError(
        error?.response?.data?.detail ??
          "Something went wrong while saving."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSaveDraft() {
    if (!form.name.trim()) {
      setErrors((prev) => ({ ...prev, name: "Subcategory name is required." }));
      setTouched((prev) => ({ ...prev, name: true }));
      return;
    }

    setSubmitError(null);
    setIsSavingDraft(true);

    try {
      const payload = {
        ...form,
        active: false,
        category: Number(form.category),
      };

      if (mode === "create") {
        await createSubCategory(payload);
      } else {
        if (!initialData) {
          throw new Error("Subcategory not found.");
        }

        await updateSubCategory(
          Number(initialData.id),
          payload
        );
      }

      router.push("/subcategories");
      router.refresh();
    } catch (error: any) {
      setSubmitError(
        error?.response?.data?.detail ??
          "Couldn't save your draft."
      );
    } finally {
      setIsSavingDraft(false);
    }
  }

  const isBusy = isSubmitting || isSavingDraft;
  const displayImage =
    previewUrl ??
    (typeof form.image === "string" && form.image.trim()
      ? form.image.trim()
      : null);

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      {submitError && (
        <div
          role="alert"
          aria-live="polite"
          className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{submitError}</p>
        </div>
      )}

      {/* GENERAL */}
      <Card className="rounded-2xl p-6">
        <h2 className="text-lg font-semibold">General Information</h2>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field label="Subcategory Name" htmlFor="name" required error={fieldError("name")}>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              onBlur={() => markTouched("name")}
              aria-required="true"
              aria-invalid={Boolean(fieldError("name"))}
              aria-describedby={fieldError("name") ? "name-error" : undefined}
              maxLength={100}
            />
          </Field>

          <Field
            label="Slug"
            htmlFor="slug"
            required
            error={fieldError("slug")}
            hint={!fieldError("slug") ? "Auto-generated from the name until edited." : undefined}
          >
            <Input
              id="slug"
              value={form.slug}
              onChange={(e) => {
                setManualSlug(true);
                update("slug", e.target.value);
              }}
              onBlur={() => markTouched("slug")}
              aria-required="true"
              aria-invalid={Boolean(fieldError("slug"))}
              aria-describedby={fieldError("slug") ? "slug-error" : "slug-hint"}
            />
          </Field>
        </div>

        <div className="mt-5">
          <Field
            label="Description"
            htmlFor="description"
            error={fieldError("description")}
            hint={
              !fieldError("description")
                ? `${form.description.length}/${DESCRIPTION_MAX_LENGTH}`
                : undefined
            }
          >
            <Textarea
              id="description"
              rows={5}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              onBlur={() => markTouched("description")}
              aria-invalid={Boolean(fieldError("description"))}
              aria-describedby={
                fieldError("description") ? "description-error" : "description-hint"
              }
            />
          </Field>
        </div>
      </Card>

      {/* ORGANIZATION */}
      <Card className="rounded-2xl p-6">
        <h2 className="text-lg font-semibold">Organization</h2>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field
            label="Parent Category"
            htmlFor="category"
            required
            error={fieldError("category")}

          >
            
            <Select
  value={
    form.category > 0
      ? String(form.category)
      : undefined
  }
  onValueChange={(value) =>
    update("category", Number(value))
  }
>
  <SelectTrigger
    id="category"
    aria-invalid={Boolean(fieldError("category"))}
    aria-describedby={
      fieldError("category")
        ? "category-error"
        : undefined
    }
    onBlur={() => markTouched("category")}
  >
    <SelectValue placeholder="Select a parent category" />
  </SelectTrigger>

  <SelectContent>
    {categories.map((category) => (
      <SelectItem
        key={category.id}
        value={String(category.id)}
      >
        {category.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
          </Field>

          <Field label="Sort Order" htmlFor="sort_order" error={fieldError("sort_order")}>
            <Input
              id="sort_order"
              type="number"
              min={0}
              inputMode="numeric"
              value={form.sort_order}
              onChange={(e) => update("sort_order", Number(e.target.value))}
              onBlur={() => markTouched("sort_order")}
              aria-invalid={Boolean(fieldError("sort_order"))}
              aria-describedby={fieldError("sort_order") ? "sort_order-error" : undefined}
            />
          </Field>
        </div>
      </Card>

      {/* DISPLAY */}
      <Card className="rounded-2xl p-6">
        <h2 className="text-lg font-semibold">Display</h2>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field label="Image URL" htmlFor="image" error={fieldError("image")}>
            <Input
              id="image"
              value={typeof form.image === "string" ? form.image : ""}
              onChange={(e) => {
                setPreviewFile(null);
                update("image", e.target.value);
              }}
              placeholder="https://..."
            />
          </Field>
        </div>

        <div className="mt-8">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => handleImageFile(e.target.files?.[0] ?? null)}
          />

          {displayImage ? (
            <div className="relative overflow-hidden rounded-xl border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={displayImage}
                alt="Subcategory preview"
                className="h-48 w-full object-cover"
              />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute right-2 top-2"
                onClick={removeImage}
                aria-label="Remove image"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div
              role="button"
              tabIndex={0}
              aria-label="Upload subcategory image, drag and drop or press enter to browse"
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingImage(true);
              }}
              onDragLeave={() => setIsDraggingImage(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingImage(false);
                handleImageFile(e.dataTransfer.files?.[0] ?? null);
              }}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isDraggingImage ? "border-primary bg-primary/5" : ""
              }`}
            >
              <ImagePlus className="h-10 w-10 text-ink-faint" />
              <p className="mt-3 text-sm text-ink-faint">
                Drag and drop an image, or click to browse
              </p>
              <p className="mt-1 text-xs text-ink-faint">
                Upload will be connected to Cloudinary. PNG, JPG up to {MAX_IMAGE_SIZE_MB}MB.
              </p>
            </div>
          )}

          {fieldError("image") && (
            <p role="alert" className="mt-2 text-sm text-destructive">
              {fieldError("image")}
            </p>
          )}
        </div>
      </Card>

      {/* SETTINGS */}
      <Card className="rounded-2xl p-6">
        <h2 className="text-lg font-semibold">Visibility</h2>

        <div className="mt-6 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">Featured</p>
              <p className="text-sm text-ink-faint">Display on parent category page</p>
            </div>
            <Switch
              checked={form.featured}
              onCheckedChange={(v) => update("featured", v)}
              aria-label="Featured"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">Active</p>
              <p className="text-sm text-ink-faint">Visible to customers</p>
            </div>
            <Switch
              checked={form.active}
              onCheckedChange={(v) => update("active", v)}
              aria-label="Active"
            />
          </div>
        </div>
      </Card>

      {/* FOOTER */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          disabled={isBusy}
          onClick={() => router.back()}
        >
          Cancel
        </Button>

        <Button
          type="button"
          variant="secondary"
          disabled={isBusy}
          onClick={handleSaveDraft}
        >
          {isSavingDraft && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Draft
        </Button>

        <Button type="submit" disabled={isBusy}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === "create" ? "Create Subcategory" : "Update Subcategory"}
        </Button>
      </div>
    </form>
  );
}