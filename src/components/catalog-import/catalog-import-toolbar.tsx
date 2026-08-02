"use client";

/**
 * src/components/catalog-import/catalog-import-toolbar.tsx
 *
 * Single-file component for catalog import toolbar with modal dialog.
 * Fixed TypeScript types for react-hook-form, zod, and watch() usage.
 *
 * Subcategories are no longer fetched all at once on page load and
 * filtered client-side. Instead, they are fetched lazily from the API
 * whenever a category is selected (GET /subcategories/?category=<id>).
 */

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as LabelPrimitive from "@radix-ui/react-label";
import { useForm, SubmitHandler, UseFormReturn } from "react-hook-form";
import { z, ZodType } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import axios, { type AxiosProgressEvent } from "axios";
import {
  X,
  FileText,
  UploadCloud,
  Loader2,
  Upload,
  Search,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";

/* ------------------------------------------------------------------ */
/* 1. Shared config / constants                                       */
/* ------------------------------------------------------------------ */

const MAX_FILE_SIZE_MB = Number(
  process.env.NEXT_PUBLIC_CATALOG_IMPORT_MAX_FILE_SIZE_MB ?? 25
);
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const BRANDS_ENDPOINT =
  process.env.NEXT_PUBLIC_CATALOG_BRANDS_ENDPOINT || null;
const CATEGORIES_ENDPOINT = "/categories/";
const SUBCATEGORIES_ENDPOINT = "/subcategories/";

const PDF_FILE_FIELD = "pdf";
const JSON_FILE_FIELD = "json_file";

/* ------------------------------------------------------------------ */
/* 2. Validation schemas                                              */
/* ------------------------------------------------------------------ */

const baseFields = {
  brand: z
    .string()
    .trim()
    .min(1, "Brand is required")
    .max(120, "Brand must be under 120 characters"),
  category: z
    .string()
    .trim()
    .min(1, "Category is required"),
  subcategory: z
    .string()
    .trim()
    .min(1, "Sub Category is required"),
};

function fileSchema(options: {
  extension: string;
  mimeTypes: string[];
  label: string;
}) {
  return z
    .custom<File>(
      (val) => typeof File !== "undefined" && val instanceof File,
      { message: `A ${options.label} file is required` }
    )
    .refine((file) => file.size > 0, "The selected file is empty")
    .refine(
      (file) => file.size <= MAX_FILE_SIZE_BYTES,
      `File must be smaller than ${MAX_FILE_SIZE_MB}MB`
    )
    .refine(
      (file) =>
        file.name.toLowerCase().endsWith(options.extension) ||
        options.mimeTypes.includes(file.type),
      `Only ${options.extension} files are accepted`
    );
}

const pdfImportSchema = z.object({
  ...baseFields,
  file: fileSchema({
    extension: ".pdf",
    mimeTypes: ["application/pdf"],
    label: "PDF",
  }),
});

const jsonImportSchema = z.object({
  ...baseFields,
  file: fileSchema({
    extension: ".json",
    mimeTypes: ["application/json", "text/json", "text/plain"],
    label: "JSON",
  }),
});

type PdfImportSchemaType = z.infer<typeof pdfImportSchema>;
type JsonImportSchemaType = z.infer<typeof jsonImportSchema>;

/* ------------------------------------------------------------------ */
/* 3. UI primitives                                                   */
/* ------------------------------------------------------------------ */

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2",
        "rounded-2xl border border-line bg-white p-6 shadow-xl",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "focus:outline-none",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        className={cn(
          "absolute right-4 top-4 rounded-lg p-1 text-ink-faint transition-colors",
          "hover:bg-black/[0.04] hover:text-ink",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-100",
          "disabled:pointer-events-none"
        )}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mb-4 flex flex-col gap-1.5", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold tracking-tight text-ink", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-ink-faint", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

/* ---- Tabs ------------------------------------------------------------ */

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center gap-1 rounded-xl bg-black/[0.03] p-1",
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex flex-1 items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5",
      "text-[13px] font-medium text-ink-faint transition-all",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-100",
      "disabled:pointer-events-none disabled:opacity-50",
      "data-[state=active]:bg-white data-[state=active]:text-ink data-[state=active]:shadow-card",
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("mt-4 focus-visible:outline-none", className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

/* ---- Label ------------------------------------------------------------ */

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      "text-[13px] font-medium leading-none text-ink",
      "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
      className
    )}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

/* ---- Select (native, styled to match Input) --------------------------- */

const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "h-9 w-full rounded-lg border border-line bg-white px-3 text-[13px] text-ink",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-100",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    {children}
  </select>
));
NativeSelect.displayName = "NativeSelect";

/* ---- FileDropzone ------------------------------------------------------ */

interface FileDropzoneProps {
  accept: string;
  acceptLabel: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  error?: string;
  disabled?: boolean;
  id?: string;
}

function FileDropzone({
  accept,
  acceptLabel,
  file,
  onFileChange,
  error,
  disabled,
  id,
}: FileDropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = React.useState(false);

  const handleFiles = (fileList: FileList | null) => {
    const nextFile = fileList?.[0] ?? null;
    onFileChange(nextFile);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    if (disabled) return;
    handleFiles(event.dataTransfer.files);
  };

  const handleRemove = (event: React.MouseEvent) => {
    event.stopPropagation();
    onFileChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!disabled) inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragActive(true);
        }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={handleDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center transition-colors",
          isDragActive
            ? "border-brand-400 bg-brand-50"
            : "border-line bg-black/[0.015] hover:border-ink/20",
          error && "border-danger/50 bg-danger/[0.03]",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          disabled={disabled}
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
        />

        {file ? (
          <div className="flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-white px-3 py-2 text-left">
            <div className="flex min-w-0 items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-brand-500" />
              <span className="truncate text-[13px] text-ink">{file.name}</span>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled}
              className="shrink-0 rounded-md p-1 text-ink-faint transition-colors hover:bg-black/[0.05] hover:text-ink"
              aria-label="Remove file"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <>
            <UploadCloud className="h-6 w-6 text-ink-faint" />
            <p className="text-[13px] text-ink-soft">
              <span className="font-medium text-brand-600">Click to upload</span>{" "}
              or drag and drop
            </p>
            <p className="text-[12px] text-ink-faint">
              {acceptLabel} files only · up to {MAX_FILE_SIZE_MB}MB
            </p>
          </>
        )}
      </div>
      {error && <p className="text-[12.5px] text-danger">{error}</p>}
    </div>
  );
}

/* ---- ProgressBar -------------------------------------------------------- */

interface ProgressBarProps {
  value: number;
  className?: string;
}

function ProgressBar({ value, className }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06]",
        className
      )}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-brand-500 transition-[width] duration-200 ease-out"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 4. DRF error parsing                                               */
/* ------------------------------------------------------------------ */

function extractApiErrorMessage(data: unknown, fallback: string): string {
  if (typeof data === "string" && data.trim()) return data;

  if (Array.isArray(data)) {
    const strings = data.filter(
      (item): item is string => typeof item === "string" && item.trim().length > 0
    );
    if (strings.length > 0) return strings.join(" ");
    return fallback;
  }

  if (!data || typeof data !== "object") return fallback;

  const obj = data as Record<string, unknown>;

  if (typeof obj.detail === "string" && obj.detail.trim()) return obj.detail;
  if (typeof obj.error === "string" && obj.error.trim()) return obj.error;
  if (typeof obj.message === "string" && obj.message.trim()) return obj.message;

  const fieldMessages: string[] = [];
  for (const [field, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      const strings = value.filter(
        (item): item is string => typeof item === "string" && item.trim().length > 0
      );
      if (strings.length > 0) {
        const label = field === "non_field_errors" ? null : field;
        fieldMessages.push(label ? `${label}: ${strings.join(" ")}` : strings.join(" "));
      }
    } else if (typeof value === "string" && value.trim()) {
      fieldMessages.push(field === "non_field_errors" ? value : `${field}: ${value}`);
    }
  }

  if (fieldMessages.length > 0) return fieldMessages.join("\n");

  return fallback;
}

/* ------------------------------------------------------------------ */
/* 5. Category Hierarchy & Brand Hooks                                */
/* ------------------------------------------------------------------ */

export interface SubCategoryItem {
  id: string | number;
  name: string;
  slug?: string;
  category: string | number;
  [key: string]: unknown;
}

export interface CategoryItem {
  id: string | number;
  name: string;
  slug?: string;
  subcategories?: SubCategoryItem[];
  sub_categories?: SubCategoryItem[];
  children?: SubCategoryItem[];
  [key: string]: unknown;
}

type OptionShape = string | { name?: string; label?: string; [key: string]: unknown };

function normalizeOptions(payload: unknown): string[] | null {
  const list: unknown = Array.isArray(payload)
    ? payload
    : (payload as { results?: unknown } | null)?.results;

  if (!Array.isArray(list) || list.length === 0) return null;

  const names = (list as OptionShape[])
    .map((item) => (typeof item === "string" ? item : item.name ?? item.label))
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0);

  return names.length > 0 ? names : null;
}

function useCatalogBrands(endpoint: string | null) {
  const [options, setOptions] = React.useState<string[] | null>(null);

  React.useEffect(() => {
    if (!endpoint) {
      setOptions(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await api.get(endpoint);
        if (!cancelled) setOptions(normalizeOptions(res.data));
      } catch {
        if (!cancelled) setOptions(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  return options;
}

// NOTE: This hook now only loads categories. Subcategories are fetched
// lazily per-category-selection inside CatalogImportForm (see
// handleCategoryChange), instead of being loaded in full up front.
function useCategoryHierarchy() {
  const [categories, setCategories] = React.useState<CategoryItem[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const res = await api.get(CATEGORIES_ENDPOINT);

        const data = Array.isArray(res.data)
          ? res.data
          : res.data?.results ?? res.data?.data ?? [];

        if (!cancelled && Array.isArray(data)) {
          setCategories(data);
        }
      } catch {
        if (!cancelled) setCategories([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    categories,
    loading,
  };
}

/* ------------------------------------------------------------------ */
/* 6. CatalogImportForm                                               */
/* ------------------------------------------------------------------ */

interface CatalogImportFormValues {
  brand: string;
  category: string;
  subcategory: string;
  file: File | null;
}

interface CatalogImportFormProps {
  schema: typeof pdfImportSchema | typeof jsonImportSchema;
  endpoint: string;
  fileFieldName: string;
  accept: string;
  acceptLabel: string;
  brandOptions: string[] | null;
  categories: CategoryItem[];
  categoriesLoading: boolean;
  onSuccess: () => void;
}

function CatalogImportForm({
  schema,
  endpoint,
  fileFieldName,
  accept,
  acceptLabel,
  brandOptions,
  categories,
  categoriesLoading,
  onSuccess,
}: CatalogImportFormProps) {
  const router = useRouter();
  const [uploadProgress, setUploadProgress] = React.useState<number | null>(
    null
  );

  // Subcategories are now fetched lazily, scoped to whichever category is
  // currently selected, rather than being fetched in full up front and
  // filtered client-side.
  const [subcategories, setSubcategories] = React.useState<SubCategoryItem[]>([]);
  const [subcategoriesLoading, setSubcategoriesLoading] = React.useState(false);

  // Use react-hook-form with explicit type parameter
  const formMethods = useForm<CatalogImportFormValues>({
  resolver: zodResolver(schema as any),
    mode: "onChange",
    defaultValues: {
      brand: "",
      category: "",
      subcategory: "",
      file: null,
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors, isValid, isSubmitting },
  } = formMethods;

  // watch() returns readonly, so destructure with explicit types
  const selectedCategoryId = watch("category");
  const selectedSubcategoryId = watch("subcategory");
  const currentFile = watch("file");

  // Handle category change: clear the current subcategory selection and
  // fetch the subcategories that belong to the newly selected category.
  const handleCategoryChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;

    setValue("category", id, { shouldValidate: true });
    setValue("subcategory", "", { shouldValidate: true });
    trigger(["category", "subcategory"]);

    setSubcategories([]);

    if (!id) return;

    setSubcategoriesLoading(true);
    try {
      const res = await api.get(
        `${SUBCATEGORIES_ENDPOINT}?category=${id}`
      );
      const data = Array.isArray(res.data)
        ? res.data
        : res.data?.results ?? [];

      setSubcategories(Array.isArray(data) ? data : []);
    } catch {
      setSubcategories([]);
    } finally {
      setSubcategoriesLoading(false);
    }
  };

  // Handle subcategory change
  const handleSubcategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setValue("subcategory", id, { shouldValidate: true });
    trigger("subcategory");
  };

  const handleFileChange = async (file: File | null) => {
    setValue("file", file, { shouldValidate: true });
    await trigger("file");
  };

  const onSubmit: SubmitHandler<CatalogImportFormValues> = async (values) => {
    const { brand, category, subcategory, file } = values;
    if (!file) {
  toast.error("Please select a file.");
  return;
}

    const formData = new FormData();
    formData.append("brand", brand);
    formData.append("category", category); // ID
    formData.append("subcategory", subcategory); // ID
    formData.append(fileFieldName, file);

    setUploadProgress(0);

    try {
      await api.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (event: AxiosProgressEvent) => {
          if (!event.total) return;
          setUploadProgress(Math.round((event.loaded / event.total) * 100));
        },
      });

      toast.success("Catalog uploaded successfully");
      onSuccess();
      router.push("/catalog-review");
    } catch (error) {
      const fallback = "Something went wrong while uploading the catalog.";
      let message = fallback;
      if (axios.isAxiosError(error)) {
        message = extractApiErrorMessage(error.response?.data, fallback);
      }
      toast.error(message);
    } finally {
      setUploadProgress(null);
    }
  };

  const brandError = (errors as Record<string, { message?: string }>).brand?.message;
  const categoryError = (errors as Record<string, { message?: string }>).category?.message;
  const subcategoryError = (errors as Record<string, { message?: string }>).subcategory?.message;
  const fileError = (errors as Record<string, { message?: string }>).file?.message;

  const isUploading = isSubmitting || uploadProgress !== null;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      {/* Brand */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="brand">Brand</Label>
        {brandOptions ? (
          <NativeSelect
            id="brand"
            disabled={isUploading}
            {...register("brand")}
            defaultValue=""
          >
            <option value="" disabled>
              Select a brand…
            </option>
            {brandOptions.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </NativeSelect>
        ) : (
          <Input
            id="brand"
            placeholder="e.g. Trane"
            disabled={isUploading}
            {...register("brand")}
          />
        )}
        {brandError && (
          <p className="text-[12.5px] text-danger">{brandError}</p>
        )}
      </div>

      {/* Category Dropdown (ID as value) */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category">Category</Label>
        <NativeSelect
          id="category"
          disabled={isUploading || categoriesLoading}
          value={selectedCategoryId}
          onChange={handleCategoryChange}
        >
          <option value="" disabled>
            {categoriesLoading ? "Loading categories…" : "Select a category…"}
          </option>
          {categories.map((cat) => (
            <option key={String(cat.id)} value={String(cat.id)}>
              {cat.name}
            </option>
          ))}
        </NativeSelect>
        {categoryError && (
          <p className="text-[12.5px] text-danger">{categoryError}</p>
        )}
      </div>

      {/* Subcategory Dropdown (ID as value) */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="subcategory">Sub Category</Label>
        <NativeSelect
          id="subcategory"
          disabled={
            isUploading ||
            !selectedCategoryId ||
            subcategoriesLoading ||
            subcategories.length === 0
          }
          value={selectedSubcategoryId}
          onChange={handleSubcategoryChange}
        >
          <option value="" disabled>
            {!selectedCategoryId
              ? "Select a category first"
              : subcategoriesLoading
              ? "Loading sub categories…"
              : subcategories.length === 0
              ? "No subcategories available"
              : "Select a sub category…"}
          </option>
          {subcategories.map((sub) => (
            <option key={String(sub.id)} value={String(sub.id)}>
              {sub.name}
            </option>
          ))}
        </NativeSelect>
        {subcategoryError && (
          <p className="text-[12.5px] text-danger">{subcategoryError}</p>
        )}
      </div>

      {/* File Dropzone */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="file">Catalog File</Label>
        <FileDropzone
          id="file"
          accept={accept}
          acceptLabel={acceptLabel}
          file={currentFile ?? null}
          onFileChange={handleFileChange}
          error={fileError}
          disabled={isUploading}
        />
      </div>

      {/* Upload Progress */}
      {uploadProgress !== null && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[12.5px] text-ink-faint">
            <span>Uploading…</span>
            <span>{uploadProgress}%</span>
          </div>
          <ProgressBar value={uploadProgress} />
        </div>
      )}

      {/* Submit Button */}
      <DialogFooter>
        <Button
          type="submit"
          disabled={!isValid || isUploading}
          className="min-w-[9rem]"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading…
            </>
          ) : (
            "Upload"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* 7. UploadCatalogDialog (page-level entry point)                  */
/* ------------------------------------------------------------------ */

interface UploadCatalogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function UploadCatalogDialog({
  open,
  onOpenChange,
}: UploadCatalogDialogProps) {
  const [tab, setTab] = React.useState<"pdf" | "json">("pdf");

  const brandOptions = useCatalogBrands(BRANDS_ENDPOINT);
  const { categories, loading: categoriesLoading } = useCategoryHierarchy();

  const handleSuccess = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload catalog</DialogTitle>
          <DialogDescription>
            Import products from a manufacturer PDF or a structured JSON file.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as "pdf" | "json")}
        >
          <TabsList className="w-full">
            <TabsTrigger value="pdf">PDF Import</TabsTrigger>
            <TabsTrigger value="json">JSON Import</TabsTrigger>
          </TabsList>

          <TabsContent value="pdf">
            <CatalogImportForm
              key="pdf"
              schema={pdfImportSchema}
              endpoint="/catalog-import/upload/"
              fileFieldName={PDF_FILE_FIELD}
              accept=".pdf"
              acceptLabel="PDF"
              brandOptions={brandOptions}
              categories={categories}
              categoriesLoading={categoriesLoading}
              onSuccess={handleSuccess}
            />
          </TabsContent>

          <TabsContent value="json">
            <CatalogImportForm
              key="json"
              schema={jsonImportSchema}
              endpoint="/catalog-import/import-json/"
              fileFieldName={JSON_FILE_FIELD}
              accept=".json"
              acceptLabel="JSON"
              brandOptions={brandOptions}
              categories={categories}
              categoriesLoading={categoriesLoading}
              onSuccess={handleSuccess}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* 8. CatalogImportToolbar (page-level entry point)                  */
/* ------------------------------------------------------------------ */

export function CatalogImportToolbar() {
  const [search, setSearch] = React.useState("");
  const [isUploadOpen, setIsUploadOpen] = React.useState(false);

  return (
    <div className="mb-6 space-y-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Catalog Import
          </h1>
          <p className="mt-1 text-sm text-ink-faint">
            Manage, review, and ingest product catalogs into the platform.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload Catalog
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <Input
          type="search"
          placeholder="Search catalogs…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <UploadCatalogDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
      />
    </div>
  );
}