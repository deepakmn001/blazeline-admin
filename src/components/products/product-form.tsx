"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Circle,
  EyeOff,
  FileEdit,
  IndianRupee,
  Loader2,
  Package,
  Save,
  Sparkles,
  Tag,
  TrendingUp,
} from "lucide-react";

import { toast } from "sonner";

import { createProduct, updateProduct } from "@/services/product.service";
import {
  deleteProductImage,
  updateProductImage,
  uploadProductImage,
} from "@/services/product-image.service";

import type {
  Product,
  ProductImageItem,
  ProductOption,
  ProductVariant,
  ProductSpecification,
} from "@/types/catalog";
import { ProductImageUpload } from "./product-image-upload";
import { ProductBasicInfo } from "./product-basic-info";
import { ProductPreview } from "./product-preview";
import {
  ProductSpecifications,
  sanitizeSpecifications,
} from "./product-specifications";
import { ProductOptions } from "./product-options";
import { ProductVariants } from "./product-variants";
import {
  createEmptyVariant,
  hydrateVariant,
  reconcileVariantOptions,
  sanitizeVariants,
  toVariantPayload,
} from "./product-variants.utils";
import { diffImages, hydrateProductImages } from "./product-images.utils";

type ProductFormProps = {
  mode?: "create" | "edit";
  initialData?: Product;
};

export function ProductForm({ mode = "create", initialData }: ProductFormProps) {
  // ==========================================
  // BASIC INFO
  // ==========================================

  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState<number | "">("");
  const [subCategory, setSubCategory] = useState<number | "">("");
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [slug, setSlug] = useState("");

  // ==========================================
  // OPTIONS — single source of truth
  // ==========================================

  const [options, setOptions] = useState<ProductOption[]>([]);

  // ==========================================
  // VARIANTS
  // ==========================================

  const [variants, setVariants] = useState<ProductVariant[]>([createEmptyVariant([])]);

  // The Pricing / Inventory cards below are simply an editor for the
  // default (first) variant — no separate state, no override-at-publish
  // step. Editing either place updates the same underlying variant.
  const defaultVariant = variants[0];

  function updateDefaultVariant(patch: Partial<ProductVariant>) {
    setVariants((prev) =>
      prev.map((variant, index) => (index === 0 ? { ...variant, ...patch } : variant))
    );
  }

  // ==========================================
  // OTHER OPTIONS / FLAGS
  // ==========================================

  const [status, setStatus] = useState("published");
  const [featured, setFeatured] = useState(false);
  const [heavyDiscount, setHeavyDiscount] = useState(false);
  const [trending, setTrending] = useState(false);

  // ==========================================
  // IMAGES
  // ==========================================
  // One unified array holding both existing Cloudinary images and
  // pending local uploads. `originalImagesRef` is the load-time
  // snapshot used to diff against at publish time — it starts empty
  // in create mode and is populated once in edit mode.

  const [images, setImages] = useState<ProductImageItem[]>([]);
  const originalImagesRef = useRef<ProductImageItem[]>([]);

  // ==========================================
  // SPECIFICATIONS
  // ==========================================

  const [specifications, setSpecifications] = useState<ProductSpecification[]>([
    { key: "", value: "" },
  ]);

  // ==========================================
  // LOADING
  // ==========================================

  const [loading, setLoading] = useState(false);

  // ==========================================
  // SLUG
  // ==========================================

  useEffect(() => {
    setSlug(
      productName
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
    );
  }, [productName]);

  // ==========================================
  // EDIT MODE — load without conversion hacks
  // ==========================================

  useEffect(() => {
    if (mode !== "edit" || !initialData) {
      return;
    }

    setProductName(initialData.name);
    setCategory(initialData.category.id);
    setSubCategory(initialData.subcategory.id);

    setDescription(initialData.description);
    setShortDescription(initialData.short_description);
    setSlug(initialData.slug);

    setFeatured(initialData.featured);
    setStatus(initialData.status);

    setOptions(initialData.option_groups.length ? initialData.option_groups : []);

    setVariants(
      initialData.variants.length
        ? initialData.variants.map(hydrateVariant)
        : [createEmptyVariant(initialData.option_groups)]
    );

    setSpecifications(
      initialData.specifications.length
        ? initialData.specifications
        : [{ key: "", value: "" }]
    );

    // Images live on the default variant; fall back to the product-level
    // `images` field if the variant didn't carry any (defensive — some
    // serializer shapes surface them there instead).
    const sourceImages = initialData.variants[0]?.images?.length
      ? initialData.variants[0].images
      : initialData.images;

    const hydratedImages = hydrateProductImages(sourceImages);
    setImages(hydratedImages);
    originalImagesRef.current = hydratedImages;
  }, [mode, initialData]);

  useEffect(() => {
    if (mode !== "create") {
      return;
    }

    setVariants((prev) =>
      prev.map((variant) => reconcileVariantOptions(variant, options))
    );
  }, [options, mode]);

  // ==========================================
  // PUBLISH PRODUCT
  // ==========================================

  async function handlePublish() {
    if (!category) {
      toast.error("Please select a category.");
      return;
    }

    if (!subCategory) {
      toast.error("Please select a subcategory.");
      return;
    }

    if (!productName.trim()) {
      toast.error("Please enter the product name.");
      return;
    }

    setLoading(true);

    // No inference, no transformation — options and variants go through
    // exactly as edited by ProductOptions / ProductVariants.
    const preparedVariants = sanitizeVariants(variants).map(toVariantPayload);

    try {
      const payload = {
    category_id: category,
    subcategory_id: subCategory,

    name: productName,
    slug,

    description,
    short_description: shortDescription,

    featured,
    active: true,

        status,

        options,

        variants: preparedVariants,

        specifications: sanitizeSpecifications(specifications),
      };

      let product: Product;

      if (mode === "create") {
        product = await createProduct(payload);
      } else {
        product = await updateProduct(initialData!.slug, payload);
      }

      const defaultVariantResult = product.variants?.[0];

      if (defaultVariantResult) {
        // Minimal set of image calls, derived from the diff against the
        // load-time snapshot. Existing images that weren't touched are
        // never re-uploaded or deleted; only what actually changed.
        const diff = diffImages(originalImagesRef.current, images);

        await Promise.all(diff.toDelete.map((id) => deleteProductImage(id)));

        await Promise.all(
          diff.toUpdate.map((update) =>
            updateProductImage(update.id, {
              featured: update.featured,
              sort_order: update.sort_order,
            })
          )
        );

        // Uploaded sequentially so sort order lands predictably and we
        // can map each response back to the File that produced it.
        // Uploaded in parallel — much faster than one-by-one.
        const uploadResults = await Promise.all(
          diff.toUpload.map(async (upload) => {
            const uploaded = await uploadProductImage(
              defaultVariantResult.id!,
              upload.file,
              upload.featured,
              upload.sort_order
            );
            return { file: upload.file, image: uploaded };
          })
        );

        // Reconcile local state: dropped images are removed, newly
        // uploaded files become "existing" with their real backend id,
        // and the reconciled array becomes the new snapshot.
        setImages((prev) => {
          const withoutDeleted = prev.filter(
            (item) =>
              !(item.existing && item.id != null && diff.toDelete.includes(item.id))
          );

          const reconciled = withoutDeleted.map((item) => {
            if (!item.existing && item.file) {
              const match = uploadResults.find((result) => result.file === item.file);
              if (match) {
                return {
                  id: match.image.id,
                  url: match.image.image_url ?? match.image.image,
                  featured: item.featured,
                  sort_order: item.sort_order,
                  existing: true,
                } satisfies ProductImageItem;
              }
            }
            return item;
          });

          originalImagesRef.current = reconciled;
          return reconciled;
        });
      }

      toast.success(
        mode === "create"
          ? "Product created successfully."
          : "Product updated successfully."
      );
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // UI-ONLY DERIVED STATE
  // ==========================================

  const checklist = useMemo(
    () => [
      { label: "Product name", done: productName.trim().length > 0 },
      { label: "Category & sub category", done: Boolean(category) && Boolean(subCategory) },
      { label: "At least one image", done: images.length > 0 },
      { label: "Description", done: description.trim().length > 0 },
    ],
    [productName, category, subCategory, images.length, description]
  );

  const completedCount = checklist.filter((item) => item.done).length;

  const statusOptions = [
    {
      label: "Published",
      value: "published",
      description: "Visible to buyers immediately",
      icon: CheckCircle2,
    },
    {
      label: "Draft",
      value: "draft",
      description: "Saved privately, not visible yet",
      icon: FileEdit,
    },
    {
      label: "Hidden",
      value: "hidden",
      description: "Kept out of listings and search",
      icon: EyeOff,
    },
  ] as const;

  const productOptions = [
    {
      label: "Featured Product",
      description: "Highlight on the storefront homepage",
      checked: featured,
      onToggle: () => setFeatured(!featured),
      icon: Sparkles,
    },
    {
      label: "Heavy Discount",
      description: "Flag this listing as a deep-discount deal",
      checked: heavyDiscount,
      onToggle: () => setHeavyDiscount(!heavyDiscount),
      icon: Tag,
    },
    {
      label: "Trending",
      description: "Surface in the trending products rail",
      checked: trending,
      onToggle: () => setTrending(!trending),
      icon: TrendingUp,
    },
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_400px] xl:items-start xl:gap-8">
      {/* LEFT */}

      <div className="space-y-6">
        <ProductImageUpload images={images} onImagesChange={setImages} />

        <ProductBasicInfo
          productName={productName}
          category={category}
          subCategory={subCategory}
          description={description}
          slug={slug}
          onProductNameChange={setProductName}
          onCategoryChange={setCategory}
          onSubCategoryChange={setSubCategory}
          onDescriptionChange={setDescription}
        />

        {/* Pricing — editor for the default variant */}

        <section className="rounded-2xl border border-line/70 bg-white shadow-[0_1px_2px_rgba(17,17,17,0.04)] transition-shadow duration-200 hover:shadow-[0_4px_16px_rgba(17,17,17,0.06)]">
          <div className="flex items-start gap-3 border-b border-line/70 px-5 py-5 sm:px-8 sm:py-6">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/10">
              <IndianRupee
                className="h-[18px] w-[18px] text-brand-500"
                strokeWidth={2}
                aria-hidden="true"
              />
            </div>

            <div className="min-w-0">
              <h2 className="text-base font-semibold tracking-tight text-ink sm:text-lg">
                Pricing
              </h2>
              <p className="mt-0.5 text-sm text-ink-faint">
                Sets the MRP and selling price for the default variant.
              </p>
            </div>
          </div>

          <div className="grid gap-5 px-5 py-6 sm:px-8 sm:py-7 md:grid-cols-2">
            <div>
              <label htmlFor="product-mrp" className="mb-1.5 block text-sm font-medium text-ink">
                MRP
              </label>

              <div className="relative">
                <IndianRupee
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
                  aria-hidden="true"
                />
                <input
                  id="product-mrp"
                  value={defaultVariant?.mrp || ""}
                  onChange={(e) => updateDefaultVariant({ mrp: Number(e.target.value) })}
                  inputMode="decimal"
                  className="h-11 w-full rounded-xl border border-line/80 bg-white pl-9 pr-3.5 text-sm text-ink outline-none transition-all duration-150 hover:border-line focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  placeholder="0.00"
                />
              </div>

              <p className="mt-1.5 text-xs text-ink-faint">
                The listed price before any discount.
              </p>
            </div>

            <div>
              <label htmlFor="product-price" className="mb-1.5 block text-sm font-medium text-ink">
                Selling Price
              </label>

              <div className="relative">
                <IndianRupee
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
                  aria-hidden="true"
                />
                <input
                  id="product-price"
                  value={defaultVariant?.selling_price || ""}
                  onChange={(e) =>
                    updateDefaultVariant({ selling_price: Number(e.target.value) })
                  }
                  inputMode="decimal"
                  className="h-11 w-full rounded-xl border border-line/80 bg-white pl-9 pr-3.5 text-sm text-ink outline-none transition-all duration-150 hover:border-line focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  placeholder="0.00"
                />
              </div>

              <p className="mt-1.5 text-xs text-ink-faint">
                What buyers actually pay at checkout.
              </p>
            </div>
          </div>
        </section>

        {/* Inventory — editor for the default variant */}

        <section className="rounded-2xl border border-line/70 bg-white shadow-[0_1px_2px_rgba(17,17,17,0.04)] transition-shadow duration-200 hover:shadow-[0_4px_16px_rgba(17,17,17,0.06)]">
          <div className="flex items-start gap-3 border-b border-line/70 px-5 py-5 sm:px-8 sm:py-6">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/10">
              <Package className="h-[18px] w-[18px] text-brand-500" strokeWidth={2} aria-hidden="true" />
            </div>

            <div className="min-w-0">
              <h2 className="text-base font-semibold tracking-tight text-ink sm:text-lg">
                Inventory
              </h2>
              <p className="mt-0.5 text-sm text-ink-faint">
                Stock and SKU for the default variant.
              </p>
            </div>
          </div>

          <div className="grid gap-5 px-5 py-6 sm:px-8 sm:py-7 md:grid-cols-2">
            <div>
              <label htmlFor="product-stock" className="mb-1.5 block text-sm font-medium text-ink">
                Stock Quantity
              </label>

              <input
                id="product-stock"
                value={defaultVariant?.stock || ""}
                onChange={(e) => updateDefaultVariant({ stock: Number(e.target.value) })}
                inputMode="numeric"
                className="h-11 w-full rounded-xl border border-line/80 bg-white px-3.5 text-sm text-ink outline-none transition-all duration-150 hover:border-line focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                placeholder="0"
              />

              <p className="mt-1.5 text-xs text-ink-faint">
                Units currently available to sell.
              </p>
            </div>

            <div>
              <label htmlFor="product-sku" className="mb-1.5 block text-sm font-medium text-ink">
                SKU
              </label>

              <input
                id="product-sku"
                value={defaultVariant?.sku ?? ""}
                onChange={(e) => updateDefaultVariant({ sku: e.target.value })}
                className="h-11 w-full rounded-xl border border-line/80 bg-white px-3.5 font-mono text-sm text-ink outline-none transition-all duration-150 hover:border-line focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                placeholder="e.g. TILE-CER-001"
              />

              <p className="mt-1.5 text-xs text-ink-faint">
                Unique identifier used in your warehouse system.
              </p>
            </div>
          </div>
        </section>

        <ProductOptions options={options} setOptions={setOptions} />

        <ProductVariants options={options} variants={variants} setVariants={setVariants} />

        <ProductSpecifications
          specifications={specifications}
          setSpecifications={setSpecifications}
        />
      </div>

      {/* RIGHT */}

      <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
        {/* Publish */}

        <section className="overflow-hidden rounded-2xl border border-line/70 bg-white shadow-[0_1px_2px_rgba(17,17,17,0.04)]">
          <div className="border-b border-line/70 px-5 py-5 sm:px-6 sm:py-6">
            <h2 className="text-base font-semibold tracking-tight text-ink sm:text-lg">
              Publish
            </h2>
            <p className="mt-0.5 text-sm text-ink-faint">
              {mode === "create"
                ? "Review and publish this listing."
                : "Save your changes to this listing."}
            </p>
          </div>

          <div className="space-y-2.5 border-b border-line/70 px-5 py-5 sm:px-6">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                Ready to publish
              </span>
              <span className="text-xs font-medium tabular-nums text-ink-faint">
                {completedCount}/{checklist.length}
              </span>
            </div>

            <ul className="space-y-2">
              {checklist.map((item) => (
                <li key={item.label} className="flex items-center gap-2 text-sm">
                  {item.done ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-line" aria-hidden="true" />
                  )}
                  <span className={item.done ? "text-ink" : "text-ink-faint"}>{item.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3 px-5 py-5 sm:px-6 sm:py-6">
            <button
              onClick={handlePublish}
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-brand-600 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Publishing...
                </>
              ) : (
                <>
                  {mode === "create" ? "Publish Product" : "Save Changes"}
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </button>

            <button
              type="button"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line/80 text-sm font-medium text-ink transition-all duration-150 hover:border-line hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20"
            >
              <Save className="h-4 w-4 text-ink-faint" aria-hidden="true" />
              Save Draft
            </button>
          </div>
        </section>

        {/* Status */}

        <section className="rounded-2xl border border-line/70 bg-white p-5 shadow-[0_1px_2px_rgba(17,17,17,0.04)] sm:p-6">
          <h2 className="text-base font-semibold tracking-tight text-ink sm:text-lg">
            Product Status
          </h2>

          <div className="mt-4 space-y-2.5">
            {statusOptions.map((item) => {
              const Icon = item.icon;
              const isActive = status === item.value;

              return (
                <label
                  key={item.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all duration-150 ${
                    isActive
                      ? "border-brand-500 bg-brand-500/[0.04] ring-1 ring-brand-500/30"
                      : "border-line/80 hover:border-line hover:bg-neutral-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="product-status"
                    checked={isActive}
                    onChange={() => setStatus(item.value)}
                    className="sr-only"
                  />

                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      isActive ? "bg-brand-500 text-white" : "bg-neutral-100 text-ink-faint"
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink">{item.label}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-ink-faint">
                      {item.description}
                    </span>
                  </div>

                  <div
                    className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                      isActive ? "border-brand-500 bg-brand-500" : "border-line"
                    }`}
                    aria-hidden="true"
                  >
                    {isActive && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>
                </label>
              );
            })}
          </div>
        </section>

        {/* Product Options (flags) */}

        <section className="rounded-2xl border border-line/70 bg-white p-5 shadow-[0_1px_2px_rgba(17,17,17,0.04)] sm:p-6">
          <h2 className="text-base font-semibold tracking-tight text-ink sm:text-lg">
            Product Options
          </h2>

          <div className="mt-4 divide-y divide-line/70">
            {productOptions.map((option) => {
              const Icon = option.icon;

              return (
                <div
                  key={option.label}
                  className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-ink-faint">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>

                    <div className="min-w-0">
                      <span className="block text-sm font-medium text-ink">{option.label}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-ink-faint">
                        {option.description}
                      </span>
                    </div>
                  </div>

                  <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={option.checked}
                      onChange={option.onToggle}
                      className="peer sr-only"
                    />
                    <span
                      className="h-6 w-11 rounded-full bg-neutral-200 outline-none transition-colors duration-200 peer-checked:bg-brand-500 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500/30 peer-focus-visible:ring-offset-2"
                      aria-hidden="true"
                    />
                    <span
                      className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 peer-checked:translate-x-5"
                      aria-hidden="true"
                    />
                  </label>
                </div>
              );
            })}
          </div>
        </section>

        <ProductPreview
          images={images}
          productName={productName}
          category={category ? String(category) : ""}
          price={String(defaultVariant?.selling_price ?? "")}
          status={status}
          featured={featured}
          heavyDiscount={heavyDiscount}
        />
      </div>
    </div>
  );
}